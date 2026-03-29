package ingest

import (
	"errors"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/fsnotify/fsnotify"
)

const (
	bulkImportQueueSize        = 32
	bulkImportIndexWorkerCount = 4
	bulkImportSettleDelay      = 250 * time.Millisecond
	watchAddRetryLimit         = 3
	watchAddRetryDelay         = 50 * time.Millisecond
)

type importRequest struct {
	relativeFolderPath string
	settleDelay        time.Duration
}

type BulkImportCoordinator struct {
	projectPath string
	notesPath   string
	index       *bleve.Index
	watcher     *fsnotify.Watcher
	registry    *notes.DirectoryWatchRegistry

	mu       sync.Mutex
	pending  util.Set[string]
	inFlight util.Set[string]

	jobs   chan importRequest
	close  chan struct{}
	closed sync.Once
}

// NewBulkImportCoordinator creates a background coordinator for large subtree imports.
// It deduplicates folder-create bursts, walks each subtree once, indexes files with
// bounded concurrency, and then adds directory watches progressively. This helps to
// stop IO errors with too many files open
func NewBulkImportCoordinator(
	projectPath string,
	index *bleve.Index,
	watcher *fsnotify.Watcher,
	registry *notes.DirectoryWatchRegistry,
) *BulkImportCoordinator {
	coordinator := &BulkImportCoordinator{
		projectPath: projectPath,
		notesPath:   filepath.Join(projectPath, "notes"),
		index:       index,
		watcher:     watcher,
		registry:    registry,
		pending:     make(util.Set[string]),
		inFlight:    make(util.Set[string]),
		jobs:        make(chan importRequest, bulkImportQueueSize),
		close:       make(chan struct{}),
	}

	go coordinator.run()

	return coordinator
}

// EnqueueInitialScan schedules a full notes-tree scan used during startup catch-up.
func (c *BulkImportCoordinator) EnqueueInitialScan() {
	c.enqueue(importRequest{relativeFolderPath: ""})
}

// EnqueueFolderImport schedules ingestion for a newly created notes subtree.
// Requests are normalized and coalesced so overlapping parent/child imports do not
// trigger duplicate walks.
func (c *BulkImportCoordinator) EnqueueFolderImport(relativeFolderPath string) {
	c.enqueue(importRequest{
		relativeFolderPath: relativeFolderPath,
		settleDelay:        bulkImportSettleDelay,
	})
}

// Shutdown stops the coordinator loop. It does not cancel in-flight work mid-step.
func (c *BulkImportCoordinator) Shutdown() {
	c.closed.Do(func() {
		close(c.close)
	})
}

// enqueue normalizes a request and adds it to the work queue unless an equal or
// broader subtree is already pending or in flight.
func (c *BulkImportCoordinator) enqueue(req importRequest) {
	normalized, ok := normalizeNotesRelativeDirectoryPath(req.relativeFolderPath)
	if !ok {
		return
	}
	req.relativeFolderPath = normalized

	c.mu.Lock()
	if c.isCoveredLocked(normalized) {
		c.mu.Unlock()
		return
	}

	c.removeDescendantsLocked(c.pending, normalized)
	c.pending.Add(normalized)
	c.mu.Unlock()

	select {
	case c.jobs <- req:
	case <-c.close:
	}
}

// run is the coordinator's background loop. It serializes subtree imports so a
// massive drag-and-drop operation does not fan out into competing scans.
func (c *BulkImportCoordinator) run() {
	for {
		select {
		case <-c.close:
			return
		case req := <-c.jobs:
			if !c.startRequest(req.relativeFolderPath) {
				continue
			}

			if req.settleDelay > 0 {
				select {
				case <-time.After(req.settleDelay):
				case <-c.close:
					c.finishRequest(req.relativeFolderPath)
					return
				}
			}

			c.processRequest(req.relativeFolderPath)
			c.finishRequest(req.relativeFolderPath)
		}
	}
}

// startRequest moves a queued subtree from pending to in-flight.
func (c *BulkImportCoordinator) startRequest(relativeFolderPath string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.pending.Has(relativeFolderPath) {
		return false
	}

	c.pending.Remove(relativeFolderPath)
	c.inFlight.Add(relativeFolderPath)
	return true
}

// finishRequest clears the in-flight marker for a completed subtree.
func (c *BulkImportCoordinator) finishRequest(relativeFolderPath string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.inFlight.Remove(relativeFolderPath)
}

// isCoveredLocked reports whether the subtree is already represented by an equal
// or broader pending/in-flight path. The caller must hold c.mu.
func (c *BulkImportCoordinator) isCoveredLocked(relativeFolderPath string) bool {
	if c.pending.Has(relativeFolderPath) {
		return true
	}
	if c.inFlight.Has(relativeFolderPath) {
		return true
	}

	for scheduledPath := range c.pending {
		if pathCovers(scheduledPath, relativeFolderPath) {
			return true
		}
	}

	for runningPath := range c.inFlight {
		if pathCovers(runningPath, relativeFolderPath) {
			return true
		}
	}

	return false
}

// removeDescendantsLocked drops narrower queued paths once a broader parent path
// has been scheduled. The caller must hold c.mu.
func (c *BulkImportCoordinator) removeDescendantsLocked(paths util.Set[string], relativeFolderPath string) {
	for existingPath := range paths {
		if existingPath == relativeFolderPath {
			continue
		}
		if pathCovers(relativeFolderPath, existingPath) {
			paths.Remove(existingPath)
		}
	}
}

// processRequest performs a single subtree import: discover once, index files,
// then add directory watches while logging a compact summary.
func (c *BulkImportCoordinator) processRequest(relativeFolderPath string) {
	rootPath := c.notesPath
	if relativeFolderPath != "" {
		rootPath = filepath.Join(c.notesPath, relativeFolderPath)
	}

	info, err := os.Stat(rootPath)
	if err != nil {
		if os.IsNotExist(err) {
			return
		}
		log.Printf("Error statting import root %s: %v", rootPath, err)
		return
	}
	if !info.IsDir() {
		return
	}

	directories, filePaths, err := discoverImportSubtree(rootPath)
	if err != nil {
		log.Printf("Error discovering subtree %s: %v", rootPath, err)
	}

	if c.index == nil || *c.index == nil {
		log.Printf("Error indexing subtree %s: index is nil", rootPath)
		return
	}

	if len(filePaths) > 0 {
		if err := search.IndexDiscoveredFiles(c.projectPath, filePaths, *c.index, bulkImportIndexWorkerCount); err != nil {
			log.Printf("Error indexing subtree %s: %v", rootPath, err)
		}
	}

	summary := c.addDirectoriesToWatcher(directories)
	if len(filePaths) > 0 || summary.added > 0 || summary.deferred > 0 {
		log.Printf(
			"bulk import processed root=%q dirs=%d files=%d watchers_added=%d watchers_deferred=%d watchers_skipped=%d",
			relativeFolderPath,
			len(directories),
			len(filePaths),
			summary.added,
			summary.deferred,
			summary.skipped,
		)
	}
}

type watchAddSummary struct {
	added    int
	deferred int
	skipped  int
}

// addDirectoriesToWatcher registers watches for discovered directories until the
// watcher budget is exhausted. Remaining paths are counted as deferred.
func (c *BulkImportCoordinator) addDirectoriesToWatcher(directories []string) watchAddSummary {
	summary := watchAddSummary{}
	if c.watcher == nil {
		return summary
	}

	sort.Strings(directories)

	for index, path := range directories {
		if c.registry != nil && c.registry.Has(path) {
			summary.skipped++
			continue
		}

		if err := addWatchWithRetry(c.watcher, path); err != nil {
			if isTooManyOpenFiles(err) {
				summary.deferred = len(directories) - index
				return summary
			}

			log.Printf("Error adding watcher for %s: %v", path, err)
			continue
		}

		summary.added++
		if c.registry != nil {
			c.registry.Add(path)
		}
	}

	return summary
}

// addWatchWithRetry retries transient watch-add failures a small number of times
// but returns immediately on EMFILE-style errors.
func addWatchWithRetry(watcher *fsnotify.Watcher, path string) error {
	var lastErr error
	for attempt := 0; attempt < watchAddRetryLimit; attempt++ {
		if err := watcher.Add(path); err != nil {
			lastErr = err
			if isTooManyOpenFiles(err) {
				return err
			}
			if attempt == watchAddRetryLimit-1 {
				return err
			}
			time.Sleep(watchAddRetryDelay)
			continue
		}
		return nil
	}

	return lastErr
}

// discoverImportSubtree walks a folder tree once and separates discovered
// directories from files while preserving the existing hidden-path skip rules.
func discoverImportSubtree(rootPath string) ([]string, []string, error) {
	directories := []string{}
	filePaths := []string{}

	err := filepath.WalkDir(rootPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if strings.HasPrefix(d.Name(), ".") && path != rootPath {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		if d.IsDir() {
			directories = append(directories, path)
			return nil
		}

		filePaths = append(filePaths, path)
		return nil
	})

	return directories, filePaths, err
}

// normalizeNotesRelativeDirectoryPath validates and cleans a path relative to the
// notes root. It rejects absolute paths, parent traversal, and hidden roots.
func normalizeNotesRelativeDirectoryPath(path string) (string, bool) {
	if path == "" || path == "." {
		return "", true
	}

	cleanedPath := filepath.Clean(path)
	if cleanedPath == "." {
		return "", true
	}
	if cleanedPath == ".." || strings.HasPrefix(cleanedPath, ".."+string(filepath.Separator)) || filepath.IsAbs(cleanedPath) {
		return "", false
	}
	if strings.HasPrefix(filepath.Base(cleanedPath), ".") {
		return "", false
	}

	return cleanedPath, true
}

// pathCovers reports whether parent is the same path as child or an ancestor of it.
func pathCovers(parent, child string) bool {
	if parent == "" {
		return true
	}
	if parent == child {
		return true
	}

	return strings.HasPrefix(child, parent+string(filepath.Separator))
}

// isTooManyOpenFiles identifies watcher-add failures caused by file descriptor exhaustion.
func isTooManyOpenFiles(err error) bool {
	return errors.Is(err, syscall.EMFILE) || strings.Contains(strings.ToLower(err.Error()), "too many open files")
}
