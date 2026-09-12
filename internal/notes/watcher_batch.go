package notes

import (
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// Keep application payloads typed throughout accumulation and emission.
type watcherBatch struct {
	fileCreates   []util.FileCreateEventData
	fileDeletes   []util.FileDeleteEventData
	fileRenames   []util.FileRenameEventData
	fileWrites    []util.FileWriteEventData
	folderCreates []util.FolderCreateEventData
	folderDeletes []util.FolderDeleteEventData
	folderRenames []util.FolderRenameEventData
}

func uniqueEvents[T comparable](events []T) []T {
	seen := make(map[T]bool, len(events))
	result := make([]T, 0, len(events))
	for _, event := range events {
		if !seen[event] {
			seen[event] = true
			result = append(result, event)
		}
	}
	return result
}

func excludePaths[T any](events []T, excluded util.Set[string], path func(T) string) []T {
	result := make([]T, 0, len(events))
	for _, event := range events {
		if !excluded.Has(path(event)) {
			result = append(result, event)
		}
	}
	return result
}

func latestFileWrites(events []util.FileWriteEventData) []util.FileWriteEventData {
	positions := make(map[string]int, len(events))
	result := make([]util.FileWriteEventData, 0, len(events))
	for _, event := range events {
		if i, ok := positions[event.FilePath]; ok {
			result[i] = event
		} else {
			positions[event.FilePath] = len(result)
			result = append(result, event)
		}
	}
	return result
}

func (batch watcherBatch) events() []*application.CustomEvent {
	oldFiles, newFiles := util.Set[string]{}, util.Set[string]{}
	oldFolders, newFolders := util.Set[string]{}, util.Set[string]{}
	for _, event := range batch.fileRenames {
		oldFiles.Add(event.OldFilePath)
		newFiles.Add(event.NewFilePath)
	}
	for _, event := range batch.folderRenames {
		oldFolders.Add(event.OldFolderPath)
		newFolders.Add(event.NewFolderPath)
	}
	batch.fileCreates = excludePaths(batch.fileCreates, newFiles, func(e util.FileCreateEventData) string { return e.FilePath })
	batch.fileDeletes = excludePaths(batch.fileDeletes, oldFiles, func(e util.FileDeleteEventData) string { return e.FilePath })
	batch.folderCreates = excludePaths(batch.folderCreates, newFolders, func(e util.FolderCreateEventData) string { return e.FolderPath })
	batch.folderDeletes = excludePaths(batch.folderDeletes, oldFolders, func(e util.FolderDeleteEventData) string { return e.FolderPath })

	// Preserve the frontend's structural-event order, with content updates last.
	events := []*application.CustomEvent{}
	if len(batch.folderRenames) > 0 {
		events = append(events, &application.CustomEvent{Name: util.EventFolderRename, Data: uniqueEvents(batch.folderRenames)})
	}
	if len(batch.fileRenames) > 0 {
		events = append(events, &application.CustomEvent{Name: util.EventFileRename, Data: uniqueEvents(batch.fileRenames)})
	}
	if len(batch.folderDeletes) > 0 {
		events = append(events, &application.CustomEvent{Name: util.EventFolderDelete, Data: uniqueEvents(batch.folderDeletes)})
	}
	if len(batch.fileDeletes) > 0 {
		events = append(events, &application.CustomEvent{Name: util.EventFileDelete, Data: uniqueEvents(batch.fileDeletes)})
	}
	if len(batch.folderCreates) > 0 {
		events = append(events, &application.CustomEvent{Name: util.EventFolderCreate, Data: uniqueEvents(batch.folderCreates)})
	}
	if len(batch.fileCreates) > 0 {
		events = append(events, &application.CustomEvent{Name: util.EventFileCreate, Data: uniqueEvents(batch.fileCreates)})
	}
	if len(batch.fileWrites) > 0 {
		events = append(events, &application.CustomEvent{Name: util.EventFileWrite, Data: latestFileWrites(batch.fileWrites)})
	}
	return events
}

func (fw *FileWatcher) queueCreate(isFolder bool, path string) {
	if isFolder {
		fw.batch.folderCreates = append(fw.batch.folderCreates, util.FolderCreateEventData{FolderPath: path})
	} else {
		fw.batch.fileCreates = append(fw.batch.fileCreates, util.FileCreateEventData{FilePath: path})
	}
}

func (fw *FileWatcher) queueDelete(isFolder bool, path string) {
	if isFolder {
		fw.batch.folderDeletes = append(fw.batch.folderDeletes, util.FolderDeleteEventData{FolderPath: path})
	} else {
		fw.batch.fileDeletes = append(fw.batch.fileDeletes, util.FileDeleteEventData{FilePath: path})
	}
}

func (fw *FileWatcher) queueRename(isFolder bool, oldPath, newPath string) {
	if isFolder {
		fw.batch.folderRenames = append(fw.batch.folderRenames, util.FolderRenameEventData{OldFolderPath: oldPath, NewFolderPath: newPath})
	} else {
		fw.batch.fileRenames = append(fw.batch.fileRenames, util.FileRenameEventData{OldFilePath: oldPath, NewFilePath: newPath})
	}
}
