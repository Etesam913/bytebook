package events

import (
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes/sidecar"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// handleFileCreateEvent handles the event when a file is created.
// It extracts the file data from the event and adds the created notes to the search index.
func handleFileCreateEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]util.FileCreateEventData)
	if !ok {
		log.Println("File create event data is not []util.FileCreateEventData")
		return
	}
	addCreatedNotesToIndex(params, data)
}

// addCreatedNotesToIndex adds newly created notes to the search index in a batch operation.
// This function includes retry logic to handle race conditions where the file may not be
// immediately available after the create event is fired.
func addCreatedNotesToIndex(params EventParams, data []util.FileCreateEventData) {
	idx := params.Index.RLock()
	defer params.Index.RUnlock()
	batch := idx.NewBatch()

	for _, note := range data {
		folder, noteName := util.SplitFolderAndFile(note.FilePath)

		notePath := filepath.Join(folder, noteName)
		filePath := filepath.Join(params.ProjectPath, "notes", notePath)

		// Retry logic to handle race condition where file might not be immediately available
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

	err := idx.Batch(batch)
	if err != nil {
		log.Println("Error indexing batch", err)
	}
}

// handleFileRenameEvent handles the event when a file is renamed.
// It extracts the rename data from the event, updates the search index,
// and replaces local links in other notes that reference the renamed file.
func handleFileRenameEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]util.FileRenameEventData)
	if !ok {
		log.Println("File rename event data is not []util.FileRenameEventData")
		return
	}

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
	idx := params.Index.RLock()
	defer params.Index.RUnlock()
	batch := idx.NewBatch()

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

	err := idx.Batch(batch)
	if err != nil {
		log.Println("Error batching rename operations", err)
	}
}

// handleFileDeleteEvent handles the event when a file is deleted.
// It removes the note from the search index and cleans up any attachment tag associations.
func handleFileDeleteEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]util.FileDeleteEventData)
	if !ok {
		log.Println("File delete event data is not []util.FileDeleteEventData")
		return
	}

	for _, item := range data {
		if err := config.DeletePinnedFile(params.ProjectPath, item.FilePath); err != nil {
			log.Printf("Error updating pinned notes for file delete %s: %v", item.FilePath, err)
		}
	}

	deleteNotesFromIndex(params, data)
}

// deleteNotesFromIndex removes notes from the search index in a batch operation.
func deleteNotesFromIndex(params EventParams, data []util.FileDeleteEventData) {
	idx := params.Index.RLock()
	defer params.Index.RUnlock()
	batch := idx.NewBatch()

	// TODO: Add flush logic in the loop
	for _, note := range data {
		folder, noteName := util.SplitFolderAndFile(note.FilePath)

		notePath := filepath.Join(folder, noteName)
		batch.Delete(notePath)

		if err := sidecar.Delete(params.ProjectPath, folder, noteName); err != nil {
			log.Println("Error deleting sidecar", err)
		}
	}

	// Execute the batch
	err := idx.Batch(batch)
	if err != nil {
		log.Println("Error batching delete operations", err)
	}
}

// handleFileWriteEvent handles the event when a file is written/updated.
// It extracts the file data from the event and updates the search index with the new content.
func handleFileWriteEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]util.FileWriteEventData)
	if !ok {
		log.Println("File write event data is not []util.FileWriteEventData")
		return
	}
	updateNotesInIndex(params, data)
}

// updateNotesInIndex updates the search index with the new note content for multiple notes.
func updateNotesInIndex(params EventParams, data []util.FileWriteEventData) {
	idx := params.Index.RLock()
	defer params.Index.RUnlock()
	attachmentBatch := idx.NewBatch()
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

	if attachmentBatch.Size() > 0 {
		if err := idx.Batch(attachmentBatch); err != nil {
			log.Println("Error batching attachment write operations", err)
		}
	}
}
