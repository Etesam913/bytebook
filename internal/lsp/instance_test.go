package lsp

import (
	"context"
	"errors"
	"net"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.lsp.dev/protocol"
)

func TestInstanceInitializeHandshake(t *testing.T) {
	_, fake := newTestInstance(t)

	fake.mu.Lock()
	defer fake.mu.Unlock()
	if !fake.gotInitialize || !fake.gotInitialized {
		t.Fatalf("expected initialize+initialized; got init=%v inited=%v", fake.gotInitialize, fake.gotInitialized)
	}
}

func TestInstanceDidChangeOpensDocOnce(t *testing.T) {
	in, fake := newTestInstance(t)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := in.DidChange(ctx, "block-1", 0, "x = 1"); err != nil {
		t.Fatalf("DidChange: %v", err)
	}
	if err := in.DidChange(ctx, "block-1", 0, "x = 2"); err != nil {
		t.Fatalf("DidChange 2: %v", err)
	}

	// Notifications are processed asynchronously by the fake server.
	require.Eventually(t, func() bool {
		fake.mu.Lock()
		defer fake.mu.Unlock()
		return fake.didChangeCount == 2
	}, time.Second, time.Millisecond)

	fake.mu.Lock()
	defer fake.mu.Unlock()
	if !fake.gotDidOpen {
		t.Fatal("expected didOpen on first change")
	}
	if fake.didChangeCount != 2 {
		t.Fatalf("didChangeCount = %d, want 2", fake.didChangeCount)
	}
}

func TestInstanceCompletionReturnsItems(t *testing.T) {
	in, fake := newTestInstance(t)

	fake.mu.Lock()
	fake.completionItems = []protocol.CompletionItem{
		{Label: "print", Detail: "builtin", Kind: protocol.CompletionItemKindFunction},
		{Label: "property", Kind: protocol.CompletionItemKindKeyword},
	}
	fake.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := in.DidChange(ctx, "block-1", 0, "pr"); err != nil {
		t.Fatalf("DidChange: %v", err)
	}
	items, err := in.Completion(ctx, "block-1", protocol.Position{Line: 0, Character: 2})
	if err != nil {
		t.Fatalf("Completion: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("got %d items, want 2", len(items))
	}
	if items[0].Label != "print" || items[0].Source != "lsp" {
		t.Fatalf("first item = %+v, want label=print source=lsp", items[0])
	}
	if items[0].Kind != int(protocol.CompletionItemKindFunction) {
		t.Fatalf("first item kind = %d, want %d", items[0].Kind, int(protocol.CompletionItemKindFunction))
	}
}

func TestInstanceCompletionTimeoutReturnsContextErr(t *testing.T) {
	in, fake := newTestInstance(t)

	fake.mu.Lock()
	fake.completionDelay = 200 * time.Millisecond
	fake.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()
	if err := in.DidChange(ctx, "block-1", 0, "x"); err != nil {
		t.Fatalf("DidChange: %v", err)
	}

	tightCtx, tightCancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer tightCancel()
	_, err := in.Completion(tightCtx, "block-1", protocol.Position{Line: 0, Character: 1})
	if err == nil {
		t.Fatal("expected timeout error, got nil")
	}
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("err = %v, want context.DeadlineExceeded", err)
	}
}

func TestInstanceCompletionUnknownBlock(t *testing.T) {
	in, _ := newTestInstance(t)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	_, err := in.Completion(ctx, "never-added", protocol.Position{})
	if err == nil {
		t.Fatal("expected error for unknown block, got nil")
	}
}

func TestInstanceHoverReturnsMarkdown(t *testing.T) {
	in, fake := newTestInstance(t)

	fake.mu.Lock()
	fake.hoverContents = "**print** — write to stdout"
	fake.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := in.DidChange(ctx, "b", 0, "print"); err != nil {
		t.Fatalf("DidChange: %v", err)
	}
	contents, found, err := in.Hover(ctx, "b", protocol.Position{Line: 0, Character: 0})
	if err != nil {
		t.Fatalf("Hover: %v", err)
	}
	if !found || contents != "**print** — write to stdout" {
		t.Fatalf("hover: found=%v contents=%q", found, contents)
	}
}

func TestInstanceHoverEmptyResultNotFound(t *testing.T) {
	in, _ := newTestInstance(t)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := in.DidChange(ctx, "b", 0, "x"); err != nil {
		t.Fatalf("DidChange: %v", err)
	}
	contents, found, err := in.Hover(ctx, "b", protocol.Position{})
	if err != nil {
		t.Fatalf("Hover: %v", err)
	}
	if found || contents != "" {
		t.Fatalf("expected empty hover, got found=%v contents=%q", found, contents)
	}
}

func TestInstanceConcurrentCompletionRequests(t *testing.T) {
	// jsonrpc2 must serialize stdin writes and demux replies by id correctly
	// even when many goroutines call Completion in parallel. We're verifying
	// that our wrapper doesn't introduce a regression here.
	in, fake := newTestInstance(t)

	fake.mu.Lock()
	fake.completionItems = []protocol.CompletionItem{{Label: "x"}}
	fake.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := in.DidChange(ctx, "b", 0, "x"); err != nil {
		t.Fatalf("DidChange: %v", err)
	}

	const N = 16
	var wg sync.WaitGroup
	errs := make(chan error, N)
	for i := 0; i < N; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			items, err := in.Completion(ctx, "b", protocol.Position{Line: 0, Character: 1})
			if err != nil {
				errs <- err
				return
			}
			if len(items) != 1 || items[0].Label != "x" {
				errs <- errors.New("unexpected items")
			}
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		t.Errorf("concurrent completion error: %v", err)
	}

	fake.mu.Lock()
	if fake.completionCalls != N {
		t.Errorf("completionCalls = %d, want %d", fake.completionCalls, N)
	}
	fake.mu.Unlock()
}

func TestInstanceCheckAliveAfterShutdown(t *testing.T) {
	in, _ := newTestInstance(t)

	if err := in.Shutdown(); err != nil {
		t.Fatalf("Shutdown: %v", err)
	}
	// Done channel must have closed.
	select {
	case <-in.Done():
	case <-time.After(time.Second):
		t.Fatal("Done() never fired after Shutdown")
	}

	// Subsequent calls fail fast with ErrInstanceDown rather than blocking.
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	_, err := in.Completion(ctx, "b", protocol.Position{})
	if !errors.Is(err, ErrInstanceDown) {
		t.Fatalf("Completion after Shutdown: err = %v, want ErrInstanceDown", err)
	}
}

func TestInstanceServerSideCloseFiresDone(t *testing.T) {
	in, _ := newTestInstance(t)

	// Close from the server side (simulating pyright crashing).
	if c, ok := in.transport.(net.Conn); ok {
		_ = c.Close()
	}
	select {
	case <-in.Done():
	case <-time.After(time.Second):
		t.Fatal("Done() should fire when transport closes")
	}
}
