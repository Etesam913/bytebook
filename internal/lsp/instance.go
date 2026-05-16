package lsp

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	"go.lsp.dev/jsonrpc2"
	"go.lsp.dev/protocol"
	"go.lsp.dev/uri"
	"go.uber.org/zap"
)

// ErrInstanceDown is returned by Instance methods after the LSP connection has
// terminated. Callers should treat this as a transient failure — the manager
// will spawn a fresh instance on the next request.
var ErrInstanceDown = errors.New("lsp instance is down")

// instanceTransport is the minimal io.ReadWriteCloser the jsonrpc2 stream
// needs. Decoupling lets tests inject a net.Pipe in place of a real process.
type instanceTransport interface {
	io.ReadWriteCloser
}

// Instance owns one pyright child process for one note. All callers can issue
// concurrent Completion/Hover/DidChange calls; the underlying jsonrpc2.Conn
// serializes writes and demuxes responses by id.
type Instance struct {
	noteID string
	docURI uri.URI
	doc    *VirtualDoc

	// cmd is the pyright child process. Nil when the instance was constructed
	// for a test with a synthetic transport.
	cmd       *exec.Cmd
	transport instanceTransport

	conn jsonrpc2.Conn
	srv  protocol.Server
	log  *slog.Logger

	mu     sync.Mutex
	opened bool

	ctx       context.Context
	cancelCtx context.CancelFunc

	closeOnce sync.Once
	done      chan struct{}
}

// spawnInstance launches pyright as a child process and returns a ready
// Instance with `initialize` + `initialized` already negotiated.
func spawnInstance(parent context.Context, noteID, binPath string, log *slog.Logger) (*Instance, error) {
	cctx, cancel := context.WithCancel(parent)
	cmd := exec.CommandContext(cctx, binPath, "--stdio")

	stdin, err := cmd.StdinPipe()
	if err != nil {
		cancel()
		return nil, fmt.Errorf("stdin pipe: %w", err)
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		cancel()
		return nil, fmt.Errorf("stdout pipe: %w", err)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		cancel()
		return nil, fmt.Errorf("stderr pipe: %w", err)
	}
	if err := cmd.Start(); err != nil {
		cancel()
		return nil, fmt.Errorf("start pyright: %w", err)
	}

	// Pyright exposes separate stdin/stdout pipes, while jsonrpc2.NewStream
	// wants one ReadWriteCloser. procRWC is the small adapter between those APIs.
	transport := &procRWC{in: stdin, out: stdout}
	lspInstance, err := newInstance(cctx, cancel, noteID, transport, log)
	if err != nil {
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
		return nil, err
	}
	lspInstance.cmd = cmd

	go drainStderr(stderr, log)
	go lspInstance.waitProcess()

	if err := lspInstance.initialize(); err != nil {
		_ = lspInstance.Shutdown()
		return nil, fmt.Errorf("initialize: %w", err)
	}
	return lspInstance, nil
}

// newInstance wires up the jsonrpc2 connection on top of `transport`. It does
// NOT send initialize — callers do that themselves (so tests can stub the
// handshake).
func newInstance(ctx context.Context, cancel context.CancelFunc, noteID string, transport instanceTransport, log *slog.Logger) (*Instance, error) {
	if log == nil {
		log = slog.Default()
	}
	lspInstance := &Instance{
		noteID:    noteID,
		docURI:    syntheticDocURI(noteID),
		doc:       NewVirtualDoc(),
		transport: transport,
		log:       log,
		ctx:       ctx,
		cancelCtx: cancel,
		done:      make(chan struct{}),
	}
	stream := jsonrpc2.NewStream(transport)
	_, conn, srv := protocol.NewClient(ctx, &noopClient{log: log}, stream, zap.NewNop())
	lspInstance.conn = conn
	lspInstance.srv = srv

	go lspInstance.watchConn()
	return lspInstance, nil
}

// syntheticDocURI returns the URI that pyright sees for this note. We anchor
// it under the system temp dir so the path is well-formed and unlikely to
// collide with any real file the user might also open.
func syntheticDocURI(noteID string) uri.URI {
	return uri.File(filepath.Join(os.TempDir(), "bytebook-note-"+noteID+".py"))
}

// initialize sends the LSP `initialize` request and the `initialized`
// notification. Called once at startup.
func (lspInstance *Instance) initialize() error {
	ctx, cancel := context.WithTimeout(lspInstance.ctx, 5*time.Second)
	defer cancel()

	_, err := lspInstance.srv.Initialize(ctx, &protocol.InitializeParams{
		ProcessID: int32(os.Getpid()),
		RootURI:   uri.File(os.TempDir()),
		Capabilities: protocol.ClientCapabilities{
			TextDocument: &protocol.TextDocumentClientCapabilities{
				Completion: &protocol.CompletionTextDocumentClientCapabilities{
					CompletionItem: &protocol.CompletionTextDocumentClientCapabilitiesItem{
						SnippetSupport: false,
					},
				},
				Hover: &protocol.HoverTextDocumentClientCapabilities{
					ContentFormat: []protocol.MarkupKind{protocol.Markdown, protocol.PlainText},
				},
			},
		},
	})
	if err != nil {
		return err
	}
	return lspInstance.srv.Initialized(ctx, &protocol.InitializedParams{})
}

// Done returns a channel closed when the underlying connection terminates.
// The manager uses this to reap dead instances.
func (lspInstance *Instance) Done() <-chan struct{} { return lspInstance.done }

// NoteID returns the note this instance serves.
func (lspInstance *Instance) NoteID() string { return lspInstance.noteID }

// didOpenIfNeeded sends `textDocument/didOpen` exactly once per instance.
// Pyright rejects completion/hover requests for unknown documents.
func (lspInstance *Instance) didOpenIfNeeded(ctx context.Context) error {
	lspInstance.mu.Lock()
	if lspInstance.opened {
		lspInstance.mu.Unlock()
		return nil
	}
	lspInstance.opened = true
	lspInstance.mu.Unlock()

	return lspInstance.srv.DidOpen(ctx, &protocol.DidOpenTextDocumentParams{
		TextDocument: protocol.TextDocumentItem{
			URI:        lspInstance.docURI,
			LanguageID: protocol.PythonLanguage,
			Version:    int32(lspInstance.doc.Version()),
			Text:       lspInstance.doc.FullText(),
		},
	})
}

// DidChange upserts a block into the synthetic doc and notifies pyright. v1
// uses full-document sync — the entire concatenated text is sent on every
// change. This trades a few extra bytes for simpler coordinate logic.
func (lspInstance *Instance) DidChange(ctx context.Context, blockID string, order int, source string) error {
	if err := lspInstance.checkAlive(); err != nil {
		return err
	}
	if err := lspInstance.didOpenIfNeeded(ctx); err != nil {
		return err
	}
	lspInstance.doc.UpsertBlock(blockID, order, source)
	return lspInstance.srv.DidChange(ctx, &protocol.DidChangeTextDocumentParams{
		TextDocument: protocol.VersionedTextDocumentIdentifier{
			TextDocumentIdentifier: protocol.TextDocumentIdentifier{URI: lspInstance.docURI},
			Version:                lspInstance.doc.Version(),
		},
		ContentChanges: []protocol.TextDocumentContentChangeEvent{{Text: lspInstance.doc.FullText()}},
	})
}

// RemoveBlock drops a block from the synthetic doc and pushes the change to
// pyright.
func (lspInstance *Instance) RemoveBlock(ctx context.Context, blockID string) error {
	if err := lspInstance.checkAlive(); err != nil {
		return err
	}
	if err := lspInstance.didOpenIfNeeded(ctx); err != nil {
		return err
	}
	lspInstance.doc.RemoveBlock(blockID)
	return lspInstance.srv.DidChange(ctx, &protocol.DidChangeTextDocumentParams{
		TextDocument: protocol.VersionedTextDocumentIdentifier{
			TextDocumentIdentifier: protocol.TextDocumentIdentifier{URI: lspInstance.docURI},
			Version:                lspInstance.doc.Version(),
		},
		ContentChanges: []protocol.TextDocumentContentChangeEvent{{Text: lspInstance.doc.FullText()}},
	})
}

// Completion asks pyright for completion items at (blockID, pos). pos is in
// block-local coordinates. Returns an empty slice on timeout or when pyright
// has nothing to offer; returns ErrInstanceDown if the connection is gone.
func (lspInstance *Instance) Completion(ctx context.Context, blockID string, pos protocol.Position) ([]CompletionItem, error) {
	if err := lspInstance.checkAlive(); err != nil {
		return nil, err
	}
	if err := lspInstance.didOpenIfNeeded(ctx); err != nil {
		return nil, err
	}
	docPos, ok := lspInstance.doc.TranslateBlockToDoc(blockID, pos)
	if !ok {
		return nil, fmt.Errorf("block %s not in virtual doc", blockID)
	}
	list, err := lspInstance.srv.Completion(ctx, &protocol.CompletionParams{
		TextDocumentPositionParams: protocol.TextDocumentPositionParams{
			TextDocument: protocol.TextDocumentIdentifier{URI: lspInstance.docURI},
			Position:     docPos,
		},
	})
	if err != nil {
		return nil, err
	}
	if list == nil {
		return nil, nil
	}
	return convertItems(list.Items), nil
}

// Hover asks pyright for hover content at (blockID, pos). Returns
// (contents, true, nil) when pyright found something; (_,_,nil) with found
// false otherwise.
func (lspInstance *Instance) Hover(ctx context.Context, blockID string, pos protocol.Position) (string, bool, error) {
	if err := lspInstance.checkAlive(); err != nil {
		return "", false, err
	}
	if err := lspInstance.didOpenIfNeeded(ctx); err != nil {
		return "", false, err
	}
	docPos, ok := lspInstance.doc.TranslateBlockToDoc(blockID, pos)
	if !ok {
		return "", false, fmt.Errorf("block %s not in virtual doc", blockID)
	}
	h, err := lspInstance.srv.Hover(ctx, &protocol.HoverParams{
		TextDocumentPositionParams: protocol.TextDocumentPositionParams{
			TextDocument: protocol.TextDocumentIdentifier{URI: lspInstance.docURI},
			Position:     docPos,
		},
	})
	if err != nil {
		return "", false, err
	}
	if h == nil {
		return "", false, nil
	}
	return h.Contents.Value, true, nil
}

// Shutdown sends the LSP shutdown/exit handshake, then closes the connection
// and kills the child process if it hasn't exited within a grace period.
// Safe to call multiple times.
func (lspInstance *Instance) Shutdown() error {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// Best-effort polite shutdown. Errors are expected if the conn is already
	// dead — proceed to the forced cleanup either way.
	_ = lspInstance.srv.Shutdown(ctx)
	_ = lspInstance.srv.Exit(ctx)
	_ = lspInstance.conn.Close()

	if lspInstance.cmd != nil && lspInstance.cmd.Process != nil {
		exited := make(chan struct{})
		go func() {
			_ = lspInstance.cmd.Wait()
			close(exited)
		}()
		select {
		case <-exited:
		case <-time.After(2 * time.Second):
			_ = lspInstance.cmd.Process.Kill()
			<-exited
		}
	}

	lspInstance.cancelCtx()
	lspInstance.markDone()
	return nil
}

// checkAlive reports ErrInstanceDown when the underlying connection has
// terminated. This is a fast path so callers don't make a blocking RPC just
// to discover the process is gone.
func (lspInstance *Instance) checkAlive() error {
	select {
	case <-lspInstance.done:
		return ErrInstanceDown
	default:
		return nil
	}
}

// watchConn blocks until the jsonrpc2 connection ends, then signals done.
// The reason can be either a clean Shutdown or a child-process crash.
func (lspInstance *Instance) watchConn() {
	<-lspInstance.conn.Done()
	lspInstance.markDone()
	if err := lspInstance.conn.Err(); err != nil && lspInstance.log != nil {
		lspInstance.log.Debug("lsp connection ended", slog.String("noteID", lspInstance.noteID), slog.Any("error", err))
	}
}

// waitProcess waits for the child process to exit and signals done. Only the
// production constructor starts this goroutine.
func (lspInstance *Instance) waitProcess() {
	if lspInstance.cmd == nil {
		return
	}
	_ = lspInstance.cmd.Wait()
	lspInstance.markDone()
}

// markDone closes the done channel (idempotent) and cancels the instance
// context so any in-flight RPCs unblock with context.Canceled.
func (lspInstance *Instance) markDone() {
	lspInstance.closeOnce.Do(func() {
		close(lspInstance.done)
		lspInstance.cancelCtx()
	})
}

// convertItems copies protocol.CompletionItem slices into our slim wire type.
func convertItems(items []protocol.CompletionItem) []CompletionItem {
	out := make([]CompletionItem, 0, len(items))
	for i := range items {
		it := &items[i]
		out = append(out, CompletionItem{
			Label:         it.Label,
			Detail:        it.Detail,
			Documentation: docToString(it.Documentation),
			InsertText:    it.InsertText,
			SortText:      it.SortText,
			Kind:          int(it.Kind),
			Source:        "lsp",
		})
	}
	return out
}

func docToString(d interface{}) string {
	switch v := d.(type) {
	case nil:
		return ""
	case string:
		return v
	case protocol.MarkupContent:
		return v.Value
	case map[string]interface{}:
		if s, ok := v["value"].(string); ok {
			return s
		}
	}
	return ""
}

// procRWC adapts a process's separate stdin/stdout pipes into one
// io.ReadWriteCloser for jsonrpc2.NewStream.
type procRWC struct {
	in  io.WriteCloser
	out io.ReadCloser
}

func (p *procRWC) Read(b []byte) (int, error)  { return p.out.Read(b) }
func (p *procRWC) Write(b []byte) (int, error) { return p.in.Write(b) }
func (p *procRWC) Close() error {
	err1 := p.in.Close()
	err2 := p.out.Close()
	if err1 != nil {
		return err1
	}
	return err2
}

// drainStderr reads pyright's stderr into the logger at debug level. Without
// this the OS pipe buffer fills and pyright blocks on its next write.
func drainStderr(stderr io.Reader, log *slog.Logger) {
	scanner := bufio.NewScanner(stderr)
	for scanner.Scan() {
		if log != nil {
			log.Debug("pyright stderr", slog.String("line", scanner.Text()))
		}
	}
}
