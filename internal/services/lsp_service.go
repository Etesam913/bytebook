package services

import (
	"context"
	"errors"
	"time"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/lsp"
	"go.lsp.dev/protocol"
)

// COMPLETION_TIMEOUT caps how long a single Completion call can wait. Anything
// longer would make IntelliSense feel sluggish; the frontend treats a timeout
// as "no LSP completions" and shows the kernel results alone.
const COMPLETION_TIMEOUT = 250 * time.Millisecond

// HOVER_TIMEOUT is a bit looser since hover is user-initiated.
const HOVER_TIMEOUT = 500 * time.Millisecond

// DID_CHANGE_TIMEOUT caps fire-and-forget edit notifications.
const DID_CHANGE_TIMEOUT = 500 * time.Millisecond

// LSPService is the Wails RPC surface for IntelliSense. Like CodeService it is
// a thin adapter — all real state lives on lsp.LspManager.
type LSPService struct {
	ProjectPath string
	Manager     *lsp.LspManager
}

// IsAvailable reports whether the LSP server for the given language is
// installed and reachable. The frontend uses this to show / hide the
// install banner.
func (s *LSPService) IsAvailable(language string) config.BackendResponseWithData[bool] {
	available := s.Manager != nil && s.Manager.Available(language)
	return config.BackendResponseWithData[bool]{
		Success: true,
		Message: "ok",
		Data:    available,
	}
}

// Completion returns LSP completion items for (noteID, blockID) at the given
// block-local line/col. The source is pushed to pyright before the request,
// so callers don't need to call NotifyBlockEdit first.
func (s *LSPService) Completion(noteID, blockID string, blockOrder int, source string, line, col int) config.BackendResponseWithData[lsp.CompletionResult] {
	if s.Manager == nil || !s.Manager.Available("python") {
		return config.BackendResponseWithData[lsp.CompletionResult]{
			Success: true,
			Message: "ok",
			Data:    lsp.CompletionResult{Available: false},
		}
	}
	instance, err := s.Manager.GetOrCreate(noteID)
	if err != nil {
		if errors.Is(err, lsp.ErrNotAvailable) {
			return config.BackendResponseWithData[lsp.CompletionResult]{
				Success: true,
				Message: "ok",
				Data:    lsp.CompletionResult{Available: false},
			}
		}
		return errResp[lsp.CompletionResult](err.Error())
	}

	syncCtx, cancel := context.WithTimeout(context.Background(), DID_CHANGE_TIMEOUT)
	// Keep Pyright's synthetic document in sync before asking for completions.
	// This RPC also performs the sync done by NotifyBlockEdit, so callers do not
	// need a separate edit notification before every completion request.
	if err := instance.DidChange(syncCtx, blockID, blockOrder, source); err != nil {
		cancel()
		return errResp[lsp.CompletionResult](err.Error())
	}
	cancel()

	ctx, cancel := context.WithTimeout(context.Background(), COMPLETION_TIMEOUT)
	defer cancel()
	items, err := instance.Completion(ctx, blockID, protocol.Position{
		Line:      uint32(line),
		Character: uint32(col),
	})
	if err != nil {
		// Treat timeouts and a dead instance as "no results" rather than an
		// error — the frontend falls back to kernel completions silently.
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, lsp.ErrInstanceDown) {
			return config.BackendResponseWithData[lsp.CompletionResult]{
				Success: true,
				Message: "ok",
				Data:    lsp.CompletionResult{Available: true, Items: nil},
			}
		}
		return errResp[lsp.CompletionResult](err.Error())
	}
	return config.BackendResponseWithData[lsp.CompletionResult]{
		Success: true,
		Message: "ok",
		Data:    lsp.CompletionResult{Available: true, Items: items},
	}
}

// Hover returns LSP hover content for (noteID, blockID) at the given
// block-local position.
func (s *LSPService) Hover(noteID, blockID string, blockOrder int, source string, line, col int) config.BackendResponseWithData[lsp.HoverResult] {
	if s.Manager == nil || !s.Manager.Available("python") {
		return config.BackendResponseWithData[lsp.HoverResult]{
			Success: true,
			Message: "ok",
			Data:    lsp.HoverResult{Available: false},
		}
	}
	instance, err := s.Manager.GetOrCreate(noteID)
	if err != nil {
		if errors.Is(err, lsp.ErrNotAvailable) {
			return config.BackendResponseWithData[lsp.HoverResult]{
				Success: true,
				Message: "ok",
				Data:    lsp.HoverResult{Available: false},
			}
		}
		return errResp[lsp.HoverResult](err.Error())
	}

	syncCtx, cancel := context.WithTimeout(context.Background(), DID_CHANGE_TIMEOUT)
	// Hover asks Pyright about the current source, so first push the latest
	// block text into the synthetic note document.
	if err := instance.DidChange(syncCtx, blockID, blockOrder, source); err != nil {
		cancel()
		return errResp[lsp.HoverResult](err.Error())
	}
	cancel()

	ctx, cancel := context.WithTimeout(context.Background(), HOVER_TIMEOUT)
	defer cancel()
	contents, found, err := instance.Hover(ctx, blockID, protocol.Position{
		Line:      uint32(line),
		Character: uint32(col),
	})
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, lsp.ErrInstanceDown) {
			return config.BackendResponseWithData[lsp.HoverResult]{
				Success: true,
				Message: "ok",
				Data:    lsp.HoverResult{Available: true, Found: false},
			}
		}
		return errResp[lsp.HoverResult](err.Error())
	}
	return config.BackendResponseWithData[lsp.HoverResult]{
		Success: true,
		Message: "ok",
		Data:    lsp.HoverResult{Available: true, Found: found, Contents: contents},
	}
}

// NotifyBlockEdit is a fire-and-forget hint to keep pyright's synthetic doc
// fresh while the user types. The Completion call also pushes the latest
// source, so dropping this notification is harmless.
func (s *LSPService) NotifyBlockEdit(noteID, blockID string, blockOrder int, newSource string) config.BackendResponseWithoutData {
	if s.Manager == nil || !s.Manager.Available("python") {
		return config.BackendResponseWithoutData{Success: true, Message: "lsp unavailable"}
	}
	instance, err := s.Manager.GetOrCreate(noteID)
	if err != nil {
		if errors.Is(err, lsp.ErrNotAvailable) {
			return config.BackendResponseWithoutData{Success: true, Message: "lsp unavailable"}
		}
		return config.BackendResponseWithoutData{Success: false, Message: err.Error()}
	}
	ctx, cancel := context.WithTimeout(context.Background(), DID_CHANGE_TIMEOUT)
	defer cancel()
	if err := instance.DidChange(ctx, blockID, blockOrder, newSource); err != nil {
		return config.BackendResponseWithoutData{Success: false, Message: err.Error()}
	}
	return config.BackendResponseWithoutData{Success: true, Message: "ok"}
}

// NotifyBlockRemoved drops a block from the synthetic doc. Called when a
// code block is unmounted from the editor.
func (s *LSPService) NotifyBlockRemoved(noteID, blockID string) config.BackendResponseWithoutData {
	if s.Manager == nil {
		return config.BackendResponseWithoutData{Success: true, Message: "ok"}
	}
	instance, err := s.Manager.GetOrCreate(noteID)
	if err != nil {
		// If we can't get an instance, there's nothing to remove from anyway.
		return config.BackendResponseWithoutData{Success: true, Message: "ok"}
	}
	ctx, cancel := context.WithTimeout(context.Background(), DID_CHANGE_TIMEOUT)
	defer cancel()
	if err := instance.RemoveBlock(ctx, blockID); err != nil {
		return config.BackendResponseWithoutData{Success: false, Message: err.Error()}
	}
	return config.BackendResponseWithoutData{Success: true, Message: "ok"}
}

// NotifyNoteClosed terminates the LSP instance for a note. Called when the
// editor unmounts the last code block in a note.
func (s *LSPService) NotifyNoteClosed(noteID string) config.BackendResponseWithoutData {
	if s.Manager == nil {
		return config.BackendResponseWithoutData{Success: true, Message: "ok"}
	}
	if err := s.Manager.ShutdownNote(noteID); err != nil {
		return config.BackendResponseWithoutData{Success: false, Message: err.Error()}
	}
	return config.BackendResponseWithoutData{Success: true, Message: "ok"}
}
