package events

import (
	"os"
	"path/filepath"
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
		Index:       search.NewIndexHolder(index),
	}
}

// rawIndex returns the underlying bleve index from a test EventParams for
// assertions. Tests are single-goroutine so holding the read lock is not
// strictly required, but this mirrors how production code accesses the index.
func rawIndex(params EventParams) bleve.Index {
	idx := params.Index.RLock()
	params.Index.RUnlock()
	return idx
}

func createMarkdownNoteInFolder(t *testing.T, projectPath, folderPath, fileName, content string) {
	fullFolderPath := filepath.Join(projectPath, "notes", folderPath)
	require.NoError(t, os.MkdirAll(fullFolderPath, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(fullFolderPath, fileName), []byte(content), 0644))
}

func TestAddFoldersToIndex(t *testing.T) {
	t.Run("should index files from created folders", func(t *testing.T) {
		params := createTestParams(t)
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder1", "one.md", "# one")
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder2", "two.md", "# two")

		data := []map[string]string{
			{"folderPath": "folder1"},
			{"folderPath": "folder2"},
		}

		addFoldersToIndex(params, data)

		doc, err := rawIndex(params).Document(filepath.Join("folder1", "one.md"))
		assert.NoError(t, err)
		assert.NotNil(t, doc)

		doc, err = rawIndex(params).Document(filepath.Join("folder2", "two.md"))
		assert.NoError(t, err)
		assert.NotNil(t, doc)
	})

	t.Run("should skip invalid entries", func(t *testing.T) {
		params := createTestParams(t)
		createMarkdownNoteInFolder(t, params.ProjectPath, "f.1", "note.md", "# note")
		data := []map[string]string{
			{"folderPath": "f.1"},
			{"bad": "v"},
			{"folderPath": ""},
		}
		addFoldersToIndex(params, data)

		doc, _ := rawIndex(params).Document(filepath.Join("f.1", "note.md"))
		assert.NotNil(t, doc)
	})
}

func TestDeleteFoldersFromIndex(t *testing.T) {
	t.Run("should delete documents from indexed folder", func(t *testing.T) {
		params := createTestParams(t)
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder1", "one.md", "# one")
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder2", "two.md", "# two")
		require.NoError(t, search.IndexAllFiles(params.ProjectPath, rawIndex(params)))

		deleteData := []map[string]string{
			{"folderPath": "folder1"},
		}
		deleteFoldersFromIndex(params, deleteData)

		doc1, err := rawIndex(params).Document(filepath.Join("folder1", "one.md"))
		assert.NoError(t, err)
		assert.Nil(t, doc1)

		doc2, err := rawIndex(params).Document(filepath.Join("folder2", "two.md"))
		assert.NoError(t, err)
		assert.NotNil(t, doc2)
	})

	t.Run("should skip invalid entries and keep other folders intact", func(t *testing.T) {
		params := createTestParams(t)
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder1", "one.md", "# one")
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder2", "two.md", "# two")
		require.NoError(t, search.IndexAllFiles(params.ProjectPath, rawIndex(params)))

		deleteData := []map[string]string{
			{"folderPath": "folder1"},
			{"other_key": "some_value"},
			{"folderPath": ""},
			{"folderPath": "non-existent"},
		}
		deleteFoldersFromIndex(params, deleteData)

		doc1, err := rawIndex(params).Document(filepath.Join("folder1", "one.md"))
		assert.NoError(t, err)
		assert.Nil(t, doc1)

		doc2, err := rawIndex(params).Document(filepath.Join("folder2", "two.md"))
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
