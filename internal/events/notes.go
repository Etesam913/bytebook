package events

import (
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// handleNoteCreateEvent handles the event when a note is created.
// It extracts the note data from the event and adds the created notes to the search index.
func handleNoteCreateEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]map[string]string)
	if !ok {
		log.Println("Note created event data is not a map")
		return
	}
	addCreatedNotesToIndex(params, data)
}

// addCreatedNotesToIndex adds newly created notes to the search index in a batch operation.
// It expects a slice of note data, each containing folder and note name.
// This function includes retry logic to handle race conditions where the file may not be
// immediately available after the create event is fired.
func addCreatedNotesToIndex(params EventParams, data []map[string]string) {
	batch := params.Index.NewBatch()

	for _, note := range data {
		folder, ok := note["folder"]
		if !ok {
			log.Println("Note created event data is not a map")
			return
		}
		noteName, ok := note["note"]
		if !ok {
			log.Println("Note created event data is not a map")
			return
		}

		filePath := filepath.Join(params.ProjectPath, "notes", folder, noteName)

		// Retry logic to handle race condition where file might not be immediately available
		err := util.RetryWithExponentialBackoff(
			func() error {
				if filepath.Ext(noteName) == ".md" {
					_, err := search.AddMarkdownNoteToBatch(
						batch,
						params.Index,
						filePath,
						folder,
						noteName,
						true,
					)
					return err
				} else {
					// Handle attachment files
					fileExtension := filepath.Ext(noteName)
					if err := notes.EnsureAttachmentSidecar(params.ProjectPath, folder, noteName); err != nil {
						log.Printf("Error ensuring attachment sidecar for %s: %v", noteName, err)
					}
					_, err := search.AddAttachmentToBatch(
						batch,
						params.Index,
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

	err := params.Index.Batch(batch)
	if err != nil {
		log.Println("Error indexing batch", err)
	}
}

// handleNoteRenameEvent handles the event when a note is renamed.
// It extracts the rename data from the event and updates the search index accordingly.
func handleNoteRenameEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]map[string]string)
	if !ok {
		log.Println("Note rename event data is not a map")
		return
	}
	renameNotesInIndex(params, data)
}

// renameNotesInIndex updates the search index to reflect renamed notes.
// It deletes the old note entry and adds the new note entry if it is a markdown file.
func renameNotesInIndex(params EventParams, data []map[string]string) {
	batch := params.Index.NewBatch()

	// TODO: Add flush logic in the loop
	for _, note := range data {
		oldFolder, ok := note["oldFolder"]
		if !ok {
			log.Println("Note rename event data missing oldFolder")
			continue
		}
		oldNoteName, ok := note["oldNote"]
		if !ok {
			log.Println("Note rename event data missing oldNote")
			continue
		}
		newFolder, ok := note["newFolder"]
		if !ok {
			log.Println("Note rename event data missing newFolder")
			continue
		}
		newNoteName, ok := note["newNote"]
		if !ok {
			log.Println("Note rename event data missing newNote")
			continue
		}

		oldFileId := filepath.Join(oldFolder, oldNoteName)

		batch.Delete(oldFileId)

		newFilePath := filepath.Join(params.ProjectPath, "notes", newFolder, newNoteName)
		if filepath.Ext(newNoteName) == ".md" {
			_, err := search.AddMarkdownNoteToBatch(
				batch,
				params.Index,
				newFilePath,
				newFolder,
				newNoteName,
				true,
			)

			if err != nil {
				log.Println("Error adding renamed note to batch", err)
			}
		} else {
			// Handle attachment files
			fileExtension := filepath.Ext(newNoteName)
			if err := notes.RenameAttachmentSidecar(params.ProjectPath, oldFolder, oldNoteName, newFolder, newNoteName); err != nil {
				log.Println("Error renaming attachment sidecar", err)
			}
			_, err := search.AddAttachmentToBatch(
				batch,
				params.Index,
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

	err := params.Index.Batch(batch)
	if err != nil {
		log.Println("Error batching rename operations", err)
	}
}

// handleNoteDeleteEvent handles the event when a note is deleted.
// It removes the note from the search index and cleans up any attachment tag associations.
func handleNoteDeleteEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]map[string]string)
	if !ok {
		log.Println("Note delete event data is not a map")
		return
	}
	deleteNotesFromIndex(params, data)
}

// deleteNotesFromIndex removes notes from the search index in a batch operation.
// It expects a slice of note data, each containing folder and note name.
func deleteNotesFromIndex(params EventParams, data []map[string]string) {
	batch := params.Index.NewBatch()

	// TODO: Add flush logic in the loop
	for _, note := range data {
		folder, ok := note["folder"]
		if !ok {
			log.Println("Note delete event data missing folder")
			continue
		}
		noteName, ok := note["note"]
		if !ok {
			log.Println("Note delete event data missing note")
			continue
		}

		fileId := filepath.Join(folder, noteName)

		batch.Delete(fileId)

		if filepath.Ext(noteName) != ".md" {
			if err := notes.DeleteAttachmentSidecar(params.ProjectPath, folder, noteName); err != nil {
				log.Println("Error deleting attachment sidecar", err)
			}
		}
	}

	// Execute the batch
	err := params.Index.Batch(batch)
	if err != nil {
		log.Println("Error batching delete operations", err)
	}
}

// handleNoteWriteEvent handles the event when a note is written/updated.
// It extracts the note data from the event and updates the search index with the new content.
func handleNoteWriteEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]map[string]string)
	if !ok {
		log.Println("Note write event data is not a map")
		return
	}
	updateNotesInIndex(params, data)
}

// updateNotesInIndex updates the search index with the new note content for multiple notes.
func updateNotesInIndex(params EventParams, data []map[string]string) {

	// TODO: Add flush logic in the loop
	for _, note := range data {
		folder, ok := note["folder"]
		if !ok {
			log.Println("Note write event data missing folder")
			continue
		}
		noteName, ok := note["note"]
		if !ok {
			log.Println("Note write event data missing note")
			continue
		}

		noteId := filepath.Join(folder, noteName)
		noteFilePath := filepath.Join(params.ProjectPath, "notes", folder, noteName)

		// Read the markdown content from the file
		markdown, err := os.ReadFile(noteFilePath)
		if err != nil {
			log.Printf("Error reading note file %s: %v", noteFilePath, err)
			continue
		}

		bleveMarkdownDocument := search.CreateMarkdownNoteBleveDocument(
			string(markdown),
			folder,
			noteName,
		)

		err = params.Index.Index(noteId, bleveMarkdownDocument)
		if err != nil {
			log.Printf("Error indexing note %s: %v", noteId, err)
		}
	}
}
