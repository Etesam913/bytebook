// Package lsp implements an LSP client supervisor used to add IntelliSense
// (completion + hover) to code blocks. v1 is python-only via pyright;
// the design accommodates additional languages in future PRs.
package lsp

// CompletionItem is the slim wire-format completion item sent to the frontend.
// protocol.CompletionItem carries far more fields than the frontend needs;
// we copy only what CodeMirror consumes.
type CompletionItem struct {
	Label         string `json:"label"`
	Detail        string `json:"detail,omitempty"`
	Documentation string `json:"documentation,omitempty"`
	InsertText    string `json:"insertText,omitempty"`
	SortText      string `json:"sortText,omitempty"`
	// Kind mirrors protocol.CompletionItemKind (1=Text, 2=Method, 3=Function, …).
	Kind int `json:"kind,omitempty"`
	// Source identifies which engine produced the item — always "lsp" for items
	// originating from this package. The frontend uses it to dedup vs the
	// kernel's complete_request matches.
	Source string `json:"source"`
}

// CompletionResult is the response sent to the frontend. Available=false means
// pyright is not installed or otherwise unreachable; the frontend should
// surface the install banner and fall back to kernel-only completions.
type CompletionResult struct {
	Available bool             `json:"available"`
	Items     []CompletionItem `json:"items"`
}

// HoverResult carries an LSP hover payload back to the frontend. Contents are
// pre-rendered markdown.
type HoverResult struct {
	Available bool   `json:"available"`
	Found     bool   `json:"found"`
	Contents  string `json:"contents"`
}
