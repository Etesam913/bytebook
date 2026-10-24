package search

import (
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

func TestIndexFileMarkdown(t *testing.T) {
	env := setupTestEnv(t)

	t.Run("should add new note to batch", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder")
		env.createFile(folderPath, "test.md", basicMarkdown)

		batch := env.Index.NewBatch()
		err := IndexFile(batch, env.TmpDir, "test-folder", "test.md", nil)

		assert.NoError(t, err)
		assert.Greater(t, batch.Size(), 0)
	})

	t.Run("should replace existing indexed content", func(t *testing.T) {
		env := setupTestEnv(t)
		folder := env.createTestFolder("folder")
		require.NoError(t, env.Index.Index("folder/note.md", CreateNoteBleveDocument("original", "folder", "note.md")))
		env.createFile(folder, "note.md", "replacement")
		batch := env.Index.NewBatch()

		require.NoError(t, IndexFile(batch, env.TmpDir, "folder", "note.md", nil))
		require.NoError(t, env.Index.Batch(batch))

		result, err := env.Index.Search(bleve.NewSearchRequest(bleve.NewMatchQuery("replacement")))
		require.NoError(t, err)
		require.Len(t, result.Hits, 1)
		assert.Equal(t, "folder/note.md", result.Hits[0].ID)
		result, err = env.Index.Search(bleve.NewSearchRequest(bleve.NewMatchQuery("original")))
		require.NoError(t, err)
		assert.Zero(t, result.Total)
	})
}

func TestIndexFileAttachment(t *testing.T) {
	env := setupTestEnv(t)

	t.Run("should add new attachment to batch", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder")
		env.createFile(folderPath, "test.pdf", "fake pdf content")

		batch := env.Index.NewBatch()
		err := IndexFile(batch, env.TmpDir, "test-folder", "test.pdf", nil)

		assert.NoError(t, err)
		assert.Greater(t, batch.Size(), 0)
	})

	t.Run("should update indexed attachment tags from sidecar", func(t *testing.T) {
		folderName := "tagged-folder"
		folderPath := env.createTestFolder(folderName)
		env.createFile(folderPath, "tagged.pdf", "fake content")
		require.NoError(t, sidecar.WriteTags(env.TmpDir, folderName, "tagged.pdf", []string{"old"}))
		initialBatch := env.Index.NewBatch()
		require.NoError(t, IndexFile(initialBatch, env.TmpDir, folderName, "tagged.pdf", nil))
		require.NoError(t, env.Index.Batch(initialBatch))
		require.NoError(t, sidecar.WriteTags(env.TmpDir, folderName, "tagged.pdf", []string{"a", "b"}))

		batch := env.Index.NewBatch()
		err := IndexFile(batch, env.TmpDir, folderName, "tagged.pdf", nil)
		require.NoError(t, err)
		require.NoError(t, env.Index.Batch(batch))

		termQuery := bleve.NewTermQuery("a")
		termQuery.SetField(FieldTags)
		searchRequest := bleve.NewSearchRequest(termQuery)
		searchRequest.Fields = []string{FieldFileName, FieldTags}
		result, err := env.Index.Search(searchRequest)
		require.NoError(t, err)
		require.Len(t, result.Hits, 1)
		assert.Equal(t, "tagged-folder/tagged.pdf", result.Hits[0].ID)
		termQuery = bleve.NewTermQuery("old")
		termQuery.SetField(FieldTags)
		result, err = env.Index.Search(bleve.NewSearchRequest(termQuery))
		require.NoError(t, err)
		assert.Zero(t, result.Total)
	})
}

func TestRegenerateSearchIndex(t *testing.T) {
	verifyCommitFailure := func(t *testing.T, configure func(*indexRebuildOperations)) (*IndexHolder, string) {
		t.Helper()
		projectPath := t.TempDir()
		notesPath := filepath.Join(projectPath, "notes")
		require.NoError(t, os.MkdirAll(notesPath, 0o755))
		require.NoError(t, os.WriteFile(filepath.Join(notesPath, "note.md"), []byte("searchable content"), 0o644))
		index, err := OpenOrCreateIndex(projectPath)
		require.NoError(t, err)
		holder := NewIndexHolder(index)
		t.Cleanup(func() { assert.NoError(t, holder.Close()) })
		operations := indexRebuildOperations{removeAll: os.RemoveAll, rename: os.Rename, open: bleve.Open}
		configure(&operations)

		err = holder.Swap(func(old bleve.Index) (bleve.Index, error) {
			return regenerateSearchIndex(projectPath, old, operations)
		})

		require.ErrorIs(t, err, os.ErrPermission)
		require.NoError(t, holder.Read(func(recovered bleve.Index) error {
			document, err := recovered.Document("note.md")
			require.NoError(t, err)
			assert.NotNil(t, document)
			return recovered.Index("after-failure.md", CreateNoteBleveDocument("updated content", "", "after-failure.md"))
		}))
		return holder, projectPath
	}

	t.Run("keeps search usable when removing the previous directory fails", func(t *testing.T) {
		verifyCommitFailure(t, func(operations *indexRebuildOperations) {
			operations.removeAll = func(string) error { return os.ErrPermission }
		})
	})

	t.Run("keeps search usable when renaming the rebuilt directory fails", func(t *testing.T) {
		holder, projectPath := verifyCommitFailure(t, func(operations *indexRebuildOperations) {
			operations.rename = func(string, string) error { return os.ErrPermission }
		})

		// Retrying must preserve subsequent edits without deleting the active staging index.
		require.NoError(t, os.WriteFile(filepath.Join(projectPath, "notes", "after-failure.md"), []byte("updated content"), 0o644))
		require.NoError(t, holder.Swap(func(old bleve.Index) (bleve.Index, error) {
			return RegenerateSearchIndex(projectPath, old)
		}))
		require.NoError(t, holder.Read(func(rebuilt bleve.Index) error {
			document, err := rebuilt.Document("after-failure.md")
			require.NoError(t, err)
			assert.NotNil(t, document)
			return nil
		}))
	})

	t.Run("reopens the installed index when its first open fails", func(t *testing.T) {
		verifyCommitFailure(t, func(operations *indexRebuildOperations) {
			firstOpen := true
			operations.open = func(path string) (bleve.Index, error) {
				if firstOpen {
					firstOpen = false
					return nil, os.ErrPermission
				}
				return bleve.Open(path)
			}
		})
	})

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
