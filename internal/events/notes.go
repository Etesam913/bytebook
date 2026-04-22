package events

import (
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// handleFileCreateEvent handles the event when a file is created.
// It extracts the file data from the event and adds the created notes to the search index.
func handleFileCreateEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]map[string]string)
	if !ok {
		log.Println("File create event data is not a map")
		return
	}
	addCreatedNotesToIndex(params, convertFilePathData(data))
}

// convertFilePathData converts event data from "filePath" format to "folder"/"note" format.
func convertFilePathData(data []map[string]string) []map[string]string {
	result := make([]map[string]string, len(data))
	for i, note := range data {
		if _, hasFolder := note["folder"]; hasFolder {
			// Already in folder/note format
			result[i] = note
			continue
		}
		if filePath, ok := note["filePath"]; ok {
			converted := map[string]string{
				"folder": filepath.Dir(filePath),
				"note":   filepath.Base(filePath),
			}
			// Copy any additional keys (e.g., "markdown")
			for k, v := range note {
				if k != "filePath" {
					converted[k] = v
				}
			}
			result[i] = converted
		} else {
			result[i] = note
		}
	}
	return result
}

// convertRenamePathData converts event data from "oldFilePath"/"newFilePath" format to "oldFolder"/"oldNote"/"newFolder"/"newNote" format.
func convertRenamePathData(data []map[string]string) []map[string]string {
	result := make([]map[string]string, len(data))
	for i, note := range data {
		if _, hasOldFolder := note["oldFolder"]; hasOldFolder {
			result[i] = note
			continue
		}
		oldFilePath, hasOld := note["oldFilePath"]
		newFilePath, hasNew := note["newFilePath"]
		if hasOld && hasNew {
			converted := map[string]string{
				"oldFolder": filepath.Dir(oldFilePath),
				"oldNote":   filepath.Base(oldFilePath),
				"newFolder": filepath.Dir(newFilePath),
				"newNote":   filepath.Base(newFilePath),
			}
			for k, v := range note {
				if k != "oldFilePath" && k != "newFilePath" {
					converted[k] = v
				}
			}
			result[i] = converted
		} else {
			result[i] = note
		}
	}
	return result
}

// addCreatedNotesToIndex adds newly created notes to the search index in a batch operation.
// It expects a slice of note data, each containing folder and note keys.
// This function includes retry logic to handle race conditions where the file may not be
// immediately available after the create event is fired.
func addCreatedNotesToIndex(params EventParams, data []map[string]string) {
	batch := (*params.Index).NewBatch()

	for _, note := range data {
		folder, ok := note["folder"]
		if !ok {
			log.Println("Note created event data missing folder")
			return
		}
		noteName, ok := note["note"]
		if !ok {
			log.Println("Note created event data missing note")
			return
		}

		notePath := filepath.Join(folder, noteName)
		filePath := filepath.Join(params.ProjectPath, "notes", notePath)

		// Retry logic to handle race condition where file might not be immediately available
		err := util.RetryWithExponentialBackoff(
			func() error {
				if filepath.Ext(noteName) == ".md" {
					_, err := search.AddMarkdownNoteToBatch(
						batch,
						*params.Index,
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
						*params.Index,
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

	err := (*params.Index).Batch(batch)
	if err != nil {
		log.Println("Error indexing batch", err)
	}
}

// handleFileRenameEvent handles the event when a file is renamed.
// It extracts the rename data from the event, updates the search index,
// and replaces local links in other notes that reference the renamed file.
func handleFileRenameEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]map[string]string)
	if !ok {
		log.Println("File rename event data is not a map")
		return
	}

	for _, item := range data {
		oldFilePath, hasOld := item["oldFilePath"]
		newFilePath, hasNew := item["newFilePath"]
		if !hasOld || !hasNew {
			continue
		}
		if err := config.RenamePinnedFile(params.ProjectPath, oldFilePath, newFilePath); err != nil {
			log.Printf("Error updating pinned notes for file rename %s -> %s: %v", oldFilePath, newFilePath, err)
		}
	}

	converted := convertRenamePathData(data)
	renameFilesInIndex(params, converted)
	replaceLocalLinksInNotes(params, converted)
}

// renameFilesInIndex updates the search index to reflect renamed files.
// It deletes the old entry and adds the new entry.
func renameFilesInIndex(params EventParams, data []map[string]string) {
	batch := (*params.Index).NewBatch()

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

		oldNotePath := filepath.Join(oldFolder, oldNoteName)
		newNotePath := filepath.Join(newFolder, newNoteName)

		batch.Delete(oldNotePath)

		newFilePath := filepath.Join(params.ProjectPath, "notes", newNotePath)
		if filepath.Ext(newNoteName) == ".md" {
			_, err := search.AddMarkdownNoteToBatch(
				batch,
				*params.Index,
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
				*params.Index,
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

	err := (*params.Index).Batch(batch)
	if err != nil {
		log.Println("Error batching rename operations", err)
	}
}

// handleFileDeleteEvent handles the event when a file is deleted.
// It removes the note from the search index and cleans up any attachment tag associations.
func handleFileDeleteEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]map[string]string)
	if !ok {
		log.Println("File delete event data is not a map")
		return
	}

	for _, item := range data {
		filePath, ok := item["filePath"]
		if !ok {
			continue
		}
		if err := config.DeletePinnedFile(params.ProjectPath, filePath); err != nil {
			log.Printf("Error updating pinned notes for file delete %s: %v", filePath, err)
		}
	}

	deleteNotesFromIndex(params, convertFilePathData(data))
}

// deleteNotesFromIndex removes notes from the search index in a batch operation.
// It expects a slice of note data, each containing folder and note keys.
func deleteNotesFromIndex(params EventParams, data []map[string]string) {
	batch := (*params.Index).NewBatch()

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

		notePath := filepath.Join(folder, noteName)
		batch.Delete(notePath)

		if filepath.Ext(noteName) != ".md" {
			if err := notes.DeleteAttachmentSidecar(params.ProjectPath, folder, noteName); err != nil {
				log.Println("Error deleting attachment sidecar", err)
			}
		}
	}

	// Execute the batch
	err := (*params.Index).Batch(batch)
	if err != nil {
		log.Println("Error batching delete operations", err)
	}
}

// handleFileWriteEvent handles the event when a file is written/updated.
// It extracts the file data from the event and updates the search index with the new content.
func handleFileWriteEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]map[string]string)
	if !ok {
		log.Println("File write event data is not a map")
		return
	}
	updateNotesInIndex(params, convertFilePathData(data))
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

		notePath := filepath.Join(folder, noteName)
		noteFilePath := filepath.Join(params.ProjectPath, "notes", notePath)

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

		err = (*params.Index).Index(notePath, bleveMarkdownDocument)
		if err != nil {
			log.Printf("Error indexing note %s: %v", notePath, err)
		}
	}
}
