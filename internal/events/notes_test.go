package events

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	index "github.com/blevesearch/bleve_index_api"
	"github.com/etesam913/bytebook/internal/notes/sidecar"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAddCreatedNotesToIndex(t *testing.T) {
	t.Run("should add notes to the index", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := setupNotesDir(t, params.ProjectPath)

		// Create test note files
		createNoteFile(t, notesDir, "folder1", "note1.md", "# Note 1\nContent here")
		createNoteFile(t, notesDir, "folder1", "note2.md", "# Note 2\nMore content")

		data := []util.FileCreateEventData{
			{FilePath: "folder1/note1.md"},
			{FilePath: "folder1/note2.md"},
		}

		addCreatedNotesToIndex(params, data)

		// Verify notes were indexed
		doc1, _ := rawIndex(params).Document("folder1/note1.md")
		assert.NotNil(t, doc1)

		doc2, _ := rawIndex(params).Document("folder1/note2.md")
		assert.NotNil(t, doc2)
	})
}

func TestRenameFilesInIndex(t *testing.T) {
	t.Run("should rename notes in the index", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := setupNotesDir(t, params.ProjectPath)

		// Create original note
		createNoteFile(t, notesDir, "folder1", "old-note.md", "# Old Note")

		// Add to index
		addData := []util.FileCreateEventData{{FilePath: "folder1/old-note.md"}}
		addCreatedNotesToIndex(params, addData)

		// Create the renamed file
		createNoteFile(t, notesDir, "folder1", "new-note.md", "# Old Note")

		// Rename in index
		renameData := []util.FileRenameEventData{{
			OldFilePath: "folder1/old-note.md",
			NewFilePath: "folder1/new-note.md",
		}}
		renameFilesInIndex(params, renameData)

		// Old note should be gone
		oldDoc, _ := rawIndex(params).Document("folder1/old-note.md")
		assert.Nil(t, oldDoc)

		// New note should exist
		newDoc, _ := rawIndex(params).Document("folder1/new-note.md")
		assert.NotNil(t, newDoc)
	})
}

func TestDeleteNotesFromIndex(t *testing.T) {
	t.Run("should delete notes from the index", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := setupNotesDir(t, params.ProjectPath)

		// Create and add notes
		createNoteFile(t, notesDir, "folder1", "note1.md", "# Note 1")
		createNoteFile(t, notesDir, "folder1", "note2.md", "# Note 2")

		addData := []util.FileCreateEventData{
			{FilePath: "folder1/note1.md"},
			{FilePath: "folder1/note2.md"},
		}
		addCreatedNotesToIndex(params, addData)

		// Delete note1
		deleteData := []util.FileDeleteEventData{{FilePath: "folder1/note1.md"}}
		deleteNotesFromIndex(params, deleteData)

		// note1 should be gone, note2 should remain
		doc1, _ := rawIndex(params).Document("folder1/note1.md")
		assert.Nil(t, doc1)

		doc2, _ := rawIndex(params).Document("folder1/note2.md")
		assert.NotNil(t, doc2)
	})
}

func TestUpdateNotesInIndex(t *testing.T) {
	t.Run("should update notes in the index", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := setupNotesDir(t, params.ProjectPath)

		// Create and add note
		createNoteFile(t, notesDir, "folder1", "note.md", "# Original Content")

		addData := []util.FileCreateEventData{{FilePath: "folder1/note.md"}}
		addCreatedNotesToIndex(params, addData)

		// Update the file content
		notePath := filepath.Join(notesDir, "folder1", "note.md")
		err := os.WriteFile(notePath, []byte("# Updated Content"), 0644)
		require.NoError(t, err)

		// Update in index
		updateData := []util.FileWriteEventData{{FilePath: "folder1/note.md"}}
		updateNotesInIndex(params, updateData)

		// Verify note is still indexed
		doc, _ := rawIndex(params).Document("folder1/note.md")
		assert.NotNil(t, doc)
	})

	t.Run("should index non-markdown files as attachments without reading their content", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := setupNotesDir(t, params.ProjectPath)

		createNoteFile(t, notesDir, "folder1", "video.mov", "binary-video-bytes")

		updateData := []util.FileWriteEventData{{FilePath: "folder1/video.mov"}}
		updateNotesInIndex(params, updateData)

		doc, err := rawIndex(params).Document("folder1/video.mov")
		require.NoError(t, err)
		require.NotNil(t, doc)

		fields := map[string]string{}
		doc.VisitFields(func(field index.Field) {
			fields[field.Name()] = string(field.Value())
		})
		assert.Equal(t, search.ATTACHMENT_TYPE, fields["type"])
		assert.NotContains(t, fields, "text_content")
	})
}

func TestNoteWriteAndDeleteFlushFullBatches(t *testing.T) {
	params := createTestParams(t)
	noteCount := search.DefaultBatchSize + 10
	writes := make([]util.FileWriteEventData, 0, noteCount)
	deletes := make([]util.FileDeleteEventData, 0, noteCount)
	for i := range noteCount {
		filePath := fmt.Sprintf("folder/note-%d.md", i)
		writes = append(writes, util.FileWriteEventData{FilePath: filePath, Markdown: "# note"})
		deletes = append(deletes, util.FileDeleteEventData{FilePath: filePath})
	}

	updateNotesInIndex(params, writes)
	count, err := rawIndex(params).DocCount()
	require.NoError(t, err)
	assert.EqualValues(t, noteCount, count)

	deleteNotesFromIndex(params, deletes)
	count, err = rawIndex(params).DocCount()
	require.NoError(t, err)
	assert.Zero(t, count)
}

func TestWatcherDeletePreservesSidecarForPutBack(t *testing.T) {
	// Index a note with metadata stored in its separate hidden sidecar.
	params := createTestParams(t)
	root := setupNotesDir(t, params.ProjectPath)
	createNoteFile(t, root, "", "note.md", "# Note")
	notePath := filepath.Join(root, "note.md")
	metadata := []byte(`{"tags":["keep"],"codeResults":{"version":1,"codeBlocks":[]}}`)
	require.NoError(t, os.WriteFile(sidecar.PathFor(notePath), metadata, 0644))
	addCreatedNotesToIndex(params, []util.FileCreateEventData{{FilePath: "note.md"}})
	// Finder trashes only the visible note, leaving its sidecar at the original path.
	trashPath := filepath.Join(t.TempDir(), "note.md")
	require.NoError(t, os.Rename(notePath, trashPath))

	deleteNotesFromIndex(params, []util.FileDeleteEventData{{FilePath: "note.md"}})

	// Deletion removes the search entry while retaining metadata for a possible restore.
	actual, err := os.ReadFile(sidecar.PathFor(notePath))
	require.NoError(t, err)
	assert.Equal(t, metadata, actual)
	doc, err := rawIndex(params).Document("note.md")
	require.NoError(t, err)
	assert.Nil(t, doc)

	// Simulate Finder Put Back and the resulting create event.
	require.NoError(t, os.Rename(trashPath, notePath))
	addCreatedNotesToIndex(params, []util.FileCreateEventData{{FilePath: "note.md"}})

	// The restored note is searchable again and still has its original metadata.
	actual, err = os.ReadFile(sidecar.PathFor(notePath))
	require.NoError(t, err)
	assert.Equal(t, metadata, actual)
	doc, err = rawIndex(params).Document("note.md")
	require.NoError(t, err)
	assert.NotNil(t, doc)
}
