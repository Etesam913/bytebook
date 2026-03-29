package notes

import (
	"sync"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/fsnotify/fsnotify"
)

// DirectoryWatchRegistry tracks watched directories across the file watcher and
// bulk import coordinator.
type DirectoryWatchRegistry struct {
	mu    sync.RWMutex
	paths util.Set[string]
}

// NewDirectoryWatchRegistry creates an empty registry for tracked directory watches.
func NewDirectoryWatchRegistry() *DirectoryWatchRegistry {
	return &DirectoryWatchRegistry{
		paths: make(util.Set[string]),
	}
}

// Add records a watched directory path in the registry.
func (r *DirectoryWatchRegistry) Add(path string) {
	if path == "" {
		return
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	r.paths.Add(path)
}

// Remove forgets a watched directory path in the registry.
func (r *DirectoryWatchRegistry) Remove(path string) {
	if path == "" {
		return
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	r.paths.Remove(path)
}

// Has reports whether the directory path is currently tracked as watched.
func (r *DirectoryWatchRegistry) Has(path string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.paths.Has(path)
}

// Snapshot returns a point-in-time copy of all tracked watched directories.
func (r *DirectoryWatchRegistry) Snapshot() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	paths := make([]string, 0, len(r.paths))
	for path := range r.paths {
		paths = append(paths, path)
	}

	return paths
}

// SyncFromWatcher seeds the registry from the watcher's current directory watch list.
func (r *DirectoryWatchRegistry) SyncFromWatcher(watcher *fsnotify.Watcher) {
	if watcher == nil {
		return
	}

	for _, watchedPath := range watcher.WatchList() {
		if util.IsDirectory(watchedPath) {
			r.Add(watchedPath)
		}
	}
}
