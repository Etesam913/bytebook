package search

import (
	"sync"

	"github.com/blevesearch/bleve/v2"
)

// IndexHolder wraps a bleve.Index with an RWMutex. Readers (FullTextSearch,
// batch updates from event handlers) coordinate with the writer
// (RegenerateSearchIndex, which closes the old index and installs a new one).
// Without this coordination, a concurrent Search/Batch against an index that
// has just been closed mid-regenerate would race or panic.
type IndexHolder struct {
	mu  sync.RWMutex
	idx bleve.Index
}

func NewIndexHolder(idx bleve.Index) *IndexHolder {
	return &IndexHolder{idx: idx}
}

// RLock acquires the read lock and returns the current index. The returned
// index is valid until the matching RUnlock. Multiple readers may hold the
// lock concurrently; Swap blocks until all readers release.
func (h *IndexHolder) RLock() bleve.Index {
	h.mu.RLock()
	return h.idx
}

// RUnlock releases the read lock obtained from RLock.
func (h *IndexHolder) RUnlock() {
	h.mu.RUnlock()
}

// Read is a convenience wrapper: it acquires the read lock, calls fn, and
// releases the lock. Prefer this for single-operation reads.
func (h *IndexHolder) Read(fn func(bleve.Index) error) error {
	idx := h.RLock()
	defer h.RUnlock()
	return fn(idx)
}

// Swap takes the write lock, passes the current index to fn, and stores the
// returned index. fn is expected to close the old index itself (as
// RegenerateSearchIndex does). Blocks until all in-flight readers finish.
func (h *IndexHolder) Swap(fn func(old bleve.Index) (bleve.Index, error)) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	newIdx, err := fn(h.idx)
	if err != nil {
		return err
	}
	h.idx = newIdx
	return nil
}

// Close closes the underlying index under the write lock.
func (h *IndexHolder) Close() error {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.idx == nil {
		return nil
	}
	return h.idx.Close()
}
