package lsp

import (
	"context"
	"encoding/json"
	"errors"
	"net"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"go.lsp.dev/jsonrpc2"
	"go.lsp.dev/protocol"
)

// fakeServer is a minimal jsonrpc2.Handler that mimics enough of an LSP server
// for the Instance unit tests. It records every request and produces canned
// replies for the methods Instance actually calls.
type fakeServer struct {
	mu               sync.Mutex
	gotInitialize    bool
	gotInitialized   bool
	gotDidOpen       bool
	didChangeCount   int
	completionCalls  int
	hoverCalls       int
	gotShutdown      bool
	gotExit          bool
	completionDelay  time.Duration
	completionItems  []protocol.CompletionItem
	hoverContents    string
	completionErrors atomic.Int32
}

func (s *fakeServer) handler(ctx context.Context, reply jsonrpc2.Replier, req jsonrpc2.Request) error {
	switch req.Method() {
	case protocol.MethodInitialize:
		s.mu.Lock()
		s.gotInitialize = true
		s.mu.Unlock()
		return reply(ctx, &protocol.InitializeResult{}, nil)

	case protocol.MethodInitialized:
		s.mu.Lock()
		s.gotInitialized = true
		s.mu.Unlock()
		return reply(ctx, nil, nil)

	case protocol.MethodTextDocumentDidOpen:
		s.mu.Lock()
		s.gotDidOpen = true
		s.mu.Unlock()
		return reply(ctx, nil, nil)

	case protocol.MethodTextDocumentDidChange:
		s.mu.Lock()
		s.didChangeCount++
		s.mu.Unlock()
		return reply(ctx, nil, nil)

	case protocol.MethodTextDocumentCompletion:
		s.mu.Lock()
		s.completionCalls++
		items := s.completionItems
		delay := s.completionDelay
		s.mu.Unlock()
		if delay > 0 {
			select {
			case <-time.After(delay):
			case <-ctx.Done():
				return reply(ctx, nil, ctx.Err())
			}
		}
		if s.completionErrors.Load() > 0 {
			s.completionErrors.Add(-1)
			return reply(ctx, nil, errors.New("completion failed (test)"))
		}
		return reply(ctx, &protocol.CompletionList{Items: items}, nil)

	case protocol.MethodTextDocumentHover:
		s.mu.Lock()
		s.hoverCalls++
		contents := s.hoverContents
		s.mu.Unlock()
		if contents == "" {
			return reply(ctx, nil, nil)
		}
		return reply(ctx, &protocol.Hover{
			Contents: protocol.MarkupContent{Kind: protocol.Markdown, Value: contents},
		}, nil)

	case protocol.MethodShutdown:
		s.mu.Lock()
		s.gotShutdown = true
		s.mu.Unlock()
		return reply(ctx, nil, nil)

	case protocol.MethodExit:
		s.mu.Lock()
		s.gotExit = true
		s.mu.Unlock()
		return reply(ctx, nil, nil)

	default:
		// Unknown methods (e.g. workspace/configuration) — reply with null to
		// keep the conversation moving.
		var p json.RawMessage = json.RawMessage(`null`)
		return reply(ctx, p, nil)
	}
}

// newTestInstance wires an Instance directly to a fakeServer using net.Pipe,
// without spawning any child process. Returns the instance, the fake server,
// and a teardown func.
func newTestInstance(t *testing.T) (*Instance, *fakeServer, func()) {
	t.Helper()
	clientConn, serverConn := net.Pipe()

	srvCtx, srvCancel := context.WithCancel(context.Background())
	fake := &fakeServer{}

	// Start the server side. We use jsonrpc2 directly because protocol.NewServer
	// requires a full protocol.Server impl; jsonrpc2's handler is the lower
	// level the library is built on.
	serverStream := jsonrpc2.NewStream(serverConn)
	serverJSONRPC := jsonrpc2.NewConn(serverStream)
	serverJSONRPC.Go(srvCtx, fake.handler)

	cctx, cancel := context.WithCancel(context.Background())
	in, err := newInstance(cctx, cancel, "test-note", clientConn, nil)
	if err != nil {
		srvCancel()
		_ = serverJSONRPC.Close()
		_ = clientConn.Close()
		t.Fatalf("newInstance: %v", err)
	}

	if err := in.initialize(); err != nil {
		srvCancel()
		_ = in.Shutdown()
		t.Fatalf("initialize: %v", err)
	}

	teardown := func() {
		_ = in.Shutdown()
		srvCancel()
		_ = serverJSONRPC.Close()
		_ = serverConn.Close()
	}
	return in, fake, teardown
}

func TestInstanceInitializeHandshake(t *testing.T) {
	_, fake, teardown := newTestInstance(t)
	defer teardown()

	fake.mu.Lock()
	defer fake.mu.Unlock()
	if !fake.gotInitialize || !fake.gotInitialized {
		t.Fatalf("expected initialize+initialized; got init=%v inited=%v", fake.gotInitialize, fake.gotInitialized)
	}
}

func TestInstanceDidChangeOpensDocOnce(t *testing.T) {
	in, fake, teardown := newTestInstance(t)
	defer teardown()

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := in.DidChange(ctx, "block-1", 0, "x = 1"); err != nil {
		t.Fatalf("DidChange: %v", err)
	}
	if err := in.DidChange(ctx, "block-1", 0, "x = 2"); err != nil {
		t.Fatalf("DidChange 2: %v", err)
	}

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
	in, fake, teardown := newTestInstance(t)
	defer teardown()

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
	in, fake, teardown := newTestInstance(t)
	defer teardown()

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
	in, _, teardown := newTestInstance(t)
	defer teardown()

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	_, err := in.Completion(ctx, "never-added", protocol.Position{})
	if err == nil {
		t.Fatal("expected error for unknown block, got nil")
	}
}

func TestInstanceHoverReturnsMarkdown(t *testing.T) {
	in, fake, teardown := newTestInstance(t)
	defer teardown()

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
	in, _, teardown := newTestInstance(t)
	defer teardown()

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
	in, fake, teardown := newTestInstance(t)
	defer teardown()

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
	in, _, teardown := newTestInstance(t)
	defer teardown()

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
	in, _, _ := newTestInstance(t)

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
