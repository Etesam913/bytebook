package events

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupNotesDir creates a notes directory structure for testing
func setupNotesDir(t *testing.T, projectPath string) string {
	notesDir := filepath.Join(projectPath, "notes")
	err := os.MkdirAll(notesDir, 0755)
	require.NoError(t, err)
	return notesDir
}

// createNoteFile creates a markdown note file in the specified folder
func createNoteFile(t *testing.T, notesDir, folder, noteName, content string) {
	folderPath := filepath.Join(notesDir, folder)
	err := os.MkdirAll(folderPath, 0755)
	require.NoError(t, err)

	notePath := filepath.Join(folderPath, noteName)
	err = os.WriteFile(notePath, []byte(content), 0644)
	require.NoError(t, err)
}

func TestAddCreatedNotesToIndex(t *testing.T) {
	t.Run("should add markdown notes to the index", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := setupNotesDir(t, params.ProjectPath)

		// Create test note files
		createNoteFile(t, notesDir, "folder1", "note1.md", "# Note 1\nContent here")
		createNoteFile(t, notesDir, "folder1", "note2.md", "# Note 2\nMore content")

		data := []map[string]string{
			{"folder": "folder1", "note": "note1.md"},
			{"folder": "folder1", "note": "note2.md"},
		}

		addCreatedNotesToIndex(params, data)

		// Verify notes were indexed
		doc1, _ := params.Index.Document("folder1/note1.md")
		assert.NotNil(t, doc1)

		doc2, _ := params.Index.Document("folder1/note2.md")
		assert.NotNil(t, doc2)
	})

	t.Run("should skip invalid entries", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := setupNotesDir(t, params.ProjectPath)
		createNoteFile(t, notesDir, "folder1", "valid.md", "# Valid")

		data := []map[string]string{
			{"folder": "folder1", "note": "valid.md"},
			{"folder": "folder1"}, // Missing note
		}

		// Should not panic - will return early on missing note
		addCreatedNotesToIndex(params, data)
	})
}

func TestRenameNotesInIndex(t *testing.T) {
	t.Run("should rename notes in the index", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := setupNotesDir(t, params.ProjectPath)

		// Create original note
		createNoteFile(t, notesDir, "folder1", "old-note.md", "# Old Note")

		// Add to index
		addData := []map[string]string{{"folder": "folder1", "note": "old-note.md"}}
		addCreatedNotesToIndex(params, addData)

		// Create the renamed file
		createNoteFile(t, notesDir, "folder1", "new-note.md", "# Old Note")

		// Rename in index
		renameData := []map[string]string{{
			"oldFolder": "folder1",
			"oldNote":   "old-note.md",
			"newFolder": "folder1",
			"newNote":   "new-note.md",
		}}
		renameNotesInIndex(params, renameData)

		// Old note should be gone
		oldDoc, _ := params.Index.Document("folder1/old-note.md")
		assert.Nil(t, oldDoc)

		// New note should exist
		newDoc, _ := params.Index.Document("folder1/new-note.md")
		assert.NotNil(t, newDoc)
	})

	t.Run("should skip invalid entries", func(t *testing.T) {
		params := createTestParams(t)

		data := []map[string]string{
			{"oldFolder": "f1", "oldNote": "n.md", "newFolder": "f1"}, // Missing newNote
			{"oldFolder": "f1"}, // Missing multiple fields
		}

		// Should not panic
		renameNotesInIndex(params, data)
	})
}

func TestDeleteNotesFromIndex(t *testing.T) {
	t.Run("should delete notes from the index", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := setupNotesDir(t, params.ProjectPath)

		// Create and add notes
		createNoteFile(t, notesDir, "folder1", "note1.md", "# Note 1")
		createNoteFile(t, notesDir, "folder1", "note2.md", "# Note 2")

		addData := []map[string]string{
			{"folder": "folder1", "note": "note1.md"},
			{"folder": "folder1", "note": "note2.md"},
		}
		addCreatedNotesToIndex(params, addData)

		// Delete note1
		deleteData := []map[string]string{{"folder": "folder1", "note": "note1.md"}}
		deleteNotesFromIndex(params, deleteData)

		// note1 should be gone, note2 should remain
		doc1, _ := params.Index.Document("folder1/note1.md")
		assert.Nil(t, doc1)

		doc2, _ := params.Index.Document("folder1/note2.md")
		assert.NotNil(t, doc2)
	})
}

func TestUpdateNotesInIndex(t *testing.T) {
	t.Run("should update notes in the index", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := setupNotesDir(t, params.ProjectPath)

		// Create and add note
		createNoteFile(t, notesDir, "folder1", "note.md", "# Original Content")

		addData := []map[string]string{{"folder": "folder1", "note": "note.md"}}
		addCreatedNotesToIndex(params, addData)

		// Update the file content
		notePath := filepath.Join(notesDir, "folder1", "note.md")
		err := os.WriteFile(notePath, []byte("# Updated Content"), 0644)
		require.NoError(t, err)

		// Update in index
		updateData := []map[string]string{{"folder": "folder1", "note": "note.md"}}
		updateNotesInIndex(params, updateData)

		// Verify note is still indexed
		doc, _ := params.Index.Document("folder1/note.md")
		assert.NotNil(t, doc)
	})

	t.Run("should skip invalid entries", func(t *testing.T) {
		params := createTestParams(t)

		data := []map[string]string{
			{"folder": "f1"},  // Missing note
			{"note": "n1.md"}, // Missing folder
		}

		// Should not panic
		updateNotesInIndex(params, data)
	})
}
