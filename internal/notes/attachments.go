package notes

import (
	"fmt"
	"path/filepath"
	"slices"

	"github.com/etesam913/bytebook/internal/util"
)

type AttachmentToNotesArray struct {
	Attachments map[string][]string `json:"attachments"`
}

// GetNotesForAttachment returns note names linked to an attachment from attachments.json in the specified folder.
// Returns an error if the attachment is not found or reading fails.
func GetNotesForAttachment(projectPath, folderName, attachmentName string) ([]string, error) {
	attachmentPath := filepath.Join(projectPath, "notes", folderName, "attachments.json")
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

// AddNoteToAttachment adds a note to an attachment's note list in attachments.json.
// If the attachment doesn't exist, it creates a new entry. Returns an error if the operation fails.
func AddNoteToAttachment(projectPath, folderName, attachmentName, noteName string) error {
	attachmentPath := filepath.Join(projectPath, "notes", folderName, "attachments.json")
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
	if slices.Contains(notes, noteName) {
		return nil // Note already exists, no need to add
	}

	// Add the note
	attachmentToNotesArray.Attachments[attachmentName] = append(notes, noteName)

	return util.WriteJsonToPath(attachmentPath, attachmentToNotesArray)
}

// RemoveNoteFromAttachment removes a note from an attachment's note list in attachments.json.
// If the attachment has no notes left after removal, the attachment entry is deleted.
// Returns an error if the operation fails.
func RemoveNoteFromAttachment(projectPath, folderName, attachmentName, noteName string) error {
	attachmentPath := filepath.Join(projectPath, "notes", folderName, "attachments.json")
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
		return note != noteName
	})

	// If no notes are left, remove the attachment entirely
	if len(filteredNotes) == 0 {
		delete(attachmentToNotesArray.Attachments, attachmentName)
	} else {
		attachmentToNotesArray.Attachments[attachmentName] = filteredNotes
	}

	return util.WriteJsonToPath(attachmentPath, attachmentToNotesArray)
}

// UpdateAttachmentName renames an attachment in attachments.json by updating the key.
// All notes associated with the old attachment name will be moved to the new name.
// Returns an error if the old attachment doesn't exist or the operation fails.
func UpdateAttachmentName(projectPath, folderName, oldAttachmentName, newAttachmentName string) error {
	attachmentPath := filepath.Join(projectPath, "notes", folderName, "attachments.json")
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
