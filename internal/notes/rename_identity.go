package notes

import (
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/fsnotify/fsnotify"
)

func (fw *FileWatcher) addPendingRename(events []pendingWatcherEvent, event fsnotify.Event) []pendingWatcherEvent {
	return addPendingWatcherEvent(events, pendingWatcherEvent{event: event, identity: fw.knownWatchedDirectories.fileInfo(event.Name)})
}

// Match only unique filesystem identities, never content, names, or event order.
// An identity can have multiple paths (hard links), so both sides must be unique.
func (fw *FileWatcher) matchRenameIdentities(renames, creates []pendingWatcherEvent) map[int]int {
	newInfo := make([]os.FileInfo, len(creates))
	for i, pending := range creates {
		if util.ExactPathExists(pending.event.Name) {
			newInfo[i], _ = os.Lstat(pending.event.Name)
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
			if newInfo[j] != nil && pending.event.Name == created.event.Name && claimed[j] == 0 {
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
func (fw *FileWatcher) resolveFileReplacements() {
	replaced := util.Set[string]{}
	deletes := make([]util.FileDeleteEventData, 0, len(fw.batch.fileDeletes))
	for _, event := range fw.batch.fileDeletes {
		path := filepath.Join(fw.projectPath, "notes", event.FilePath)
		info, err := os.Lstat(path)
		if err != nil || !info.Mode().IsRegular() || !util.ExactPathExists(path) {
			deletes = append(deletes, event)
			continue
		}
		replaced.Add(path)
		fw.clearFileState(path)
		fw.emitFileWriteEvent(path)
	}
	fw.batch.fileDeletes = deletes
	creates := make([]pendingWatcherEvent, 0, len(fw.mostRecentFileCreatedEvents))
	for _, event := range fw.mostRecentFileCreatedEvents {
		if !replaced.Has(event.event.Name) {
			creates = append(creates, event)
		}
	}
	fw.mostRecentFileCreatedEvents = creates
}
