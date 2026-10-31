package notes

import (
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/fsnotify/fsnotify"
)

// exactPathCache is scoped to one flush so case-sensitive names cannot go stale
// across batches. A failed directory read is cached as an empty set for the flush.
type exactPathCache map[string]util.Set[string]

func (cache exactPathCache) exists(path string) bool {
	if _, err := os.Lstat(path); err != nil {
		return false
	}
	dir, base := filepath.Dir(path), filepath.Base(path)
	if dir == path || base == "." || base == "/" {
		return true
	}
	names, ok := cache[dir]
	if !ok {
		names = make(util.Set[string])
		entries, err := os.ReadDir(dir)
		if err == nil {
			for _, entry := range entries {
				names.Add(entry.Name())
			}
		}
		cache[dir] = names
	}
	return names.Has(base)
}

func (fw *FileWatcher) addPendingRename(queue *pendingQueue, event fsnotify.Event) {
	addPendingWatcherEvent(&queue.renames, &queue.renamePaths, pendingPath{path: event.Name, identity: fw.knownWatchedDirectories.fileInfo(event.Name)})
}

// Match only unique filesystem identities, never content, names, or event order.
// An identity can have multiple paths (hard links), so both sides must be unique.
func (fw *FileWatcher) matchRenameIdentities(renames, creates []pendingPath, paths exactPathCache) map[int]int {
	if len(renames) == 0 {
		return nil
	}
	newInfo := make([]os.FileInfo, len(creates))
	for i, pending := range creates {
		if paths.exists(pending.path) {
			newInfo[i], _ = os.Lstat(pending.path)
		}
	}
	matches := make(map[int]int)
	claimed := make(map[int]int)
	// Find a unique destination for each cached source identity. Count claims so
	// the next pass can also reject multiple sources pointing to one destination.
	for i, pending := range renames {
		info := pending.identity
		if info == nil {
			continue
		}
		candidate := -1
		for j, other := range newInfo {
			if other != nil && os.SameFile(info, other) {
				if candidate >= 0 {
					candidate = -1
					break
				}
				candidate = j
			}
		}
		if candidate >= 0 {
			matches[i] = candidate
			claimed[candidate]++
		}
	}
	for i, j := range matches {
		if claimed[j] != 1 {
			delete(matches, i)
		}
	}
	// Replacing the same pathname is a content update, not a guessed rename.
	// Do this after identity matching so swaps cannot be mistaken for replacements.
	for i, pending := range renames {
		if _, ok := matches[i]; ok {
			continue
		}
		for j, created := range creates {
			if newInfo[j] != nil && pending.path == created.path && claimed[j] == 0 {
				matches[i] = j
				claimed[j]++
				break
			}
		}
	}
	return matches
}

// A removed pathname that already exists again was replaced, not deleted.
// Reconcile at flush time so Remove/Create order and preserved timestamps do
// not make the editor navigate away or retain the previous contents.
func (fw *FileWatcher) resolveFileReplacements(paths exactPathCache) {
	replaced := util.Set[string]{}
	deletes := make([]util.FileDeleteEventData, 0, len(fw.batch.fileDeletes))
	for _, event := range fw.batch.fileDeletes {
		path := filepath.Join(fw.projectPath, "notes", event.FilePath)
		info, err := os.Lstat(path)
		if err != nil || !info.Mode().IsRegular() || !paths.exists(path) {
			deletes = append(deletes, event)
			continue
		}
		replaced.Add(path)
		fw.clearFileState(path)
		fw.emitFileWriteEvent(path)
	}
	fw.batch.fileDeletes = deletes
	creates := make([]pendingPath, 0, len(fw.files.creates))
	for _, event := range fw.files.creates {
		if !replaced.Has(event.path) {
			creates = append(creates, event)
		}
	}
	fw.files.creates = creates
}
