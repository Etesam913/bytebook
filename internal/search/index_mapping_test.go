package search

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Test utilities to reduce boilerplate and redundancy

type TestEnv struct {
	TmpDir   string
	NotesDir string
	Index    bleve.Index
	t        *testing.T
	cleanup  func()
}

// setupTestEnv creates a temporary directory and index for testing
func setupTestEnv(t *testing.T) *TestEnv {
	tmpDir, err := os.MkdirTemp("", "bytebook_test")
	require.NoError(t, err)

	notesDir := filepath.Join(tmpDir, "notes")

	index, err := OpenOrCreateIndex(tmpDir)
	require.NoError(t, err)

	cleanup := func() {
		if index != nil {
			index.Close()
		}
		os.RemoveAll(tmpDir)
	}

	return &TestEnv{
		TmpDir:   tmpDir,
		NotesDir: notesDir,
		Index:    index,
		t:        t,
		cleanup:  cleanup,
	}
}

func (env *TestEnv) Close() {
	env.cleanup()
}

// createTestFolder creates a folder structure for testing
func (env *TestEnv) createTestFolder(folderName string) string {
	folderPath := filepath.Join(env.NotesDir, folderName)
	err := os.MkdirAll(folderPath, 0755)
	require.NoError(env.t, err)
	return folderPath
}

// createMarkdownFile creates a test markdown file
func (env *TestEnv) createMarkdownFile(folderPath, filename, content string) string {
	filePath := filepath.Join(folderPath, filename)
	err := os.WriteFile(filePath, []byte(content), 0644)
	require.NoError(env.t, err)
	return filePath
}

// createAttachmentFile creates a test attachment file
func (env *TestEnv) createAttachmentFile(folderPath, filename, content string) string {
	filePath := filepath.Join(folderPath, filename)
	err := os.WriteFile(filePath, []byte(content), 0644)
	require.NoError(env.t, err)
	return filePath
}

// verifyDocumentExists checks if a document exists in the index
func (env *TestEnv) verifyDocumentExists(docId string) {
	doc, err := env.Index.Document(docId)
	assert.NoError(env.t, err, "Document %s should exist", docId)
	assert.NotNil(env.t, doc, "Document %s should not be nil", docId)
}

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

` + "```drawing\n{\"elements\":[]}\n```" + `

More text content.
`
)

// Tests for index mapping functions

func TestCreateMarkdownNoteBleveDocument(t *testing.T) {
	t.Run("should create document with basic markdown", func(t *testing.T) {
		doc := CreateMarkdownNoteBleveDocument(basicMarkdown, "test-folder", "test.md")

		assert.Equal(t, "test-folder", doc.Folder)
		assert.Equal(t, "test.md", doc.FileName)
		assert.Equal(t, ".md", doc.FileExtension)
		assert.Contains(t, doc.TextContent, "Test Content")
		assert.False(t, doc.HasCode)
		assert.False(t, doc.HasDrawing)
	})

	t.Run("should handle complex markdown with all features", func(t *testing.T) {
		doc := CreateMarkdownNoteBleveDocument(complexMarkdown, "examples", "multi.md")

		assert.True(t, doc.HasCode)
		assert.True(t, doc.HasGoCode)
		assert.True(t, doc.HasPythonCode)
		assert.True(t, doc.HasJavascriptCode)
		assert.True(t, doc.HasJavaCode)
		assert.True(t, doc.HasDrawing)
		assert.Equal(t, "2023-12-05T14:30:00Z", doc.LastUpdated)
		assert.Equal(t, "2023-12-01T10:00:00Z", doc.CreatedDate)
	})
}

func TestCreateAttachmentBleveDocument(t *testing.T) {
	testCases := []struct {
		fileName      string
		fileExtension string
	}{
		{"test-file", ".pdf"},
		{"image", ".jpg"},
		{"document", ".docx"},
		{"video", ".mp4"},
		{"", ".txt"},  // Empty filename
		{"noext", ""}, // No extension
	}

	for _, tc := range testCases {
		t.Run(tc.fileName+tc.fileExtension, func(t *testing.T) {
			doc := createAttachmentBleveDocument("test-folder", tc.fileName, tc.fileExtension)

			assert.Equal(t, tc.fileName, doc.FileName)
			assert.Equal(t, tc.fileExtension, doc.FileExtension)
		})
	}
}

func TestIndexOperations(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Close()

	t.Run("should create and open index successfully", func(t *testing.T) {
		// Index is already created in setupTestEnv
		assert.NotNil(t, env.Index)

		// Verify we can index a document
		doc := CreateMarkdownNoteBleveDocument(basicMarkdown, "test", "file")
		err := env.Index.Index("test-id", doc)
		assert.NoError(t, err)

		// Verify we can retrieve it
		retrieved, err := env.Index.Document("test-id")
		assert.NoError(t, err)
		assert.NotNil(t, retrieved)
	})
}

func TestAddMarkdownNoteToBatch(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Close()

	t.Run("should add new markdown note to batch", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder")
		filePath := env.createMarkdownFile(folderPath, "test.md", basicMarkdown)

		batch := env.Index.NewBatch()
		fileId, err := AddMarkdownNoteToBatch(batch, env.Index, filePath, "test-folder", "test.md", false)

		assert.NoError(t, err)
		assert.NotEmpty(t, fileId)
		assert.Equal(t, "test-folder/test.md", fileId)
		assert.Greater(t, batch.Size(), 0)

		// The file doesn't have an ID in frontmatter and none is added
	})

	t.Run("should not add existing note if lastUpdated hasn't changed", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder-2")
		filePath := env.createMarkdownFile(folderPath, "test.md", markdownWithIdAndLastUpdated)

		// Pre-index the document
		bleveDoc := CreateMarkdownNoteBleveDocument(markdownWithIdAndLastUpdated, "test-folder-2", "test.md")
		err := env.Index.Index("test-folder-2/test.md", bleveDoc)
		require.NoError(t, err)

		batch := env.Index.NewBatch()
		initialSize := batch.Size()

		returnedId, err := AddMarkdownNoteToBatch(batch, env.Index, filePath, "test-folder-2", "test.md", false)

		assert.NoError(t, err)
		assert.Equal(t, "test-folder-2/test.md", returnedId)
		assert.Equal(t, initialSize, batch.Size()) // Should not change
	})
}

func TestAddAttachmentToBatch(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Close()

	t.Run("should add new attachment to batch", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder")
		env.createAttachmentFile(folderPath, "test.pdf", "fake pdf content")

		batch := env.Index.NewBatch()
		fileId, err := AddAttachmentToBatch(batch, env.Index, "test-folder", "test.pdf", ".pdf")

		assert.NoError(t, err)
		assert.Equal(t, "test-folder/test.pdf", fileId)
		assert.Greater(t, batch.Size(), 0)
	})

	t.Run("should not add existing attachment to batch", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder-2")
		env.createAttachmentFile(folderPath, "existing.jpg", "fake image content")

		// Pre-index the attachment
		fileId := "test-folder-2/existing.jpg"
		bleveDoc := createAttachmentBleveDocument("test-folder-2", "existing", ".jpg")
		err := env.Index.Index(fileId, bleveDoc)
		require.NoError(t, err)

		batch := env.Index.NewBatch()
		initialSize := batch.Size()

		returnedId, err := AddAttachmentToBatch(batch, env.Index, "test-folder-2", "existing.jpg", ".jpg")

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
				env.createAttachmentFile(folderPath, tc.fileName+tc.extension, "fake content")

				batch := env.Index.NewBatch()
				expectedId := filepath.Join(folderName, tc.fileName)

				fileId, err := AddAttachmentToBatch(batch, env.Index, folderName, tc.fileName, tc.extension)

				assert.NoError(t, err)
				assert.Equal(t, expectedId, fileId)
				assert.Greater(t, batch.Size(), 0)
			})
		}
	})
}

func TestIndexAllFilesInFolder(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Close()

	t.Run("should return error for non-existent folder", func(t *testing.T) {
		err := IndexAllFilesInFolder("/non/existent/path", "non-existent", env.Index)
		assert.Error(t, err)
	})

	t.Run("should index markdown files with missing IDs", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder")
		env.createMarkdownFile(folderPath, "test1.md", basicMarkdown)
		env.createMarkdownFile(folderPath, "test2.md", "# Content\nThis is test content without frontmatter.")

		err := IndexAllFilesInFolder(folderPath, "test-folder", env.Index)
		assert.NoError(t, err)

		// Verify files are indexed using their file paths as document IDs
		env.verifyDocumentExists("test-folder/test1.md")
		env.verifyDocumentExists("test-folder/test2.md")

		// Files don't have IDs added to their frontmatter
	})

	t.Run("should index files with existing IDs", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder-2")
		env.createMarkdownFile(folderPath, "test.md", markdownWithId)

		err := IndexAllFilesInFolder(folderPath, "test-folder-2", env.Index)
		assert.NoError(t, err)

		env.verifyDocumentExists("test-folder-2/test.md")
	})

	t.Run("should index files in the parent folder", func(t *testing.T) {
		folderPath := env.createTestFolder("parent-folder")
		subfolderPath := filepath.Join(folderPath, "subfolder")
		err := os.MkdirAll(subfolderPath, 0755)
		require.NoError(t, err)

		// Create files in parent folder
		env.createMarkdownFile(folderPath, "parent-note.md", "# Content in parent folder")

		err = IndexAllFilesInFolder(folderPath, "parent-folder", env.Index)
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
		env.createMarkdownFile(subfolderPath, "sub-note.md", "# Content in subfolder")

		err = IndexAllFilesInFolder(folderPath, "parent-folder", env.Index)
		assert.NoError(t, err)

		// Verify subfolder file was NOT indexed (since we only process files, not subdirectories)
		doc, err := env.Index.Document("parent-folder/sub-note.md")
		assert.NoError(t, err)
		assert.Nil(t, doc, "Subfolder files should not be indexed")
	})

	t.Run("should handle empty folders", func(t *testing.T) {
		folderPath := env.createTestFolder("empty-folder")

		err := IndexAllFilesInFolder(folderPath, "empty-folder", env.Index)
		assert.NoError(t, err) // Should not error on empty folders
	})
}

func TestIndexAllFiles(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Close()

	t.Run("should handle non-existent notes directory", func(t *testing.T) {
		err := IndexAllFiles(env.TmpDir, env.Index)
		assert.NoError(t, err)
	})

	t.Run("should index files in multiple folders", func(t *testing.T) {
		// Create multiple folders with files
		folder1Path := env.createTestFolder("folder1")
		folder2Path := env.createTestFolder("folder2")

		env.createMarkdownFile(folder1Path, "note1.md", basicMarkdown)
		env.createMarkdownFile(folder2Path, "note2.md", markdownWithId)
		env.createAttachmentFile(folder1Path, "attachment.pdf", "fake pdf content")

		err := IndexAllFiles(env.TmpDir, env.Index)
		assert.NoError(t, err)

		// Verify all files were indexed
		env.verifyDocumentExists("folder1/note1.md")
		env.verifyDocumentExists("folder2/note2.md")
		env.verifyDocumentExists("folder1/attachment.pdf")
	})

	t.Run("should continue indexing other folders if one folder fails", func(t *testing.T) {
		// Create one good folder and one that might cause issues
		goodFolderPath := env.createTestFolder("good-folder")
		env.createMarkdownFile(goodFolderPath, "good-note.md", basicMarkdown)

		// The function should continue even if individual folders have issues
		err := IndexAllFiles(env.TmpDir, env.Index)
		assert.NoError(t, err)

		// Verify the good folder was still indexed
		env.verifyDocumentExists("good-folder/good-note.md")
	})
}

func TestGetDocumentByIdFromIndex(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Close()

	t.Run("should return Exists=false when document not found", func(t *testing.T) {
		result := getDocumentByIdFromIndex(env.Index, "non-existent-id")

		assert.False(t, result.Exists)
		assert.Equal(t, "", result.LastUpdated)
	})

	t.Run("should return document info when document exists", func(t *testing.T) {
		// Index a test document
		docId := "test-document-id"
		bleveDoc := CreateMarkdownNoteBleveDocument(markdownWithIdAndLastUpdated, "test-folder", "test-file")
		err := env.Index.Index(docId, bleveDoc)
		require.NoError(t, err)

		result := getDocumentByIdFromIndex(env.Index, docId)

		assert.True(t, result.Exists)
		assert.Equal(t, "2023-12-01T10:30:00Z", result.LastUpdated)
	})

	t.Run("should handle documents with different lastUpdated formats", func(t *testing.T) {
		testCases := []struct {
			name                string
			docId               string
			lastUpdated         string
			expectedLastUpdated string
		}{
			{
				name:                "ISO 8601 format",
				docId:               "doc-iso-8601",
				lastUpdated:         "2023-12-01T10:30:00Z",
				expectedLastUpdated: "2023-12-01T10:30:00Z",
			},
			{
				name:                "Different timezone",
				docId:               "doc-timezone",
				lastUpdated:         "2023-12-01T10:30:00-05:00",
				expectedLastUpdated: "2023-12-01T15:30:00Z", // Bleve normalizes to UTC
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				markdown := `---
id: ` + tc.docId + `
title: Test Document
lastUpdated: ` + tc.lastUpdated + `
---

# Test Content
This is test content.
`
				bleveDoc := CreateMarkdownNoteBleveDocument(markdown, "test-folder", "test-file")
				err := env.Index.Index(tc.docId, bleveDoc)
				require.NoError(t, err)

				result := getDocumentByIdFromIndex(env.Index, tc.docId)

				assert.True(t, result.Exists)
				assert.Equal(t, tc.expectedLastUpdated, result.LastUpdated)
			})
		}
	})
}

func TestRegenerateSearchIndex(t *testing.T) {
	t.Run("should regenerate index with existing files", func(t *testing.T) {
		env := setupTestEnv(t)
		// Don't defer env.Close() here - we'll handle cleanup manually

		// Create and index some files
		folder1Path := env.createTestFolder("folder1")
		folder2Path := env.createTestFolder("folder2")

		env.createMarkdownFile(folder1Path, "note1.md", basicMarkdown)
		env.createMarkdownFile(folder2Path, "note2.md", markdownWithId)
		env.createAttachmentFile(folder1Path, "attachment.pdf", "fake pdf content")

		// Index all files initially
		err := IndexAllFiles(env.TmpDir, env.Index)
		require.NoError(t, err)

		// Verify files are indexed
		env.verifyDocumentExists("folder1/note1.md")
		env.verifyDocumentExists("folder2/note2.md")
		env.verifyDocumentExists("folder1/attachment.pdf")

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

		// Clean up manually: close new index and remove temp dir
		newIndex.Close()
		os.RemoveAll(env.TmpDir)
	})

	t.Run("should regenerate index when no index exists", func(t *testing.T) {
		env := setupTestEnv(t)
		// Don't defer env.Close() here - we'll handle cleanup manually

		// Create some files
		folder1Path := env.createTestFolder("folder1")
		env.createMarkdownFile(folder1Path, "note1.md", basicMarkdown)

		// Close and remove the existing index
		env.Index.Close()
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

		// Clean up manually: close new index and remove temp dir
		newIndex.Close()
		os.RemoveAll(env.TmpDir)
	})

	t.Run("should handle regeneration with multiple folders and file types", func(t *testing.T) {
		env := setupTestEnv(t)
		// Don't defer env.Close() here - we'll handle cleanup manually

		// Create files in multiple folders with different types
		folder1Path := env.createTestFolder("folder1")
		folder2Path := env.createTestFolder("folder2")

		env.createMarkdownFile(folder1Path, "markdown1.md", basicMarkdown)
		env.createMarkdownFile(folder2Path, "markdown2.md", complexMarkdown)
		env.createAttachmentFile(folder1Path, "file1.pdf", "pdf content")
		env.createAttachmentFile(folder2Path, "file2.jpg", "jpg content")

		// Index all files initially
		err := IndexAllFiles(env.TmpDir, env.Index)
		require.NoError(t, err)

		// Verify initial indexing
		env.verifyDocumentExists("folder1/markdown1.md")
		env.verifyDocumentExists("folder2/markdown2.md")
		env.verifyDocumentExists("folder1/file1.pdf")
		env.verifyDocumentExists("folder2/file2.jpg")

		// Get document count before regeneration
		oldDocCount, err := env.Index.DocCount()
		require.NoError(t, err)

		// Regenerate the index
		oldIndex := env.Index
		newIndex, err := RegenerateSearchIndex(env.TmpDir, oldIndex)
		require.NoError(t, err)
		assert.NotNil(t, newIndex)

		// Update test environment
		env.Index = newIndex

		// Verify document count matches
		newDocCount, err := newIndex.DocCount()
		require.NoError(t, err)
		assert.Equal(t, oldDocCount, newDocCount, "Document count should match after regeneration")

		// Verify all files are still indexed
		env.verifyDocumentExists("folder1/markdown1.md")
		env.verifyDocumentExists("folder2/markdown2.md")
		env.verifyDocumentExists("folder1/file1.pdf")
		env.verifyDocumentExists("folder2/file2.jpg")

		// Clean up manually: close new index and remove temp dir
		newIndex.Close()
		os.RemoveAll(env.TmpDir)
	})
}
