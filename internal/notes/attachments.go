package notes

import (
	"fmt"
	"path/filepath"
	"slices"
	"strings"

	"github.com/etesam913/bytebook/internal/util"
)

type AttachmentToNotesArray struct {
	Attachments map[string][]string `json:"attachments"`
}

// GetNotesForAttachment returns note names linked to an attachment from .attachments.json in the specified folder.
// Returns an error if the attachment is not found or reading fails.
func GetNotesForAttachment(projectPath, folderOfAttachment, attachmentName string) ([]string, error) {
	attachmentPath := filepath.Join(projectPath, "notes", folderOfAttachment, ".attachments.json")
	attachmentToNotesArray, err := util.ReadOrCreateJSON(
		attachmentPath, AttachmentToNotesArray{
			Attachments: map[string][]string{},
		},
	)
	if err != nil {
		return nil, err
	}

	notes, ok := attachmentToNotesArray.Attachments[attachmentName]
	if !ok {
		return nil, fmt.Errorf("attachment %s not found", attachmentName)
	}
	return notes, nil
}

// AddNoteToAttachment adds a note to an attachment's note list in .attachments.json.
// If the attachment doesn't exist, it creates a new entry. Returns an error if the operation fails.
func AddNoteToAttachment(projectPath, folderOfAttachment, attachmentName, folderAndNoteNameToAdd string) error {
	// Parse folder and note name from the combined parameter
	parts := strings.Split(folderAndNoteNameToAdd, "/")
	if len(parts) != 2 {
		return fmt.Errorf("folderAndNoteName must be in format 'folder/noteName', got: %s", folderAndNoteNameToAdd)
	}
	attachmentPath := filepath.Join(projectPath, "notes", folderOfAttachment, ".attachments.json")
	attachmentToNotesArray, err := util.ReadOrCreateJSON(
		attachmentPath, AttachmentToNotesArray{
			Attachments: map[string][]string{},
		},
	)
	if err != nil {
		return err
	}

	// Get existing notes or create empty slice
	notes := attachmentToNotesArray.Attachments[attachmentName]

	// Check if note already exists to avoid duplicates
	if slices.Contains(notes, folderAndNoteNameToAdd) {
		return nil // Note already exists, no need to add
	}

	// Add the note
	attachmentToNotesArray.Attachments[attachmentName] = append(notes, folderAndNoteNameToAdd)

	return util.WriteJsonToPath(attachmentPath, attachmentToNotesArray)
}

// RemoveNoteFromAttachment removes a note from an attachment's note list in .attachments.json.
// If the attachment has no notes left after removal, the attachment entry is deleted.
// Returns an error if the operation fails.
func RemoveNoteFromAttachment(projectPath, folderName, attachmentName, folderAndNoteName string) error {
	// Parse folder and note name from the combined parameter
	parts := strings.Split(folderAndNoteName, "/")
	if len(parts) != 2 {
		return fmt.Errorf("folderAndNoteName must be in format 'folder/noteName', got: %s", folderAndNoteName)
	}

	attachmentPath := filepath.Join(projectPath, "notes", folderName, ".attachments.json")
	attachmentToNotesArray, err := util.ReadOrCreateJSON(
		attachmentPath, AttachmentToNotesArray{
			Attachments: map[string][]string{},
		},
	)
	if err != nil {
		return err
	}

	notes, exists := attachmentToNotesArray.Attachments[attachmentName]
	if !exists {
		return nil // Attachment doesn't exist, nothing to remove
	}

	// Remove the note from the list
	filteredNotes := util.Filter(notes, func(note string) bool {
		return note != folderAndNoteName
	})

	// If no notes are left, remove the attachment entirely
	if len(filteredNotes) == 0 {
		delete(attachmentToNotesArray.Attachments, attachmentName)
	} else {
		attachmentToNotesArray.Attachments[attachmentName] = filteredNotes
	}

	return util.WriteJsonToPath(attachmentPath, attachmentToNotesArray)
}

// UpdateAttachmentName renames an attachment in .attachments.json by updating the key.
// All notes associated with the old attachment name will be moved to the new name.
// Returns an error if the old attachment doesn't exist or the operation fails.
func UpdateAttachmentName(projectPath, folderName, oldAttachmentName, newAttachmentName string) error {
	attachmentPath := filepath.Join(projectPath, "notes", folderName, ".attachments.json")
	attachmentToNotesArray, err := util.ReadOrCreateJSON(
		attachmentPath, AttachmentToNotesArray{
			Attachments: map[string][]string{},
		},
	)
	if err != nil {
		return err
	}

	notes, exists := attachmentToNotesArray.Attachments[oldAttachmentName]
	if !exists {
		return fmt.Errorf("attachment %s not found", oldAttachmentName)
	}

	// If new name already exists, merge the note lists
	if existingNotes, newExists := attachmentToNotesArray.Attachments[newAttachmentName]; newExists {
		// Merge and remove duplicates
		allNotes := append(existingNotes, notes...)
		attachmentToNotesArray.Attachments[newAttachmentName] = util.RemoveDuplicates(allNotes)
	} else {
		// Simply move the notes to the new name
		attachmentToNotesArray.Attachments[newAttachmentName] = notes
	}

	// Remove the old attachment entry
	delete(attachmentToNotesArray.Attachments, oldAttachmentName)

	return util.WriteJsonToPath(attachmentPath, attachmentToNotesArray)
}

// UpdateFolderNameInAttachments updates all attachment keys and note values that contain the old folder name with the new folder name.
// This handles both URL formats in keys:
// 1. http://localhost:5890/notes/oldFolder/file.ext
// 2. wails://localhost:5173/oldFolder/file?ext=md
// And note paths in values: oldFolder/noteName.md
func UpdateFolderNameInAttachments(projectPath, folderName, oldFolderName, newFolderName string) error {
	attachmentPath := filepath.Join(projectPath, "notes", folderName, ".attachments.json")
	attachmentToNotesArray, err := util.ReadOrCreateJSON(
		attachmentPath, AttachmentToNotesArray{
			Attachments: map[string][]string{},
		},
	)
	if err != nil {
		return err
	}

	updatedAttachments := make(map[string][]string)

	for attachmentKey, notes := range attachmentToNotesArray.Attachments {
		newKey := attachmentKey

		// Handle http://localhost:5890/notes/folderName/ format
		httpPrefix := "http://localhost:5890/notes/"
		if remainder, found := strings.CutPrefix(attachmentKey, httpPrefix); found {
			if pathAfterFolder, found := strings.CutPrefix(remainder, oldFolderName+"/"); found {
				newKey = httpPrefix + newFolderName + "/" + pathAfterFolder
			}
		}

		// Handle wails://localhost:5173/folderName/ format
		wailsPrefix := "wails://localhost:5173/"
		if remainder, found := strings.CutPrefix(attachmentKey, wailsPrefix); found {
			if pathAfterFolder, found := strings.CutPrefix(remainder, oldFolderName+"/"); found {
				newKey = wailsPrefix + newFolderName + "/" + pathAfterFolder
			}
		}

		// Update folder names in note paths (values)
		updatedNotes := make([]string, len(notes))
		for i, note := range notes {
			if pathAfterFolder, found := strings.CutPrefix(note, oldFolderName+"/"); found {
				updatedNotes[i] = newFolderName + "/" + pathAfterFolder
			} else {
				updatedNotes[i] = note
			}
		}

		updatedAttachments[newKey] = updatedNotes
	}

	attachmentToNotesArray.Attachments = updatedAttachments
	return util.WriteJsonToPath(attachmentPath, attachmentToNotesArray)
}
