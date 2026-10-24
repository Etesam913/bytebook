package events

import (
	"log"
	"path/filepath"
	"time"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes/sidecar"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
)

// addCreatedNotesToIndex adds newly created notes to the search index in a batch operation.
// It retries because the file may not be available yet when the create event fires.
func addCreatedNotesToIndex(params EventParams, data []util.FileCreateEventData) {
	params.withBatch(func(idx bleve.Index, batch *bleve.Batch) {
		for _, note := range data {
			folder, noteName := util.SplitFolderAndFile(note.FilePath)

			err := util.RetryWithExponentialBackoff(
				func() error {
					if filepath.Ext(noteName) != ".md" {
						if err := sidecar.Ensure(params.ProjectPath, folder, noteName); err != nil {
							log.Printf("Error ensuring sidecar for %s: %v", noteName, err)
						}
					}
					err := search.IndexFile(batch, params.ProjectPath, folder, noteName, nil)
					return err
				},
				5,                   // maxRetries
				10*time.Millisecond, // initialDelay
			)

			if err != nil {
				log.Printf("Error adding note to batch: %v", err)
			}
		}
	})
}

// handleFileRenameEvent updates pinned notes and the search index for renamed files,
// then replaces local links in other notes that reference the renamed file.
func handleFileRenameEvent(params EventParams, data []util.FileRenameEventData) {
	for _, item := range data {
		if err := config.RenamePinnedPath(params.ProjectPath, item.OldFilePath, item.NewFilePath); err != nil {
			log.Printf("Error updating pinned notes for file rename %s -> %s: %v", item.OldFilePath, item.NewFilePath, err)
		}
	}

	renameFilesInIndex(params, data)
	replaceLocalLinksInNotes(params, data)
}

// renameFilesInIndex updates the search index to reflect renamed files.
// It deletes the old entry and adds the new entry.
func renameFilesInIndex(params EventParams, data []util.FileRenameEventData) {
	params.withBatch(func(idx bleve.Index, batch *bleve.Batch) {
		for _, note := range data {
			oldFolder, oldNoteName := util.SplitFolderAndFile(note.OldFilePath)
			newFolder, newNoteName := util.SplitFolderAndFile(note.NewFilePath)

			oldNotePath := filepath.Join(oldFolder, oldNoteName)
			newNotePath := filepath.Join(newFolder, newNoteName)

			batch.Delete(oldNotePath)

			oldFilePath := filepath.Join(params.ProjectPath, "notes", oldNotePath)
			newFilePath := filepath.Join(params.ProjectPath, "notes", newNotePath)
			if err := sidecar.Move(oldFilePath, newFilePath); err != nil {
				log.Printf("Error moving sidecar from %s to %s: %v", oldFilePath, newFilePath, err)
			}

			if err := search.IndexFile(batch, params.ProjectPath, newFolder, newNoteName, nil); err != nil {
				log.Println("Error adding renamed file to batch", err)
			}

			if err := flushBatchIfFull(idx, batch); err != nil {
				log.Println("Error flushing rename batch", err)
			}
		}
	})
}

// handleFileDeleteEvent removes deleted files from pinned notes and the search index.
func handleFileDeleteEvent(params EventParams, data []util.FileDeleteEventData) {
	for _, item := range data {
		if err := config.DeletePinnedPath(params.ProjectPath, item.FilePath); err != nil {
			log.Printf("Error updating pinned notes for file delete %s: %v", item.FilePath, err)
		}
	}

	deleteNotesFromIndex(params, data)
}

// deleteNotesFromIndex removes notes from the search index in a batch operation.
func deleteNotesFromIndex(params EventParams, data []util.FileDeleteEventData) {
	params.withBatch(func(_ bleve.Index, batch *bleve.Batch) {
		for _, note := range data {
			folder, noteName := util.SplitFolderAndFile(note.FilePath)
			batch.Delete(filepath.Join(folder, noteName))

			// A watcher delete may be a move out or Finder trash. Keep the sidecar so
			// Put Back can recover it; explicit application operations own its lifecycle.
		}
	})
}

// updateNotesInIndex updates the search index with the new content of written files.
func updateNotesInIndex(params EventParams, data []util.FileWriteEventData) {
	params.withBatch(func(idx bleve.Index, batch *bleve.Batch) {
		for _, note := range data {
			folder, noteName := util.SplitFolderAndFile(note.FilePath)

			// Empty event payloads retain the existing fallback to disk.
			var markdown *string
			if note.Markdown != "" {
				markdown = &note.Markdown
			}
			if err := search.IndexFile(batch, params.ProjectPath, folder, noteName, markdown); err != nil {
				log.Printf("Error indexing file %s: %v", note.FilePath, err)
			}

			if err := flushBatchIfFull(idx, batch); err != nil {
				log.Printf("Error flushing write batch: %v", err)
			}
		}
	})
}
