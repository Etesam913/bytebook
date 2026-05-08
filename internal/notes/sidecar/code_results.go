package sidecar

const CodeResultsVersion = 1

// CodeBlock is the persisted state of a single code block in a note.
type CodeBlock struct {
	CodeBlockID      string `json:"codeBlockId"`
	LastRan          string `json:"lastRan"`
	AreResultsHidden bool   `json:"areResultsHidden"`
	ResultHTML       string `json:"resultHtml"`
}

// CodeResults holds the code-execution state for all code blocks in a note.
type CodeResults struct {
	Version    int         `json:"version"`
	CodeBlocks []CodeBlock `json:"codeBlocks"`
}

// NoteWithCodeResults bundles a note's markdown body with its persisted code-block state.
type NoteWithCodeResults struct {
	Markdown    string      `json:"markdown"`
	CodeResults CodeResults `json:"codeResults"`
}

// ReadCodeResults returns the CodeResults section of notePath's sidecar,
// backfilling Version and an empty CodeBlocks slice if either is missing.
func ReadCodeResults(notePath string) (CodeResults, error) {
	defaults := CodeResults{
		Version:    CodeResultsVersion,
		CodeBlocks: []CodeBlock{},
	}
	data, err := read(PathFor(notePath))
	if err != nil {
		return CodeResults{}, err
	}
	if data.CodeResults == nil {
		return defaults, nil
	}
	results := *data.CodeResults
	if results.Version == 0 {
		results.Version = CodeResultsVersion
	}
	if results.CodeBlocks == nil {
		results.CodeBlocks = []CodeBlock{}
	}
	return results, nil
}

// WriteCodeResults persists code-execution results for notePath, dropping incomplete or
// duplicate code blocks. The sidecar file is removed entirely when no tags or results would remain.
func WriteCodeResults(notePath string, results CodeResults) error {
	filtered := make([]CodeBlock, 0, len(results.CodeBlocks))
	seenIDs := make(map[string]struct{}, len(results.CodeBlocks))
	for _, codeBlock := range results.CodeBlocks {
		if codeBlock.CodeBlockID == "" || codeBlock.ResultHTML == "" {
			continue
		}
		if _, exists := seenIDs[codeBlock.CodeBlockID]; exists {
			continue
		}
		seenIDs[codeBlock.CodeBlockID] = struct{}{}
		filtered = append(filtered, codeBlock)
	}

	sidecarPath := PathFor(notePath)
	data, err := read(sidecarPath)
	if err != nil {
		return err
	}

	if len(filtered) == 0 {
		data.CodeResults = nil
		if len(data.Tags) == 0 {
			return removeIfExists(sidecarPath)
		}
		return write(sidecarPath, data)
	}

	data.CodeResults = &CodeResults{
		Version:    CodeResultsVersion,
		CodeBlocks: filtered,
	}
	return write(sidecarPath, data)
}
