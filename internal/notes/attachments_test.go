package notes

import (
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
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
		err := AddNoteToAttachment(tmpDir, testFolder, "new-image.jpg", "test-folder/test-note.md")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}

		// Verify the note was added
		notes, err := GetNotesForAttachment(tmpDir, testFolder, "new-image.jpg")
		if err != nil {
			t.Errorf("Expected no error when retrieving notes, got: %v", err)
		}

		if len(notes) != 1 || notes[0] != "test-folder/test-note.md" {
			t.Errorf("Expected ['test-folder/test-note.md'], got %v", notes)
		}
	})

	t.Run("add note to existing attachment", func(t *testing.T) {
		// First, add a note
		err := AddNoteToAttachment(tmpDir, testFolder, "existing-image.png", "test-folder/first-note.md")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}

		// Add another note to the same attachment
		err = AddNoteToAttachment(tmpDir, testFolder, "existing-image.png", "test-folder/second-note.md")
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

		expectedNotes := []string{"test-folder/first-note.md", "test-folder/second-note.md"}
		for _, expected := range expectedNotes {
			found := slices.Contains(notes, expected)
			if !found {
				t.Errorf("Expected to find note %s in %v", expected, notes)
			}
		}
	})

	t.Run("add duplicate note", func(t *testing.T) {
		// Add a note
		err := AddNoteToAttachment(tmpDir, testFolder, "duplicate-test.pdf", "test-folder/duplicate-note.md")
		if err != nil {
			t.Errorf("Expected no error, got: %v", err)
		}

		// Try to add the same note again
		err = AddNoteToAttachment(tmpDir, testFolder, "duplicate-test.pdf", "test-folder/duplicate-note.md")
		if err != nil {
			t.Errorf("Expected no error when adding duplicate, got: %v", err)
		}

		// Verify only one note exists
		notes, err := GetNotesForAttachment(tmpDir, testFolder, "duplicate-test.pdf")
		if err != nil {
			t.Errorf("Expected no error when retrieving notes, got: %v", err)
		}

		if len(notes) != 1 || notes[0] != "test-folder/duplicate-note.md" {
			t.Errorf("Expected ['test-folder/duplicate-note.md'], got %v", notes)
		}
	})

	t.Run("invalid folder path", func(t *testing.T) {
		err := AddNoteToAttachment("/nonexistent/path", testFolder, "image.jpg", "test-folder/note.md")
		if err == nil {
			t.Error("Expected error for invalid project path, got nil")
		}
	})

	t.Run("invalid folderAndNoteName format - no slash", func(t *testing.T) {
		err := AddNoteToAttachment(tmpDir, testFolder, "image.jpg", "invalid-format")
		if err == nil {
			t.Error("Expected error for invalid folderAndNoteName format, got nil")
		}
		expectedError := "folderAndNoteName must be in format 'folder/noteName', got: invalid-format"
		if err.Error() != expectedError {
			t.Errorf("Expected error message '%s', got '%s'", expectedError, err.Error())
		}
	})

	t.Run("invalid folderAndNoteName format - too many slashes", func(t *testing.T) {
		err := AddNoteToAttachment(tmpDir, testFolder, "image.jpg", "folder/subfolder/note.md")
		if err == nil {
			t.Error("Expected error for invalid folderAndNoteName format, got nil")
		}
		expectedError := "folderAndNoteName must be in format 'folder/noteName', got: folder/subfolder/note.md"
		if err.Error() != expectedError {
			t.Errorf("Expected error message '%s', got '%s'", expectedError, err.Error())
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
		err := AddNoteToAttachment(tmpDir, testFolder, "multi-note.jpg", "test-folder/note1.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}
		err = AddNoteToAttachment(tmpDir, testFolder, "multi-note.jpg", "test-folder/note2.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}
		err = AddNoteToAttachment(tmpDir, testFolder, "multi-note.jpg", "test-folder/note3.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}

		// Remove one note
		err = RemoveNoteFromAttachment(tmpDir, testFolder, "multi-note.jpg", "test-folder/note2.md")
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
			if note == "test-folder/note2.md" {
				t.Errorf("Note 'test-folder/note2.md' should have been removed but was found in %v", notes)
			}
		}
	})

	t.Run("remove last note removes attachment entirely", func(t *testing.T) {
		// Setup: Add a single note to an attachment
		err := AddNoteToAttachment(tmpDir, testFolder, "single-note.png", "test-folder/only-note.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}

		// Remove the only note
		err = RemoveNoteFromAttachment(tmpDir, testFolder, "single-note.png", "test-folder/only-note.md")
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
		err := RemoveNoteFromAttachment(tmpDir, testFolder, "nonexistent.pdf", "test-folder/some-note.md")
		if err != nil {
			t.Errorf("Expected no error for removing from nonexistent attachment, got: %v", err)
		}
	})

	t.Run("remove nonexistent note from existing attachment", func(t *testing.T) {
		// Setup: Add a note to an attachment
		err := AddNoteToAttachment(tmpDir, testFolder, "existing-attachment.gif", "test-folder/existing-note.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}

		// Try to remove a note that doesn't exist
		err = RemoveNoteFromAttachment(tmpDir, testFolder, "existing-attachment.gif", "test-folder/nonexistent-note.md")
		if err != nil {
			t.Errorf("Expected no error for removing nonexistent note, got: %v", err)
		}

		// Verify the existing note is still there
		notes, err := GetNotesForAttachment(tmpDir, testFolder, "existing-attachment.gif")
		if err != nil {
			t.Errorf("Expected no error when retrieving notes, got: %v", err)
		}

		if len(notes) != 1 || notes[0] != "test-folder/existing-note.md" {
			t.Errorf("Expected ['test-folder/existing-note.md'], got %v", notes)
		}
	})

	t.Run("invalid folder path", func(t *testing.T) {
		err := RemoveNoteFromAttachment("/nonexistent/path", testFolder, "image.jpg", "test-folder/note.md")
		if err == nil {
			t.Error("Expected error for invalid project path, got nil")
		}
	})

	t.Run("invalid folderAndNoteName format - no slash", func(t *testing.T) {
		err := RemoveNoteFromAttachment(tmpDir, testFolder, "image.jpg", "invalid-format")
		if err == nil {
			t.Error("Expected error for invalid folderAndNoteName format, got nil")
		}
		expectedError := "folderAndNoteName must be in format 'folder/noteName', got: invalid-format"
		if err.Error() != expectedError {
			t.Errorf("Expected error message '%s', got '%s'", expectedError, err.Error())
		}
	})

	t.Run("invalid folderAndNoteName format - too many slashes", func(t *testing.T) {
		err := RemoveNoteFromAttachment(tmpDir, testFolder, "image.jpg", "folder/subfolder/note.md")
		if err == nil {
			t.Error("Expected error for invalid folderAndNoteName format, got nil")
		}
		expectedError := "folderAndNoteName must be in format 'folder/noteName', got: folder/subfolder/note.md"
		if err.Error() != expectedError {
			t.Errorf("Expected error message '%s', got '%s'", expectedError, err.Error())
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
		err := AddNoteToAttachment(tmpDir, testFolder, "old-name.jpg", "test-folder/note1.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}
		err = AddNoteToAttachment(tmpDir, testFolder, "old-name.jpg", "test-folder/note2.md")
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

		expectedNotes := []string{"test-folder/note1.md", "test-folder/note2.md"}
		for _, expected := range expectedNotes {
			found := slices.Contains(notes, expected)
			if !found {
				t.Errorf("Expected to find note %s in %v", expected, notes)
			}
		}
	})

	t.Run("rename to existing attachment merges notes", func(t *testing.T) {
		// Setup: Create two attachments with different notes
		err := AddNoteToAttachment(tmpDir, testFolder, "source.png", "test-folder/source-note1.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}
		err = AddNoteToAttachment(tmpDir, testFolder, "source.png", "test-folder/source-note2.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}

		err = AddNoteToAttachment(tmpDir, testFolder, "target.png", "test-folder/target-note1.md")
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

		expectedNotes := []string{"test-folder/target-note1.md", "test-folder/source-note1.md", "test-folder/source-note2.md"}
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
		err := AddNoteToAttachment(tmpDir, testFolder, "dup-source.gif", "test-folder/shared-note.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}
		err = AddNoteToAttachment(tmpDir, testFolder, "dup-source.gif", "test-folder/unique-source.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}

		err = AddNoteToAttachment(tmpDir, testFolder, "dup-target.gif", "test-folder/shared-note.md")
		if err != nil {
			t.Fatalf("Failed to setup test: %v", err)
		}
		err = AddNoteToAttachment(tmpDir, testFolder, "dup-target.gif", "test-folder/unique-target.md")
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

		expectedNotes := []string{"test-folder/shared-note.md", "test-folder/unique-target.md", "test-folder/unique-source.md"}
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

func TestUpdateFolderNameInAttachments(t *testing.T) {
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

	t.Run("update http URL format attachments", func(t *testing.T) {
		// Create test .attachments.json with http URLs
		attachmentsData := AttachmentToNotesArray{
			Attachments: map[string][]string{
				"http://localhost:5890/notes/old-folder/file1.jpg":   {"old-folder/note1.md", "folder2/note2.md"},
				"http://localhost:5890/notes/old-folder/file2.pdf":   {"old-folder/note3.md"},
				"http://localhost:5890/notes/other-folder/file3.png": {"folder1/note4.md"},
				"regular-file.txt": {"folder1/note5.md"},
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

		// Update folder name from "old-folder" to "new-folder"
		err = UpdateFolderNameInAttachments(tmpDir, testFolder, "old-folder", "new-folder")
		if err != nil {
			t.Fatalf("UpdateFolderNameInAttachments failed: %v", err)
		}

		// Read and verify the updated file
		updatedData, err := os.ReadFile(attachmentsPath)
		if err != nil {
			t.Fatalf("Failed to read updated file: %v", err)
		}

		var updatedAttachments AttachmentToNotesArray
		err = json.Unmarshal(updatedData, &updatedAttachments)
		if err != nil {
			t.Fatalf("Failed to unmarshal updated data: %v", err)
		}

		// Check that old-folder URLs were updated
		expectedKey1 := "http://localhost:5890/notes/new-folder/file1.jpg"
		expectedKey2 := "http://localhost:5890/notes/new-folder/file2.pdf"
		expectedKey3 := "http://localhost:5890/notes/other-folder/file3.png"
		expectedKey4 := "regular-file.txt"

		if notes, exists := updatedAttachments.Attachments[expectedKey1]; !exists {
			t.Errorf("Expected key '%s' not found", expectedKey1)
		} else {
			expectedNotes := []string{"new-folder/note1.md", "folder2/note2.md"}
			if !slices.Equal(notes, expectedNotes) {
				t.Errorf("Expected notes %v, got %v", expectedNotes, notes)
			}
		}

		if notes, exists := updatedAttachments.Attachments[expectedKey2]; !exists {
			t.Errorf("Expected key '%s' not found", expectedKey2)
		} else {
			expectedNotes := []string{"new-folder/note3.md"}
			if !slices.Equal(notes, expectedNotes) {
				t.Errorf("Expected notes %v, got %v", expectedNotes, notes)
			}
		}

		// Check that non-matching URLs were preserved
		if notes, exists := updatedAttachments.Attachments[expectedKey3]; !exists {
			t.Errorf("Expected key '%s' not found", expectedKey3)
		} else {
			expectedNotes := []string{"folder1/note4.md"}
			if !slices.Equal(notes, expectedNotes) {
				t.Errorf("Expected notes %v, got %v", expectedNotes, notes)
			}
		}

		if notes, exists := updatedAttachments.Attachments[expectedKey4]; !exists {
			t.Errorf("Expected key '%s' not found", expectedKey4)
		} else {
			expectedNotes := []string{"folder1/note5.md"}
			if !slices.Equal(notes, expectedNotes) {
				t.Errorf("Expected notes %v, got %v", expectedNotes, notes)
			}
		}

		// Ensure old keys don't exist
		oldKey1 := "http://localhost:5890/notes/old-folder/file1.jpg"
		oldKey2 := "http://localhost:5890/notes/old-folder/file2.pdf"
		if _, exists := updatedAttachments.Attachments[oldKey1]; exists {
			t.Errorf("Old key '%s' should have been removed", oldKey1)
		}
		if _, exists := updatedAttachments.Attachments[oldKey2]; exists {
			t.Errorf("Old key '%s' should have been removed", oldKey2)
		}
	})

	t.Run("update wails URL format attachments", func(t *testing.T) {
		// Create test .attachments.json with wails URLs
		attachmentsData := AttachmentToNotesArray{
			Attachments: map[string][]string{
				"wails://localhost:5173/old-folder/note1?ext=md":       {"old-folder/note1.md"},
				"wails://localhost:5173/old-folder/note2?ext=md":       {"folder2/note2.md", "old-folder/note3.md"},
				"wails://localhost:5173/different-folder/note3?ext=md": {"folder1/note4.md"},
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

		// Update folder name from "old-folder" to "renamed-folder"
		err = UpdateFolderNameInAttachments(tmpDir, testFolder, "old-folder", "renamed-folder")
		if err != nil {
			t.Fatalf("UpdateFolderNameInAttachments failed: %v", err)
		}

		// Read and verify the updated file
		updatedData, err := os.ReadFile(attachmentsPath)
		if err != nil {
			t.Fatalf("Failed to read updated file: %v", err)
		}

		var updatedAttachments AttachmentToNotesArray
		err = json.Unmarshal(updatedData, &updatedAttachments)
		if err != nil {
			t.Fatalf("Failed to unmarshal updated data: %v", err)
		}

		// Check that old-folder URLs were updated
		expectedKey1 := "wails://localhost:5173/renamed-folder/note1?ext=md"
		expectedKey2 := "wails://localhost:5173/renamed-folder/note2?ext=md"
		expectedKey3 := "wails://localhost:5173/different-folder/note3?ext=md"

		if notes, exists := updatedAttachments.Attachments[expectedKey1]; !exists {
			t.Errorf("Expected key '%s' not found", expectedKey1)
		} else {
			expectedNotes := []string{"renamed-folder/note1.md"}
			if !slices.Equal(notes, expectedNotes) {
				t.Errorf("Expected notes %v, got %v", expectedNotes, notes)
			}
		}

		if notes, exists := updatedAttachments.Attachments[expectedKey2]; !exists {
			t.Errorf("Expected key '%s' not found", expectedKey2)
		} else {
			expectedNotes := []string{"folder2/note2.md", "renamed-folder/note3.md"}
			if !slices.Equal(notes, expectedNotes) {
				t.Errorf("Expected notes %v, got %v", expectedNotes, notes)
			}
		}

		// Check that non-matching URLs were preserved
		if notes, exists := updatedAttachments.Attachments[expectedKey3]; !exists {
			t.Errorf("Expected key '%s' not found", expectedKey3)
		} else {
			expectedNotes := []string{"folder1/note4.md"}
			if !slices.Equal(notes, expectedNotes) {
				t.Errorf("Expected notes %v, got %v", expectedNotes, notes)
			}
		}
	})

	t.Run("mixed URL formats", func(t *testing.T) {
		// Create test .attachments.json with mixed URL formats
		attachmentsData := AttachmentToNotesArray{
			Attachments: map[string][]string{
				"http://localhost:5890/notes/target-folder/image.jpg": {"target-folder/note1.md"},
				"wails://localhost:5173/target-folder/doc?ext=md":     {"target-folder/note2.md"},
				"wails://localhost:5173/other-folder/doc2?ext=md":     {"folder1/note3.md"},
				"local-file.txt": {"target-folder/note4.md"},
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

		// Update folder name from "target-folder" to "updated-folder"
		err = UpdateFolderNameInAttachments(tmpDir, testFolder, "target-folder", "updated-folder")
		if err != nil {
			t.Fatalf("UpdateFolderNameInAttachments failed: %v", err)
		}

		// Read and verify the updated file
		updatedData, err := os.ReadFile(attachmentsPath)
		if err != nil {
			t.Fatalf("Failed to read updated file: %v", err)
		}

		var updatedAttachments AttachmentToNotesArray
		err = json.Unmarshal(updatedData, &updatedAttachments)
		if err != nil {
			t.Fatalf("Failed to unmarshal updated data: %v", err)
		}

		// Verify both URL formats were updated
		expectedKeys := map[string][]string{
			"http://localhost:5890/notes/updated-folder/image.jpg": {"updated-folder/note1.md"},
			"wails://localhost:5173/updated-folder/doc?ext=md":     {"updated-folder/note2.md"},
			"wails://localhost:5173/other-folder/doc2?ext=md":      {"folder1/note3.md"},
			"local-file.txt": {"updated-folder/note4.md"},
		}

		if len(updatedAttachments.Attachments) != len(expectedKeys) {
			t.Errorf("Expected %d attachments, got %d", len(expectedKeys), len(updatedAttachments.Attachments))
		}

		for expectedKey, expectedNotes := range expectedKeys {
			if notes, exists := updatedAttachments.Attachments[expectedKey]; !exists {
				t.Errorf("Expected key '%s' not found", expectedKey)
			} else if !slices.Equal(notes, expectedNotes) {
				t.Errorf("For key '%s', expected notes %v, got %v", expectedKey, expectedNotes, notes)
			}
		}
	})

	t.Run("no matching folder names", func(t *testing.T) {
		// Create test .attachments.json with no matching folder names
		attachmentsData := AttachmentToNotesArray{
			Attachments: map[string][]string{
				"http://localhost:5890/notes/different-folder/file.jpg": {"folder1/note1.md"},
				"wails://localhost:5173/another-folder/doc?ext=md":      {"folder1/note2.md"},
				"regular-file.txt": {"folder1/note3.md"},
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

		// Update folder name that doesn't exist
		err = UpdateFolderNameInAttachments(tmpDir, testFolder, "nonexistent-folder", "new-folder")
		if err != nil {
			t.Fatalf("UpdateFolderNameInAttachments failed: %v", err)
		}

		// Read and verify nothing was changed
		updatedData, err := os.ReadFile(attachmentsPath)
		if err != nil {
			t.Fatalf("Failed to read updated file: %v", err)
		}

		var updatedAttachments AttachmentToNotesArray
		err = json.Unmarshal(updatedData, &updatedAttachments)
		if err != nil {
			t.Fatalf("Failed to unmarshal updated data: %v", err)
		}

		// All keys should remain unchanged
		originalKeys := []string{
			"http://localhost:5890/notes/different-folder/file.jpg",
			"wails://localhost:5173/another-folder/doc?ext=md",
			"regular-file.txt",
		}

		for _, key := range originalKeys {
			if _, exists := updatedAttachments.Attachments[key]; !exists {
				t.Errorf("Expected original key '%s' to remain", key)
			}
		}
	})

	t.Run("empty attachments file", func(t *testing.T) {
		// Create empty .attachments.json
		attachmentsData := AttachmentToNotesArray{
			Attachments: map[string][]string{},
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

		// Should not error on empty file
		err = UpdateFolderNameInAttachments(tmpDir, testFolder, "old-folder", "new-folder")
		if err != nil {
			t.Fatalf("UpdateFolderNameInAttachments failed on empty file: %v", err)
		}

		// File should remain empty
		updatedData, err := os.ReadFile(attachmentsPath)
		if err != nil {
			t.Fatalf("Failed to read updated file: %v", err)
		}

		var updatedAttachments AttachmentToNotesArray
		err = json.Unmarshal(updatedData, &updatedAttachments)
		if err != nil {
			t.Fatalf("Failed to unmarshal updated data: %v", err)
		}

		if len(updatedAttachments.Attachments) != 0 {
			t.Errorf("Expected empty attachments, got %d", len(updatedAttachments.Attachments))
		}
	})

	t.Run("invalid project path", func(t *testing.T) {
		err := UpdateFolderNameInAttachments("/nonexistent/path", testFolder, "old-folder", "new-folder")
		if err == nil {
			t.Error("Expected error for invalid project path, got nil")
		}
	})

	t.Run("update folder names with emoji in both keys and values", func(t *testing.T) {
		// Create test data that mirrors the example given
		attachmentsData := AttachmentToNotesArray{
			Attachments: map[string][]string{
				"http://localhost:5890/notes/Leetcode/5051_0.pkpass":   {"👨‍💻 Leetcode/noway.md"},
				"wails://localhost:5173/Leetcode/Etesam's Note?ext=md": {"👨‍💻 Leetcode/noway.md", "other-folder/note2.md"},
				"http://localhost:5890/notes/👨‍💻 Leetcode/file.jpg":    {"👨‍💻 Leetcode/another.md"},
				"regular-file.txt": {"👨‍💻 Leetcode/local.md"},
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

		// Update folder name from "👨‍💻 Leetcode" to "🔥 NewLeetcode"
		err = UpdateFolderNameInAttachments(tmpDir, testFolder, "👨‍💻 Leetcode", "🔥 NewLeetcode")
		if err != nil {
			t.Fatalf("UpdateFolderNameInAttachments failed: %v", err)
		}

		// Read and verify the updated file
		updatedData, err := os.ReadFile(attachmentsPath)
		if err != nil {
			t.Fatalf("Failed to read updated file: %v", err)
		}

		var updatedAttachments AttachmentToNotesArray
		err = json.Unmarshal(updatedData, &updatedAttachments)
		if err != nil {
			t.Fatalf("Failed to unmarshal updated data: %v", err)
		}

		// Verify expected updates
		expectedResults := map[string][]string{
			"http://localhost:5890/notes/Leetcode/5051_0.pkpass":   {"🔥 NewLeetcode/noway.md"},
			"wails://localhost:5173/Leetcode/Etesam's Note?ext=md": {"🔥 NewLeetcode/noway.md", "other-folder/note2.md"},
			"http://localhost:5890/notes/🔥 NewLeetcode/file.jpg":   {"🔥 NewLeetcode/another.md"},
			"regular-file.txt": {"🔥 NewLeetcode/local.md"},
		}

		if len(updatedAttachments.Attachments) != len(expectedResults) {
			t.Errorf("Expected %d attachments, got %d", len(expectedResults), len(updatedAttachments.Attachments))
		}

		for expectedKey, expectedNotes := range expectedResults {
			if actualNotes, exists := updatedAttachments.Attachments[expectedKey]; !exists {
				t.Errorf("Expected key '%s' not found", expectedKey)
			} else if !slices.Equal(actualNotes, expectedNotes) {
				t.Errorf("For key '%s', expected notes %v, got %v", expectedKey, expectedNotes, actualNotes)
			}
		}
	})
}
