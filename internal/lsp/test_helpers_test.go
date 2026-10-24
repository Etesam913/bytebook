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

	"github.com/stretchr/testify/require"
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
	initialized      chan struct{}
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
		close(s.initialized)
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
// without spawning any child process. Cleanup is owned by the test.
func newTestInstance(t *testing.T) (*Instance, *fakeServer) {
	t.Helper()
	clientConn, serverConn := net.Pipe()

	srvCtx, srvCancel := context.WithCancel(context.Background())
	fake := &fakeServer{initialized: make(chan struct{})}

	// Start the server side. We use jsonrpc2 directly because protocol.NewServer
	// requires a full protocol.Server impl; jsonrpc2's handler is the lower
	// level the library is built on.
	serverStream := jsonrpc2.NewStream(serverConn)
	serverJSONRPC := jsonrpc2.NewConn(serverStream)
	t.Cleanup(func() {
		srvCancel()
		_ = serverJSONRPC.Close()
		_ = serverConn.Close()
		_ = clientConn.Close()
	})
	serverJSONRPC.Go(srvCtx, fake.handler)

	cctx, cancel := context.WithCancel(context.Background())
	in, err := newInstance(cctx, cancel, "test-note", clientConn)
	require.NoError(t, err)
	t.Cleanup(func() { _ = in.Shutdown() })
	require.NoError(t, in.initialize())

	select {
	case <-fake.initialized:
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for initialized notification")
	}

	return in, fake
}

func newTestManager(t *testing.T, binaryPath string) *LspManager {
	t.Helper()
	m := New()
	t.Cleanup(m.ShutdownAll)
	m.mu.Lock()
	m.binaryPath = binaryPath
	m.lastLookup = time.Now()
	m.lastLookupErr = nil
	m.mu.Unlock()
	return m
}
