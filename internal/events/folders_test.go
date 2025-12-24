package events

import (
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// createTestIndex creates a temporary Bleve index for testing
func createTestIndex(t *testing.T) bleve.Index {
	tmpDir := t.TempDir()
	index, err := search.OpenOrCreateIndex(tmpDir)
	require.NoError(t, err)
	t.Cleanup(func() {
		index.Close()
	})
	return index
}

// createTestParams creates an EventParams struct with a test index
func createTestParams(t *testing.T) EventParams {
	return EventParams{
		App:         nil, // Not needed for these tests
		ProjectPath: t.TempDir(),
		Index:       createTestIndex(t),
	}
}

func TestAddFoldersToIndex(t *testing.T) {
	t.Run("should add multiple folders to the index", func(t *testing.T) {
		params := createTestParams(t)
		data := []map[string]string{
			{"folder": "folder1"},
			{"folder": "folder2"},
			{"folder": "folder3"},
		}

		addFoldersToIndex(params, data)

		// Verify all folders were indexed
		for _, folderData := range data {
			doc, err := params.Index.Document(folderData["folder"])
			assert.NoError(t, err)
			assert.NotNil(t, doc, "folder %s should be indexed", folderData["folder"])
		}
	})

	t.Run("should skip invalid entries and handle special characters", func(t *testing.T) {
		params := createTestParams(t)
		data := []map[string]string{{"folder": "f.1"}, {"bad": "v"}}
		addFoldersToIndex(params, data)

		doc, _ := params.Index.Document("f.1")
		assert.NotNil(t, doc)

		doc, _ = params.Index.Document("v")
		assert.Nil(t, doc)
	})
}

func TestDeleteFoldersFromIndex(t *testing.T) {
	t.Run("should delete folderes from index", func(t *testing.T) {
		params := createTestParams(t)

		// Add multiple folders
		addData := []map[string]string{
			{"folder": "folder1"},
			{"folder": "folder2"},
			{"folder": "folder3"},
		}
		addFoldersToIndex(params, addData)

		// Delete folder1 and folder3
		deleteData := []map[string]string{
			{"folder": "folder1"},
			{"folder": "folder3"},
		}
		deleteFoldersFromIndex(params, deleteData)

		// Verify folder1 and folder3 were deleted
		doc1, err := params.Index.Document("folder1")
		assert.NoError(t, err)
		assert.Nil(t, doc1)

		doc3, err := params.Index.Document("folder3")
		assert.NoError(t, err)
		assert.Nil(t, doc3)

		// folder2 should still exist
		doc2, err := params.Index.Document("folder2")
		assert.NoError(t, err)
		assert.NotNil(t, doc2)
	})

	t.Run("should skip invalid entries and handle edge cases", func(t *testing.T) {
		params := createTestParams(t)

		// Add folders
		addData := []map[string]string{
			{"folder": "folder1"},
			{"folder": "folder2"},
		}
		addFoldersToIndex(params, addData)

		// Try to delete with invalid entries: missing key, empty value, non-existent folder
		deleteData := []map[string]string{
			{"folder": "folder1"},
			{"other_key": "some_value"}, // Missing "folder" key
			{"folder": ""},              // Empty folder value
			{"folder": "non-existent"},  // Non-existent folder
		}
		deleteFoldersFromIndex(params, deleteData)

		// folder1 should be deleted
		doc1, err := params.Index.Document("folder1")
		assert.NoError(t, err)
		assert.Nil(t, doc1)

		// folder2 should still exist
		doc2, err := params.Index.Document("folder2")
		assert.NoError(t, err)
		assert.NotNil(t, doc2)
	})
}
