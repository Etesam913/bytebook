package events

import (
	"log"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/search"
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

		_, err := search.AddMarkdownNoteToBatch(
			batch,
			params.Index,
			filepath.Join(params.ProjectPath, folder, noteName),
			folder,
			noteName,
			true,
		)

		if err != nil {
			log.Println("Error adding markdown note to batch", err)
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
	}

	// Execute the batch
	err := params.Index.Batch(batch)
	if err != nil {
		log.Println("Error batching delete operations", err)
	}
}
