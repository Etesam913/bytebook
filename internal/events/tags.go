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

	// Update .attachments_to_tags.json for non-markdown files
	if err := updateAttachmentsToTags(params.ProjectPath, folderAndNoteNames, data); err != nil {
		log.Printf("Error updating .attachments_to_tags.json: %v", err)
	}

	reIndexNotesWithUpdatedTags(params, folderAndNoteNames)
}

type AttachmentsToTags map[string][]string

// updateAttachmentsToTags updates the .attachments_to_tags.json file with attachment files and their tags.
// This function tracks non-markdown files and associates them with their tags for search purposes.
func updateAttachmentsToTags(projectPath string, folderAndNoteNames []string, tagsData util.TagsUpdateEventData) error {
	// Define the structure for .attachments_to_tags.json

	// Group attachments by folder to create separate .attachments_to_tags.json files in each folder
	folderAttachments := make(map[string]AttachmentsToTags)

	// Process each file and group by folder
	for _, folderAndNoteName := range folderAndNoteNames {
		fileName := filepath.Base(folderAndNoteName)

		// Only process non-markdown files
		if filepath.Ext(fileName) != ".md" {
			// Extract folder from the path
			folder := filepath.Dir(folderAndNoteName)
			if folder == "." {
				folder = ""
			}

			// Get tags for this file from the event data
			if tags, exists := tagsData[folderAndNoteName]; exists {
				if folderAttachments[folder] == nil {
					folderAttachments[folder] = make(AttachmentsToTags)
				}
				folderAttachments[folder][fileName] = tags
			}
		}
	}

	// Create/update .attachments_to_tags.json in each folder that has attachments
	for folder, attachments := range folderAttachments {
		folderPath := filepath.Join(projectPath, "notes", folder)
		attachmentsToTagsPath := filepath.Join(folderPath, ".attachments_to_tags.json")

		// Try to read existing data or create new if it doesn't exist
		var existingAttachments AttachmentsToTags
		_, err := util.ReadOrCreateJSON(attachmentsToTagsPath, AttachmentsToTags{})
		if err != nil {
			return err
		}

		// Read the existing data
		if err := util.ReadJsonFromPath(attachmentsToTagsPath, &existingAttachments); err != nil {
			return err
		}

		// Merge existing data with new data
		for fileName, tags := range attachments {
			existingAttachments[fileName] = tags
		}

		// Write the updated data back to the file
		if err := util.WriteJsonToPath(attachmentsToTagsPath, existingAttachments); err != nil {
			return err
		}
	}

	return nil
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
				params.ProjectPath,
				batch,
				params.Index,
				folder,
				fileName,
				fileExtension,
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

}
