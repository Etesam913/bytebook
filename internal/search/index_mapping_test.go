package search

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/notes/sidecar"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Standard test markdown content
const (
	basicMarkdown = `---
title: Test Document
---

# Test Content
This is test content.
`

	markdownWithId = `---
id: test-id-12345
title: Test Document
---

# Test Content
This is test content.
`

	markdownWithIdAndLastUpdated = `---
id: test-id-12345
title: Test Document
lastUpdated: 2023-12-01T10:30:00Z
---

# Test Content
This is test content.
`

	complexMarkdown = `---
lastUpdated: 2023-12-05T14:30:00Z
createdDate: 2023-12-01T10:00:00Z
author: Test Author
---

# Multi-Language Document

Some text content here.

` + "```go\npackage main\nfunc main() {}\n```" + `

` + "```python\ndef hello():\n    pass\n```" + `

` + "```javascript\nfunction test() {}\n```" + `

` + "```java\nclass Test {}\n```" + `

More text content.
`
)

// Tests for index mapping functions

func TestIndexOperations(t *testing.T) {
	env := setupTestEnv(t)

	t.Run("should create and open index successfully", func(t *testing.T) {
		// Index is already created in setupTestEnv
		assert.NotNil(t, env.Index)

		// Verify we can index a document
		doc := CreateNoteBleveDocument(basicMarkdown, "test", "file")
		err := env.Index.Index("test-id", doc)
		assert.NoError(t, err)

		// Verify we can retrieve it
		retrieved, err := env.Index.Document("test-id")
		assert.NoError(t, err)
		assert.NotNil(t, retrieved)
	})
}

func TestAddFileToBatchMarkdown(t *testing.T) {
	env := setupTestEnv(t)

	t.Run("should add new note to batch", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder")
		env.createFile(folderPath, "test.md", basicMarkdown)

		batch := env.Index.NewBatch()
		fileId, err := AddFileToBatch(batch, env.Index, env.TmpDir, "test-folder", "test.md", false)

		assert.NoError(t, err)
		assert.NotEmpty(t, fileId)
		assert.Equal(t, "test-folder/test.md", fileId)
		assert.Greater(t, batch.Size(), 0)

		// The file doesn't have an ID in frontmatter and none is added
	})

	t.Run("should not add existing note if lastUpdated hasn't changed", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder-2")
		env.createFile(folderPath, "test.md", markdownWithIdAndLastUpdated)

		// Pre-index the document
		bleveDoc := CreateNoteBleveDocument(markdownWithIdAndLastUpdated, "test-folder-2", "test.md")
		err := env.Index.Index("test-folder-2/test.md", bleveDoc)
		require.NoError(t, err)

		batch := env.Index.NewBatch()
		initialSize := batch.Size()

		returnedId, err := AddFileToBatch(batch, env.Index, env.TmpDir, "test-folder-2", "test.md", false)

		assert.NoError(t, err)
		assert.Equal(t, "test-folder-2/test.md", returnedId)
		assert.Equal(t, initialSize, batch.Size()) // Should not change
	})
}

func TestAddFileToBatchAttachment(t *testing.T) {
	env := setupTestEnv(t)

	t.Run("should add new attachment to batch", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder")
		env.createFile(folderPath, "test.pdf", "fake pdf content")

		batch := env.Index.NewBatch()
		fileId, err := AddFileToBatch(batch, env.Index, env.TmpDir, "test-folder", "test.pdf", false)

		assert.NoError(t, err)
		assert.Equal(t, "test-folder/test.pdf", fileId)
		assert.Greater(t, batch.Size(), 0)
	})

	t.Run("should not add existing attachment to batch", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder-2")
		env.createFile(folderPath, "existing.jpg", "fake image content")

		// Pre-index the attachment
		fileId := "test-folder-2/existing.jpg"
		bleveDoc := createAttachmentBleveDocument(env.TmpDir, "test-folder-2", "existing.jpg", ".jpg")
		err := env.Index.Index(fileId, bleveDoc)
		require.NoError(t, err)

		batch := env.Index.NewBatch()
		initialSize := batch.Size()

		returnedId, err := AddFileToBatch(batch, env.Index, env.TmpDir, "test-folder-2", "existing.jpg", false)

		assert.NoError(t, err)
		assert.Equal(t, fileId, returnedId)
		assert.Equal(t, initialSize, batch.Size()) // Should not change
	})

	t.Run("should handle different file types", func(t *testing.T) {
		testCases := []struct {
			fileName  string
			extension string
		}{
			{"document.docx", ".docx"},
			{"video.mp4", ".mp4"},
			{"audio.mp3", ".mp3"},
			{"image.png", ".png"},
		}

		for _, tc := range testCases {
			t.Run(tc.fileName, func(t *testing.T) {
				folderName := "test-folder-" + tc.fileName
				folderPath := env.createTestFolder(folderName)
				env.createFile(folderPath, tc.fileName+tc.extension, "fake content")

				batch := env.Index.NewBatch()
				expectedId := filepath.Join(folderName, tc.fileName)

				fileId, err := AddFileToBatch(batch, env.Index, env.TmpDir, folderName, tc.fileName, false)

				assert.NoError(t, err)
				assert.Equal(t, expectedId, fileId)
				assert.Greater(t, batch.Size(), 0)
			})
		}
	})

	t.Run("should index attachment tags from sidecar", func(t *testing.T) {
		folderName := "tagged-folder"
		folderPath := env.createTestFolder(folderName)
		env.createFile(folderPath, "tagged.pdf", "fake content")
		require.NoError(t, sidecar.WriteTags(env.TmpDir, folderName, "tagged.pdf", []string{"a", "b"}))

		batch := env.Index.NewBatch()
		fileId, err := AddFileToBatch(batch, env.Index, env.TmpDir, folderName, "tagged.pdf", true)
		require.NoError(t, err)
		require.Equal(t, filepath.Join(folderName, "tagged.pdf"), fileId)
		require.NoError(t, env.Index.Batch(batch))

		termQuery := bleve.NewTermQuery("a")
		termQuery.SetField(FieldTags)
		searchRequest := bleve.NewSearchRequest(termQuery)
		searchRequest.Fields = []string{FieldFileName, FieldTags}
		result, err := env.Index.Search(searchRequest)
		require.NoError(t, err)
		assert.EqualValues(t, 1, result.Total)
	})
}

func TestIndexAllFilesInFolder(t *testing.T) {
	env := setupTestEnv(t)

	t.Run("should return error for non-existent folder", func(t *testing.T) {
		err := indexFolderAndFlush(t, env.Index, env.TmpDir, "/non/existent/path", "non-existent")
		assert.Error(t, err)
	})

	t.Run("should index markdown files with missing IDs", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder")
		env.createFile(folderPath, "test1.md", basicMarkdown)
		env.createFile(folderPath, "test2.md", "# Content\nThis is test content without frontmatter.")

		err := indexFolderAndFlush(t, env.Index, env.TmpDir, folderPath, "test-folder")
		assert.NoError(t, err)

		// Verify files are indexed using their file paths as document IDs
		env.verifyDocumentExists("test-folder/test1.md")
		env.verifyDocumentExists("test-folder/test2.md")

		// Files don't have IDs added to their frontmatter
	})

	t.Run("should index files with existing IDs", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder-2")
		env.createFile(folderPath, "test.md", markdownWithId)

		err := indexFolderAndFlush(t, env.Index, env.TmpDir, folderPath, "test-folder-2")
		assert.NoError(t, err)

		// Verify file is indexed
		env.verifyDocumentExists("test-folder-2/test.md")
	})

	t.Run("should index files in the parent folder", func(t *testing.T) {
		folderPath := env.createTestFolder("parent-folder")
		subfolderPath := filepath.Join(folderPath, "subfolder")
		err := os.MkdirAll(subfolderPath, 0755)
		require.NoError(t, err)

		// Create files in parent folder
		env.createFile(folderPath, "parent-note.md", "# Content in parent folder")

		err = indexFolderAndFlush(t, env.Index, env.TmpDir, folderPath, "parent-folder")
		assert.NoError(t, err)

		// Verify parent file was indexed
		env.verifyDocumentExists("parent-folder/parent-note.md")
	})

	t.Run("should not index files in subdirectories", func(t *testing.T) {
		folderPath := env.createTestFolder("parent-folder")
		subfolderPath := filepath.Join(folderPath, "subfolder")
		err := os.MkdirAll(subfolderPath, 0755)
		require.NoError(t, err)

		// Create files in subfolder (should not be indexed)
		env.createFile(subfolderPath, "sub-note.md", "# Content in subfolder")

		err = indexFolderAndFlush(t, env.Index, env.TmpDir, folderPath, "parent-folder")
		assert.NoError(t, err)

		// Verify subfolder file was NOT indexed (since we only process files, not subdirectories)
		doc, err := env.Index.Document("parent-folder/sub-note.md")
		assert.NoError(t, err)
		assert.Nil(t, doc, "Subfolder files should not be indexed")
	})

	t.Run("should handle empty folders", func(t *testing.T) {
		folderPath := env.createTestFolder("empty-folder")

		err := indexFolderAndFlush(t, env.Index, env.TmpDir, folderPath, "empty-folder")
		assert.NoError(t, err) // Should not error on empty folders

		// Verify empty folders do not create standalone folder documents
		doc, err := env.Index.Document("empty-folder")
		assert.NoError(t, err)
		assert.Nil(t, doc)
	})

	t.Run("should skip hidden files in folder indexing", func(t *testing.T) {
		folderPath := env.createTestFolder("hidden-skip-folder")
		env.createFile(folderPath, "visible.md", "# visible")
		env.createFile(folderPath, ".hidden.md", "# hidden")
		env.createFile(folderPath, ".hidden.png", "fake image content")

		err := indexFolderAndFlush(t, env.Index, env.TmpDir, folderPath, "hidden-skip-folder")
		require.NoError(t, err)

		env.verifyDocumentExists("hidden-skip-folder/visible.md")

		hiddenMarkdownDoc, err := env.Index.Document("hidden-skip-folder/.hidden.md")
		require.NoError(t, err)
		assert.Nil(t, hiddenMarkdownDoc)

		hiddenAttachmentDoc, err := env.Index.Document("hidden-skip-folder/.hidden.png")
		require.NoError(t, err)
		assert.Nil(t, hiddenAttachmentDoc)
	})

	t.Run("should replace a batch after flushing at the size limit", func(t *testing.T) {
		initialDocumentCount, err := env.Index.DocCount()
		require.NoError(t, err)

		folderName := "large-folder"
		folderPath := env.createTestFolder(folderName)
		for i := 0; i < DefaultBatchSize+1; i++ {
			env.createFile(folderPath, fmt.Sprintf("attachment-%04d.bin", i), "data")
		}

		batch := env.Index.NewBatch()
		require.NoError(t, IndexFilesInFolderWithBatch(env.TmpDir, folderPath, folderName, env.Index, batch))
		assert.Equal(t, 2, batch.Size())

		documentCount, err := env.Index.DocCount()
		require.NoError(t, err)
		assert.EqualValues(t, initialDocumentCount+DefaultBatchSize, documentCount)

		require.NoError(t, env.Index.Batch(batch))
		documentCount, err = env.Index.DocCount()
		require.NoError(t, err)
		assert.EqualValues(t, initialDocumentCount+DefaultBatchSize+2, documentCount)
	})
}

func TestRegenerateSearchIndex(t *testing.T) {
	t.Run("should regenerate index with existing files", func(t *testing.T) {
		env := setupTestEnv(t)

		// Create and index some files
		folder1Path := env.createTestFolder("folder1")
		folder2Path := env.createTestFolder("folder2")

		env.createFile(folder1Path, "note1.md", basicMarkdown)
		env.createFile(folder2Path, "note2.md", markdownWithId)
		env.createFile(folder1Path, "attachment.pdf", "fake pdf content")

		// Store the old index reference (will be closed by RegenerateSearchIndex)
		oldIndex := env.Index

		// Regenerate the index
		newIndex, err := RegenerateSearchIndex(env.TmpDir, oldIndex)
		require.NoError(t, err)
		assert.NotNil(t, newIndex)

		// Update the test environment to use the new index for verification
		env.Index = newIndex

		// Verify all files are still indexed after regeneration
		env.verifyDocumentExists("folder1/note1.md")
		env.verifyDocumentExists("folder2/note2.md")
		env.verifyDocumentExists("folder1/attachment.pdf")

		// Verify the old index is closed (can't use it anymore)
		_, err = oldIndex.Document("folder1/note1.md")
		assert.Error(t, err, "Old index should be closed")
	})

	t.Run("should regenerate index when no index exists", func(t *testing.T) {
		env := setupTestEnv(t)

		// Create some files
		folder1Path := env.createTestFolder("folder1")
		env.createFile(folder1Path, "note1.md", basicMarkdown)

		// Close and remove the existing index
		require.NoError(t, env.Index.Close())
		env.Index = nil
		pathToIndex := GetPathToIndex(env.TmpDir)
		err := os.RemoveAll(pathToIndex)
		require.NoError(t, err)

		// Regenerate with nil index (no existing index)
		newIndex, err := RegenerateSearchIndex(env.TmpDir, nil)
		require.NoError(t, err)
		assert.NotNil(t, newIndex)

		// Update test environment to use new index
		env.Index = newIndex

		// Verify files are indexed after regeneration
		env.verifyDocumentExists("folder1/note1.md")
	})

	t.Run("should handle regeneration with multiple folders and file types", func(t *testing.T) {
		env := setupTestEnv(t)

		// Create files in multiple folders with different types
		folder1Path := env.createTestFolder("folder1")
		folder2Path := env.createTestFolder("folder2")

		env.createFile(folder1Path, "markdown1.md", basicMarkdown)
		env.createFile(folder2Path, "markdown2.md", complexMarkdown)
		env.createFile(folder1Path, "file1.pdf", "pdf content")
		env.createFile(folder2Path, "file2.jpg", "jpg content")

		// Regenerate the index
		oldIndex := env.Index
		newIndex, err := RegenerateSearchIndex(env.TmpDir, oldIndex)
		require.NoError(t, err)
		assert.NotNil(t, newIndex)

		// Update test environment
		env.Index = newIndex

		// Verify all files are indexed after regeneration
		env.verifyDocumentExists("folder1/markdown1.md")
		env.verifyDocumentExists("folder2/markdown2.md")
		env.verifyDocumentExists("folder1/file1.pdf")
		env.verifyDocumentExists("folder2/file2.jpg")
	})
}
