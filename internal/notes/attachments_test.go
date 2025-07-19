package notes

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestGetNotesForAttachment(t *testing.T) {
	// Create a temporary directory for testing
	tmpDir, err := os.MkdirTemp("", "bytebook_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Setup test directory structure
	notesDir := filepath.Join(tmpDir, "notes")
	testFolder := "test-folder"
	folderPath := filepath.Join(notesDir, testFolder)

	err = os.MkdirAll(folderPath, 0755)
	if err != nil {
		t.Fatalf("Failed to create test folder: %v", err)
	}

	t.Run("successful attachment retrieval", func(t *testing.T) {
		// Create test .attachments.json
		attachmentsData := AttachmentToNotesArray{
			Attachments: map[string][]string{
				"image1.png": {"note1.md", "note2.md"},
				"doc1.pdf":   {"note3.md"},
				"empty.txt":  {},
			},
		}

		attachmentsPath := filepath.Join(folderPath, ".attachments.json")
		data, err := json.Marshal(attachmentsData)
		if err != nil {
			t.Fatalf("Failed to marshal test data: %v", err)
		}

		err = os.WriteFile(attachmentsPath, data, 0644)
		if err != nil {
			t.Fatalf("Failed to write test file: %v", err)
		}

		// Test retrieving existing attachment with multiple notes
		notes, err := GetNotesForAttachment(tmpDir, testFolder, "image1.png")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}

		expected := []string{"note1.md", "note2.md"}
		if len(notes) != len(expected) {
			t.Errorf("Expected %d notes, got %d", len(expected), len(notes))
		}

		for i, note := range expected {
			if i >= len(notes) || notes[i] != note {
				t.Errorf("Expected note %s at index %d, got %s", note, i, notes[i])
			}
		}

		// Test retrieving existing attachment with single note
		notes, err = GetNotesForAttachment(tmpDir, testFolder, "doc1.pdf")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}

		if len(notes) != 1 || notes[0] != "note3.md" {
			t.Errorf("Expected ['note3.md'], got %v", notes)
		}

		// Test retrieving existing attachment with empty array
		notes, err = GetNotesForAttachment(tmpDir, testFolder, "empty.txt")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}

		if len(notes) != 0 {
			t.Errorf("Expected empty array, got %v", notes)
		}
	})

	t.Run("attachment not found", func(t *testing.T) {
		notes, err := GetNotesForAttachment(tmpDir, testFolder, "nonexistent.jpg")
		if err == nil {
			t.Error("Expected error for nonexistent attachment, got nil")
		}

		if notes != nil {
			t.Errorf("Expected nil notes for nonexistent attachment, got %v", notes)
		}

		expectedErrorMsg := "attachment nonexistent.jpg not found"
		if err.Error() != expectedErrorMsg {
			t.Errorf("Expected error message '%s', got '%s'", expectedErrorMsg, err.Error())
		}
	})

	t.Run("file creation when .attachments.json doesn't exist", func(t *testing.T) {
		// Create a new folder without .attachments.json
		newTestFolder := "new-test-folder"
		newFolderPath := filepath.Join(notesDir, newTestFolder)

		err := os.MkdirAll(newFolderPath, 0755)
		if err != nil {
			t.Fatalf("Failed to create new test folder: %v", err)
		}

		// This should create a new .attachments.json file and return error for nonexistent attachment
		notes, err := GetNotesForAttachment(tmpDir, newTestFolder, "some-attachment.png")
		if err == nil {
			t.Error("Expected error for nonexistent attachment in new file, got nil")
		}

		if notes != nil {
			t.Errorf("Expected nil notes, got %v", notes)
		}

		// Verify that .attachments.json was created
		attachmentsPath := filepath.Join(newFolderPath, ".attachments.json")
		if _, err := os.Stat(attachmentsPath); os.IsNotExist(err) {
			t.Error("Expected .attachments.json to be created, but it doesn't exist")
		}

		// Verify the created file has the correct structure
		var createdData AttachmentToNotesArray
		data, err := os.ReadFile(attachmentsPath)
		if err != nil {
			t.Fatalf("Failed to read created .attachments.json: %v", err)
		}

		err = json.Unmarshal(data, &createdData)
		if err != nil {
			t.Fatalf("Failed to unmarshal created .attachments.json: %v", err)
		}

		if createdData.Attachments == nil {
			t.Error("Expected attachments map to be initialized, got nil")
		}

		if len(createdData.Attachments) != 0 {
			t.Errorf("Expected empty attachments map, got %v", createdData.Attachments)
		}
	})

	t.Run("invalid folder path", func(t *testing.T) {
		// Test with non-existent project path
		notes, err := GetNotesForAttachment("/nonexistent/path", testFolder, "image1.png")
		if err == nil {
			t.Error("Expected error for invalid project path, got nil")
		}

		if notes != nil {
			t.Errorf("Expected nil notes for invalid path, got %v", notes)
		}
	})

	t.Run("empty parameters", func(t *testing.T) {
		// Test with empty attachment name
		notes, err := GetNotesForAttachment(tmpDir, testFolder, "")
		if err == nil {
			t.Error("Expected error for empty attachment name, got nil")
		}

		if notes != nil {
			t.Errorf("Expected nil notes for empty attachment name, got %v", notes)
		}
	})
}

func TestAddNoteToAttachment(t *testing.T) {
	// Create a temporary directory for testing
	tmpDir, err := os.MkdirTemp("", "bytebook_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Setup test directory structure
	notesDir := filepath.Join(tmpDir, "notes")
	testFolder := "test-folder"
	folderPath := filepath.Join(notesDir, testFolder)

	err = os.MkdirAll(folderPath, 0755)
	if err != nil {
		t.Fatalf("Failed to create test folder: %v", err)
	}

	t.Run("add note to new attachment", func(t *testing.T) {
		// Add a note to a new attachment
		err := AddNoteToAttachment(tmpDir, testFolder, "new-image.jpg", "test-note.md")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}

		// Verify the note was added
		notes, err := GetNotesForAttachment(tmpDir, testFolder, "new-image.jpg")
		if err != nil {
			t.Errorf("Expected no error when retrieving notes, got: %v", err)
		}

		if len(notes) != 1 || notes[0] != "test-note.md" {
			t.Errorf("Expected ['test-note.md'], got %v", notes)
		}
	})

	t.Run("add note to existing attachment", func(t *testing.T) {
		// First, add a note
		err := AddNoteToAttachment(tmpDir, testFolder, "existing-image.png", "first-note.md")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}

		// Add another note to the same attachment
		err = AddNoteToAttachment(tmpDir, testFolder, "existing-image.png", "second-note.md")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}

		// Verify both notes are present
		notes, err := GetNotesForAttachment(tmpDir, testFolder, "existing-image.png")
		if err != nil {
			t.Errorf("Expected no error when retrieving notes, got: %v", err)
		}

		if len(notes) != 2 {
			t.Errorf("Expected 2 notes, got %d", len(notes))
		}

		expectedNotes := []string{"first-note.md", "second-note.md"}
		for _, expected := range expectedNotes {
			found := false
			for _, actual := range notes {
				if actual == expected {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("Expected to find note %s in %v", expected, notes)
			}
		}
	})

	t.Run("add duplicate note", func(t *testing.T) {
		// Add a note
		err := AddNoteToAttachment(tmpDir, testFolder, "duplicate-test.pdf", "duplicate-note.md")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}

		// Try to add the same note again
		err = AddNoteToAttachment(tmpDir, testFolder, "duplicate-test.pdf", "duplicate-note.md")
		if err != nil {
			t.Errorf("Expected no error when adding duplicate, got: %v", err)
		}

		// Verify only one note exists
		notes, err := GetNotesForAttachment(tmpDir, testFolder, "duplicate-test.pdf")
		if err != nil {
			t.Errorf("Expected no error when retrieving notes, got: %v", err)
		}

		if len(notes) != 1 || notes[0] != "duplicate-note.md" {
			t.Errorf("Expected ['duplicate-note.md'], got %v", notes)
		}
	})

	t.Run("invalid folder path", func(t *testing.T) {
		err := AddNoteToAttachment("/nonexistent/path", testFolder, "image.jpg", "note.md")
		if err == nil {
			t.Error("Expected error for invalid project path, got nil")
		}
	})
}

func TestRemoveNoteFromAttachment(t *testing.T) {
	// Create a temporary directory for testing
	tmpDir, err := os.MkdirTemp("", "bytebook_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Setup test directory structure
	notesDir := filepath.Join(tmpDir, "notes")
	testFolder := "test-folder"
	folderPath := filepath.Join(notesDir, testFolder)

	err = os.MkdirAll(folderPath, 0755)
	if err != nil {
		t.Fatalf("Failed to create test folder: %v", err)
	}

	t.Run("remove note from attachment with multiple notes", func(t *testing.T) {
		// Setup: Add multiple notes to an attachment
		err := AddNoteToAttachment(tmpDir, testFolder, "multi-note.jpg", "note1.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}
		err = AddNoteToAttachment(tmpDir, testFolder, "multi-note.jpg", "note2.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}
		err = AddNoteToAttachment(tmpDir, testFolder, "multi-note.jpg", "note3.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}

		// Remove one note
		err = RemoveNoteFromAttachment(tmpDir, testFolder, "multi-note.jpg", "note2.md")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}

		// Verify the note was removed and others remain
		notes, err := GetNotesForAttachment(tmpDir, testFolder, "multi-note.jpg")
		if err != nil {
			t.Errorf("Expected no error when retrieving notes, got: %v", err)
		}

		if len(notes) != 2 {
			t.Errorf("Expected 2 notes remaining, got %d", len(notes))
		}

		for _, note := range notes {
			if note == "note2.md" {
				t.Errorf("Note 'note2.md' should have been removed but was found in %v", notes)
			}
		}
	})

	t.Run("remove last note removes attachment entirely", func(t *testing.T) {
		// Setup: Add a single note to an attachment
		err := AddNoteToAttachment(tmpDir, testFolder, "single-note.png", "only-note.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}

		// Remove the only note
		err = RemoveNoteFromAttachment(tmpDir, testFolder, "single-note.png", "only-note.md")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}

		// Verify the attachment no longer exists
		notes, err := GetNotesForAttachment(tmpDir, testFolder, "single-note.png")
		if err == nil {
			t.Error("Expected error for removed attachment, got nil")
		}

		if notes != nil {
			t.Errorf("Expected nil notes for removed attachment, got %v", notes)
		}

		expectedErrorMsg := "attachment single-note.png not found"
		if err.Error() != expectedErrorMsg {
			t.Errorf("Expected error message '%s', got '%s'", expectedErrorMsg, err.Error())
		}
	})

	t.Run("remove note from nonexistent attachment", func(t *testing.T) {
		// This should not cause an error
		err := RemoveNoteFromAttachment(tmpDir, testFolder, "nonexistent.pdf", "some-note.md")
		if err != nil {
			t.Errorf("Expected no error for removing from nonexistent attachment, got: %v", err)
		}
	})

	t.Run("remove nonexistent note from existing attachment", func(t *testing.T) {
		// Setup: Add a note to an attachment
		err := AddNoteToAttachment(tmpDir, testFolder, "existing-attachment.gif", "existing-note.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}

		// Try to remove a note that doesn't exist
		err = RemoveNoteFromAttachment(tmpDir, testFolder, "existing-attachment.gif", "nonexistent-note.md")
		if err != nil {
			t.Errorf("Expected no error for removing nonexistent note, got: %v", err)
		}

		// Verify the existing note is still there
		notes, err := GetNotesForAttachment(tmpDir, testFolder, "existing-attachment.gif")
		if err != nil {
			t.Errorf("Expected no error when retrieving notes, got: %v", err)
		}

		if len(notes) != 1 || notes[0] != "existing-note.md" {
			t.Errorf("Expected ['existing-note.md'], got %v", notes)
		}
	})

	t.Run("invalid folder path", func(t *testing.T) {
		err := RemoveNoteFromAttachment("/nonexistent/path", testFolder, "image.jpg", "note.md")
		if err == nil {
			t.Error("Expected error for invalid project path, got nil")
		}
	})
}

func TestUpdateAttachmentName(t *testing.T) {
	// Create a temporary directory for testing
	tmpDir, err := os.MkdirTemp("", "bytebook_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Setup test directory structure
	notesDir := filepath.Join(tmpDir, "notes")
	testFolder := "test-folder"
	folderPath := filepath.Join(notesDir, testFolder)

	err = os.MkdirAll(folderPath, 0755)
	if err != nil {
		t.Fatalf("Failed to create test folder: %v", err)
	}

	t.Run("rename attachment successfully", func(t *testing.T) {
		// Setup: Add notes to an attachment
		err := AddNoteToAttachment(tmpDir, testFolder, "old-name.jpg", "note1.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}
		err = AddNoteToAttachment(tmpDir, testFolder, "old-name.jpg", "note2.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}

		// Rename the attachment
		err = UpdateAttachmentName(tmpDir, testFolder, "old-name.jpg", "new-name.jpg")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}

		// Verify the old name no longer exists
		notes, err := GetNotesForAttachment(tmpDir, testFolder, "old-name.jpg")
		if err == nil {
			t.Error("Expected error for old attachment name, got nil")
		}

		// Verify the new name exists with the same notes
		notes, err = GetNotesForAttachment(tmpDir, testFolder, "new-name.jpg")
		if err != nil {
			t.Errorf("Expected no error for new attachment name, got: %v", err)
		}

		if len(notes) != 2 {
			t.Errorf("Expected 2 notes, got %d", len(notes))
		}

		expectedNotes := []string{"note1.md", "note2.md"}
		for _, expected := range expectedNotes {
			found := false
			for _, actual := range notes {
				if actual == expected {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("Expected to find note %s in %v", expected, notes)
			}
		}
	})

	t.Run("rename to existing attachment merges notes", func(t *testing.T) {
		// Setup: Create two attachments with different notes
		err := AddNoteToAttachment(tmpDir, testFolder, "source.png", "source-note1.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}
		err = AddNoteToAttachment(tmpDir, testFolder, "source.png", "source-note2.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}

		err = AddNoteToAttachment(tmpDir, testFolder, "target.png", "target-note1.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}

		// Rename source to target (should merge)
		err = UpdateAttachmentName(tmpDir, testFolder, "source.png", "target.png")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}

		// Verify source no longer exists
		notes, err := GetNotesForAttachment(tmpDir, testFolder, "source.png")
		if err == nil {
			t.Error("Expected error for source attachment name, got nil")
		}

		// Verify target has all notes merged
		notes, err = GetNotesForAttachment(tmpDir, testFolder, "target.png")
		if err != nil {
			t.Errorf("Expected no error for target attachment name, got: %v", err)
		}

		if len(notes) != 3 {
			t.Errorf("Expected 3 notes after merge, got %d", len(notes))
		}

		expectedNotes := []string{"target-note1.md", "source-note1.md", "source-note2.md"}
		for _, expected := range expectedNotes {
			found := false
			for _, actual := range notes {
				if actual == expected {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("Expected to find note %s in %v", expected, notes)
			}
		}
	})

	t.Run("rename to existing attachment removes duplicates", func(t *testing.T) {
		// Setup: Create two attachments with overlapping notes
		err := AddNoteToAttachment(tmpDir, testFolder, "dup-source.gif", "shared-note.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}
		err = AddNoteToAttachment(tmpDir, testFolder, "dup-source.gif", "unique-source.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}

		err = AddNoteToAttachment(tmpDir, testFolder, "dup-target.gif", "shared-note.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}
		err = AddNoteToAttachment(tmpDir, testFolder, "dup-target.gif", "unique-target.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}

		// Rename source to target (should merge and deduplicate)
		err = UpdateAttachmentName(tmpDir, testFolder, "dup-source.gif", "dup-target.gif")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}

		// Verify target has all unique notes
		notes, err := GetNotesForAttachment(tmpDir, testFolder, "dup-target.gif")
		if err != nil {
			t.Errorf("Expected no error for target attachment name, got: %v", err)
		}

		if len(notes) != 3 {
			t.Errorf("Expected 3 unique notes after merge, got %d", len(notes))
		}

		expectedNotes := []string{"shared-note.md", "unique-target.md", "unique-source.md"}
		for _, expected := range expectedNotes {
			found := false
			for _, actual := range notes {
				if actual == expected {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("Expected to find note %s in %v", expected, notes)
			}
		}
	})

	t.Run("rename nonexistent attachment", func(t *testing.T) {
		err := UpdateAttachmentName(tmpDir, testFolder, "nonexistent.pdf", "new-name.pdf")
		if err == nil {
			t.Error("Expected error for nonexistent attachment, got nil")
		}

		expectedErrorMsg := "attachment nonexistent.pdf not found"
		if err.Error() != expectedErrorMsg {
			t.Errorf("Expected error message '%s', got '%s'", expectedErrorMsg, err.Error())
		}
	})

	t.Run("invalid folder path", func(t *testing.T) {
		err := UpdateAttachmentName("/nonexistent/path", testFolder, "old.jpg", "new.jpg")
		if err == nil {
			t.Error("Expected error for invalid project path, got nil")
		}
	})
}
