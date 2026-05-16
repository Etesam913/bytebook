package lsp

import (
	"fmt"
	"sort"
	"strings"
	"sync"

	"go.lsp.dev/protocol"
)

// blockSeparatorPrefix is the start of each block-separator line in the
// synthetic document. The full separator is built by appending the block
// order, e.g. "# --- bytebook block 2 ---\n". Using a Python comment keeps
// pyright from treating the separator as code.
const blockSeparatorPrefix = "# --- bytebook block "

// blockEntry tracks one code block's source plus its position within the
// concatenated synthetic document.
type blockEntry struct {
	blockID   string
	order     int
	source    string
	startLine int // 0-based line index in the synthetic doc where source begins
	lineCount int // number of newline-terminated lines in source (counting a trailing line if source doesn't end in \n)
}

// VirtualDoc maintains the synthetic per-note Python document that pyright
// sees. Blocks are ordered by their `order` value (the Lexical node index).
// Coordinate translation between (blockID, position) and synthetic-doc
// position lives here.
//
// For a note with three Python code blocks and prose between them:
//
//	block-a, order 0:
//	    import math
//	    radius = 4
//
//	block-b, order 2:
//	    area = math.pi * radius**2
//	    print(area)
//
//	block-c, order 5:
//	    from pathlib import Path
//	    Path.cwd()
//
// Pyright sees:
//
//	import math
//	radius = 4
//
//	# --- bytebook block 2 ---
//	area = math.pi * radius**2
//	print(area)
//
//	# --- bytebook block 5 ---
//	from pathlib import Path
//	Path.cwd()
//
// This lets completions in block-b see names from block-a. For example,
// block-b line 0 maps to synthetic document line 4 because the separator
// between block-a and block-b occupies two lines.
type VirtualDoc struct {
	// Completion, hover, and edit notifications can arrive concurrently from
	// separate Wails RPCs. Protect the block map, sorted slice, offsets, and
	// document version so coordinate translation always matches FullText.
	mu      sync.Mutex
	blocks  []*blockEntry
	byID    map[string]*blockEntry
	version int32
}

// NewVirtualDoc returns an empty VirtualDoc.
func NewVirtualDoc() *VirtualDoc {
	return &VirtualDoc{
		blocks: nil,
		byID:   map[string]*blockEntry{},
	}
}

// Version returns the current document version, which is bumped by every
// UpsertBlock / RemoveBlock. Used as the LSP didChange version.
func (v *VirtualDoc) Version() int32 {
	v.mu.Lock()
	defer v.mu.Unlock()
	return v.version
}

// UpsertBlock inserts or replaces a block. The block's position in the
// synthetic doc is determined by its `order` value, not insertion order.
func (v *VirtualDoc) UpsertBlock(blockID string, order int, source string) {
	v.mu.Lock()
	defer v.mu.Unlock()

	if existing, ok := v.byID[blockID]; ok {
		existing.order = order
		existing.source = source
	} else {
		entry := &blockEntry{blockID: blockID, order: order, source: source}
		v.byID[blockID] = entry
		v.blocks = append(v.blocks, entry)
	}
	v.recomputeOffsetsLocked()
	v.version++
}

// RemoveBlock drops a block from the synthetic doc. No-op if the block is
// unknown.
func (v *VirtualDoc) RemoveBlock(blockID string) {
	v.mu.Lock()
	defer v.mu.Unlock()

	entry, ok := v.byID[blockID]
	if !ok {
		return
	}
	delete(v.byID, blockID)
	for i, b := range v.blocks {
		if b == entry {
			v.blocks = append(v.blocks[:i], v.blocks[i+1:]...)
			break
		}
	}
	v.recomputeOffsetsLocked()
	v.version++
}

// recomputeOffsetsLocked sorts blocks by `order` and recomputes each block's
// startLine and lineCount. Must be called with v.mu held.
func (v *VirtualDoc) recomputeOffsetsLocked() {
	sort.SliceStable(v.blocks, func(i, j int) bool {
		return v.blocks[i].order < v.blocks[j].order
	})
	line := 0
	for i, b := range v.blocks {
		if i > 0 {
			// Separator: "\n# --- bytebook block N ---\n" inserted between blocks.
			// The leading \n closes the previous block (whether or not its source
			// ended with one); the separator line itself adds one line; the
			// trailing \n moves us to the start of the next block's first line.
			line += 2 // (blank line from leading "\n" after prev block) + separator line
		}
		b.startLine = line
		b.lineCount = countLines(b.source)
		line += b.lineCount
	}
}

// countLines returns the number of lines a string occupies in a text doc.
// A string with no trailing newline still occupies one line.
func countLines(s string) int {
	if s == "" {
		return 1
	}
	n := strings.Count(s, "\n") + 1
	if strings.HasSuffix(s, "\n") {
		// The trailing newline starts a new (empty) line — but that line is
		// "owned" by the separator/end-of-doc that follows, not by this block.
		n--
		if n == 0 {
			n = 1
		}
	}
	return n
}

// FullText returns the concatenated synthetic document.
func (v *VirtualDoc) FullText() string {
	v.mu.Lock()
	defer v.mu.Unlock()

	var b strings.Builder
	for i, blk := range v.blocks {
		if i > 0 {
			// Close previous block (always end with newline before separator)
			// then write the separator line + trailing newline.
			if !strings.HasSuffix(b.String(), "\n") {
				b.WriteByte('\n')
			}
			// Add the blank line so block source starts cleanly:
			//   prev_source\n
			//   \n                       <- blank line (the "\n" we add here)
			//   # --- bytebook block N ---\n
			//   next_source
			b.WriteByte('\n')
			fmt.Fprintf(&b, "%s%d ---\n", blockSeparatorPrefix, blk.order)
		}
		b.WriteString(blk.source)
	}
	return b.String()
}

// TranslateBlockToDoc converts a (blockID, position-within-block) coordinate
// into a position in the synthetic doc.
func (v *VirtualDoc) TranslateBlockToDoc(blockID string, pos protocol.Position) (protocol.Position, bool) {
	v.mu.Lock()
	defer v.mu.Unlock()

	entry, ok := v.byID[blockID]
	if !ok {
		return protocol.Position{}, false
	}
	return protocol.Position{
		Line:      uint32(entry.startLine) + pos.Line,
		Character: pos.Character,
	}, true
}

// TranslateDocToBlock converts a synthetic-doc position back into a
// (blockID, position-within-block) pair. Returns ok=false if the position
// lands on a separator line or outside any known block.
func (v *VirtualDoc) TranslateDocToBlock(pos protocol.Position) (string, protocol.Position, bool) {
	v.mu.Lock()
	defer v.mu.Unlock()

	for _, b := range v.blocks {
		start := uint32(b.startLine)
		end := start + uint32(b.lineCount) // exclusive
		if pos.Line >= start && pos.Line < end {
			return b.blockID, protocol.Position{
				Line:      pos.Line - start,
				Character: pos.Character,
			}, true
		}
	}
	return "", protocol.Position{}, false
}

// blockCount returns the number of blocks tracked. Test helper.
func (v *VirtualDoc) blockCount() int {
	v.mu.Lock()
	defer v.mu.Unlock()
	return len(v.blocks)
}
