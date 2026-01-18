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
	index := createTestIndex(t)
	return EventParams{
		App:         nil, // Not needed for these tests
		ProjectPath: t.TempDir(),
		Index:       &index,
	}
}

func TestAddFoldersToIndex(t *testing.T) {
	t.Run("should add multiple folders to the index", func(t *testing.T) {
		params := createTestParams(t)
		data := []map[string]string{
			{"folderPath": "folder1"},
			{"folderPath": "folder2"},
			{"folderPath": "folder3"},
		}

		addFoldersToIndex(params, data)

		// Verify all folders were indexed
		for _, folderData := range data {
			doc, err := (*params.Index).Document(folderData["folderPath"])
			assert.NoError(t, err)
			assert.NotNil(t, doc, "folder %s should be indexed", folderData["folderPath"])
		}
	})

	t.Run("should skip invalid entries and handle special characters", func(t *testing.T) {
		params := createTestParams(t)
		data := []map[string]string{{"folderPath": "f.1"}, {"bad": "v"}}
		addFoldersToIndex(params, data)

		doc, _ := (*params.Index).Document("f.1")
		assert.NotNil(t, doc)

		doc, _ = (*params.Index).Document("v")
		assert.Nil(t, doc)
	})
}

func TestDeleteFoldersFromIndex(t *testing.T) {
	t.Run("should delete folderes from index", func(t *testing.T) {
		params := createTestParams(t)

		// Add multiple folders
		addData := []map[string]string{
			{"folderPath": "folder1"},
			{"folderPath": "folder2"},
			{"folderPath": "folder3"},
		}
		addFoldersToIndex(params, addData)

		// Delete folder1 and folder3
		deleteData := []map[string]string{
			{"folderPath": "folder1"},
			{"folderPath": "folder3"},
		}
		deleteFoldersFromIndex(params, deleteData)

		// Verify folder1 and folder3 were deleted
		doc1, err := (*params.Index).Document("folder1")
		assert.NoError(t, err)
		assert.Nil(t, doc1)

		doc3, err := (*params.Index).Document("folder3")
		assert.NoError(t, err)
		assert.Nil(t, doc3)

		// folder2 should still exist
		doc2, err := (*params.Index).Document("folder2")
		assert.NoError(t, err)
		assert.NotNil(t, doc2)
	})

	t.Run("should skip invalid entries and handle edge cases", func(t *testing.T) {
		params := createTestParams(t)

		// Add folders
		addData := []map[string]string{
			{"folderPath": "folder1"},
			{"folderPath": "folder2"},
		}
		addFoldersToIndex(params, addData)

		// Try to delete with invalid entries: missing key, empty value, non-existent folder
		deleteData := []map[string]string{
			{"folderPath": "folder1"},
			{"other_key": "some_value"},    // Missing "folderPath" key
			{"folderPath": ""},             // Empty folder value
			{"folderPath": "non-existent"}, // Non-existent folder
		}
		deleteFoldersFromIndex(params, deleteData)

		// folder1 should be deleted
		doc1, err := (*params.Index).Document("folder1")
		assert.NoError(t, err)
		assert.Nil(t, doc1)

		// folder2 should still exist
		doc2, err := (*params.Index).Document("folder2")
		assert.NoError(t, err)
		assert.NotNil(t, doc2)
	})
}

func TestUpdateFolderNameInMarkdown(t *testing.T) {
	tests := []struct {
		name          string
		markdown      string
		oldFolderPath string
		newFolderPath string
		expectedMD    string
		expectedFlag  bool
	}{
		{
			name:          "replaces folder name in image URL",
			markdown:      "![alt text](/notes/old-folder/image.png)",
			oldFolderPath: "old-folder",
			newFolderPath: "new-folder",
			expectedMD:    "![alt text](/notes/new-folder/image.png)",
			expectedFlag:  true,
		},
		{
			name:          "replaces folder name in link URL",
			markdown:      "[link text](/notes/old-folder/note.md)",
			oldFolderPath: "old-folder",
			newFolderPath: "new-folder",
			expectedMD:    "[link text](/notes/new-folder/note.md)",
			expectedFlag:  true,
		},
		{
			name:          "replaces multiple occurrences",
			markdown:      "![img1](/notes/folder/a.png)\n[link](/notes/folder/b.md)\n![img2](/notes/folder/c.jpg)",
			oldFolderPath: "folder",
			newFolderPath: "renamed",
			expectedMD:    "![img1](/notes/renamed/a.png)\n[link](/notes/renamed/b.md)\n![img2](/notes/renamed/c.jpg)",
			expectedFlag:  true,
		},
		{
			name:          "returns false when no folder matches",
			markdown:      "![img](/notes/other-folder/image.png)",
			oldFolderPath: "old-folder",
			newFolderPath: "new-folder",
			expectedMD:    "![img](/notes/other-folder/image.png)",
			expectedFlag:  false,
		},
		{
			name:          "does not match partial folder names",
			markdown:      "![img](/notes/my-old-folder-extra/image.png)",
			oldFolderPath: "old-folder",
			newFolderPath: "new-folder",
			expectedMD:    "![img](/notes/my-old-folder-extra/image.png)",
			expectedFlag:  false,
		},
		{
			name:          "handles empty markdown",
			markdown:      "",
			oldFolderPath: "old-folder",
			newFolderPath: "new-folder",
			expectedMD:    "",
			expectedFlag:  false,
		},
		{
			name:          "handles markdown with no links or images",
			markdown:      "# Heading\n\nSome plain text content.",
			oldFolderPath: "old-folder",
			newFolderPath: "new-folder",
			expectedMD:    "# Heading\n\nSome plain text content.",
			expectedFlag:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, updated := updateFolderNameInMarkdown(tt.markdown, tt.oldFolderPath, tt.newFolderPath)
			assert.Equal(t, tt.expectedMD, result)
			assert.Equal(t, tt.expectedFlag, updated)
		})
	}
}
