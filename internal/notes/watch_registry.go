package notes

import (
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/fsnotify/fsnotify"
)

// DirectoryWatchRegistry tracks watched directories across the file watcher and
// bulk import coordinator.
type DirectoryWatchRegistry struct {
	mu         sync.RWMutex
	paths      util.Set[string]
	identities map[string]os.FileInfo
}

// NewDirectoryWatchRegistry creates an empty registry for tracked directory watches.
func NewDirectoryWatchRegistry() *DirectoryWatchRegistry {
	return &DirectoryWatchRegistry{
		paths:      make(util.Set[string]),
		identities: make(map[string]os.FileInfo),
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
	// Keep identity before a rename removes the old pathname. Directory watches
	// cover immediate children; the import coordinator registers descendants.
	r.recordPathLocked(path)
	entries, err := os.ReadDir(path)
	if err == nil {
		for _, entry := range entries {
			if !shouldIgnoreFile(entry.Name()) {
				r.recordPathLocked(filepath.Join(path, entry.Name()))
			}
		}
	}
}

// Remove forgets a watched directory path in the registry.
func (r *DirectoryWatchRegistry) Remove(path string) {
	if path == "" {
		return
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	r.paths.Remove(path)
	for name := range r.identities {
		if name == path || strings.HasPrefix(name, path+string(os.PathSeparator)) {
			delete(r.identities, name)
		}
	}
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

// fileInfo returns the last observed identity, even when its pathname is gone.
func (r *DirectoryWatchRegistry) fileInfo(path string) os.FileInfo {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.identities[path]
}

func (r *DirectoryWatchRegistry) recordPathLocked(path string) {
	if info, err := os.Lstat(path); err == nil {
		r.identities[path] = info
	}
}

func (r *DirectoryWatchRegistry) recordPath(path string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.recordPathLocked(path)
}

func (r *DirectoryWatchRegistry) forgetFile(path string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.identities, path)
}
