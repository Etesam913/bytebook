package events

import (
	"log"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// Re-indexes all the notes that have updated tags.
// The tags are added to the index as a new document with the same id.
func handleTagsUpdateEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.(util.TagsUpdateEventData)
	if !ok {
		log.Println("Tags update event data is not a TagsUpdateEventData")
		return
	}

	var folderAndNoteNames []string
	for folderAndNoteName := range data {
		folderAndNoteNames = append(folderAndNoteNames, folderAndNoteName)
	}

	reIndexNotesWithUpdatedTags(params, folderAndNoteNames)
}

// reIndexNotesWithUpdatedTags re-indexes multiple notes with updated tags.
func reIndexNotesWithUpdatedTags(
	params EventParams,
	folderAndNoteNames []string,
) {
	batch := params.Index.NewBatch()

	for _, folderAndNoteName := range folderAndNoteNames {
		filePath := filepath.Join(params.ProjectPath, "notes", folderAndNoteName)

		// Extract folder and filename from the path
		folder := filepath.Dir(folderAndNoteName)
		if folder == "." {
			folder = ""
		}
		fileName := filepath.Base(folderAndNoteName)

		// Check file extension to determine how to index
		if filepath.Ext(fileName) == ".md" {
			_, err := search.AddMarkdownNoteToBatch(
				batch,
				params.Index,
				filePath,
				folder,
				fileName,
				true,
			)

			if err != nil {
				log.Printf("Error adding markdown note %s to batch: %v", folderAndNoteName, err)
			}
		} else {
			// Handle non-markdown files as attachments
			fileExtension := filepath.Ext(fileName)
			_, err := search.AddAttachmentToBatch(
				batch,
				params.Index,
				params.ProjectPath,
				folder,
				fileName,
				fileExtension,
				true,
			)

			if err != nil {
				log.Printf("Error adding attachment %s to batch: %v", folderAndNoteName, err)
			}
		}
	}

	// Execute the batch
	err := params.Index.Batch(batch)
	if err != nil {
		log.Println("Error batching tags update operations", err)
	}
	app := application.Get()
	if app != nil {
		app.Event.EmitEvent(&application.CustomEvent{
			Name: util.Events.TagsIndexUpdate,
		})
	}
}
