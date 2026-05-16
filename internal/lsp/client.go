package lsp

import (
	"context"
	"log/slog"

	"go.lsp.dev/protocol"
)

// noopClient implements protocol.Client. It satisfies the interface so the
// jsonrpc2 connection can route server-initiated callbacks somewhere, but
// drops everything on the floor. v1.1 may grow this to handle
// PublishDiagnostics for inline error squiggles.
type noopClient struct {
	log *slog.Logger
}

func (c *noopClient) Progress(ctx context.Context, p *protocol.ProgressParams) error { return nil }
func (c *noopClient) WorkDoneProgressCreate(ctx context.Context, p *protocol.WorkDoneProgressCreateParams) error {
	return nil
}
func (c *noopClient) LogMessage(ctx context.Context, p *protocol.LogMessageParams) error {
	if c.log != nil {
		c.log.Debug("lsp server log", slog.Int("type", int(p.Type)), slog.String("message", p.Message))
	}
	return nil
}
func (c *noopClient) PublishDiagnostics(ctx context.Context, p *protocol.PublishDiagnosticsParams) error {
	return nil
}
func (c *noopClient) ShowMessage(ctx context.Context, p *protocol.ShowMessageParams) error {
	return nil
}
func (c *noopClient) ShowMessageRequest(ctx context.Context, p *protocol.ShowMessageRequestParams) (*protocol.MessageActionItem, error) {
	return nil, nil
}
func (c *noopClient) Telemetry(ctx context.Context, p interface{}) error { return nil }
func (c *noopClient) RegisterCapability(ctx context.Context, p *protocol.RegistrationParams) error {
	return nil
}
func (c *noopClient) UnregisterCapability(ctx context.Context, p *protocol.UnregistrationParams) error {
	return nil
}
func (c *noopClient) ApplyEdit(ctx context.Context, p *protocol.ApplyWorkspaceEditParams) (bool, error) {
	return false, nil
}
func (c *noopClient) Configuration(ctx context.Context, p *protocol.ConfigurationParams) ([]interface{}, error) {
	// pyright queries python.* config at startup; returning a slice of nils tells
	// it to fall back to its built-in defaults for each requested section.
	out := make([]interface{}, len(p.Items))
	return out, nil
}
func (c *noopClient) WorkspaceFolders(ctx context.Context) ([]protocol.WorkspaceFolder, error) {
	return nil, nil
}
