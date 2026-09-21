package events

import (
	"log"
	"os"
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

			notePath := filepath.Join(folder, noteName)
			filePath := filepath.Join(params.ProjectPath, "notes", notePath)

			err := util.RetryWithExponentialBackoff(
				func() error {
					if filepath.Ext(noteName) == ".md" {
						_, err := search.AddMarkdownNoteToBatch(
							batch,
							idx,
							filePath,
							folder,
							noteName,
							true,
						)
						return err
					} else {
						// Handle attachment files
						fileExtension := filepath.Ext(noteName)
						if err := sidecar.Ensure(params.ProjectPath, folder, noteName); err != nil {
							log.Printf("Error ensuring sidecar for %s: %v", noteName, err)
						}
						_, err := search.AddAttachmentToBatch(
							batch,
							idx,
							params.ProjectPath,
							folder,
							noteName,
							fileExtension,
							true,
						)
						return err
					}
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
		if err := config.RenamePinnedFile(params.ProjectPath, item.OldFilePath, item.NewFilePath); err != nil {
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
		// TODO: Add flush logic in the loop
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

			if filepath.Ext(newNoteName) == ".md" {
				_, err := search.AddMarkdownNoteToBatch(
					batch,
					idx,
					newFilePath,
					newFolder,
					newNoteName,
					true,
				)
				if err != nil {
					log.Println("Error adding renamed note to batch", err)
				}
			} else {
				fileExtension := filepath.Ext(newNoteName)
				_, err := search.AddAttachmentToBatch(
					batch,
					idx,
					params.ProjectPath,
					newFolder,
					newNoteName,
					fileExtension,
					true,
				)
				if err != nil {
					log.Println("Error adding renamed attachment to batch", err)
				}
			}
		}
	})
}

// handleFileDeleteEvent removes deleted files from pinned notes and the search index.
func handleFileDeleteEvent(params EventParams, data []util.FileDeleteEventData) {
	for _, item := range data {
		if err := config.DeletePinnedFile(params.ProjectPath, item.FilePath); err != nil {
			log.Printf("Error updating pinned notes for file delete %s: %v", item.FilePath, err)
		}
	}

	deleteNotesFromIndex(params, data)
}

// deleteNotesFromIndex removes notes from the search index in a batch operation.
func deleteNotesFromIndex(params EventParams, data []util.FileDeleteEventData) {
	params.withBatch(func(_ bleve.Index, batch *bleve.Batch) {
		// TODO: Add flush logic in the loop
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
	params.withBatch(func(idx bleve.Index, attachmentBatch *bleve.Batch) {
		// TODO: Add flush logic in the loop
		for _, note := range data {
			folder, noteName := util.SplitFolderAndFile(note.FilePath)

			notePath := filepath.Join(folder, noteName)

			if filepath.Ext(noteName) != ".md" {
				// Attachments are indexed by file metadata only — never read
				// their contents into the markdown pipeline.
				_, err := search.AddAttachmentToBatch(
					attachmentBatch,
					idx,
					params.ProjectPath,
					folder,
					noteName,
					filepath.Ext(noteName),
					true,
				)
				if err != nil {
					log.Printf("Error adding attachment to batch %s: %v", notePath, err)
				}
				continue
			}

			// The file watcher already read the note when it emitted the event, so
			// prefer the markdown from the payload and only fall back to disk.
			markdown := note.Markdown
			if markdown == "" {
				noteFilePath := filepath.Join(params.ProjectPath, "notes", notePath)
				content, err := os.ReadFile(noteFilePath)
				if err != nil {
					log.Printf("Error reading note file %s: %v", noteFilePath, err)
					continue
				}
				markdown = string(content)
			}

			bleveMarkdownDocument := search.CreateMarkdownNoteBleveDocument(
				markdown,
				folder,
				noteName,
			)

			err := idx.Index(notePath, bleveMarkdownDocument)
			if err != nil {
				log.Printf("Error indexing note %s: %v", notePath, err)
			}
		}
	})
}
