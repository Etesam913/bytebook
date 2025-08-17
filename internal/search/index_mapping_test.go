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
			doc := CreateAttachmentBleveDocument(tc.fileName, tc.fileExtension)

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
		fileId, err := AddMarkdownNoteToBatch(batch, env.Index, filePath, "test-folder", "test.md")

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

		returnedId, err := AddMarkdownNoteToBatch(batch, env.Index, filePath, "test-folder-2", "test.md")

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
		fileId, err := AddAttachmentToBatch(batch, env.Index, filepath.Join(folderPath, "test.pdf"), "test-folder", "test", ".pdf")

		assert.NoError(t, err)
		assert.Equal(t, "test-folder/test.pdf", fileId)
		assert.Greater(t, batch.Size(), 0)
	})

	t.Run("should not add existing attachment to batch", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder-2")
		env.createAttachmentFile(folderPath, "existing.jpg", "fake image content")

		// Pre-index the attachment
		fileId := "test-folder-2/existing.jpg"
		bleveDoc := CreateAttachmentBleveDocument("existing", ".jpg")
		err := env.Index.Index(fileId, bleveDoc)
		require.NoError(t, err)

		batch := env.Index.NewBatch()
		initialSize := batch.Size()

		returnedId, err := AddAttachmentToBatch(batch, env.Index, filepath.Join(folderPath, "existing.jpg"), "test-folder-2", "existing", ".jpg")

		assert.NoError(t, err)
		assert.Equal(t, fileId, returnedId)
		assert.Equal(t, initialSize, batch.Size()) // Should not change
	})

	t.Run("should handle different file types", func(t *testing.T) {
		testCases := []struct {
			fileName  string
			extension string
		}{
			{"document", ".docx"},
			{"video", ".mp4"},
			{"audio", ".mp3"},
			{"image", ".png"},
		}

		for _, tc := range testCases {
			t.Run(tc.fileName+tc.extension, func(t *testing.T) {
				folderName := "test-folder-" + tc.fileName
				folderPath := env.createTestFolder(folderName)
				testFile := filepath.Join(folderPath, tc.fileName+tc.extension)
				env.createAttachmentFile(folderPath, tc.fileName+tc.extension, "fake content")

				batch := env.Index.NewBatch()
				expectedId := filepath.Join(folderName, tc.fileName+tc.extension)

				fileId, err := AddAttachmentToBatch(batch, env.Index, testFile, folderName, tc.fileName, tc.extension)

				assert.NoError(t, err)
				assert.Equal(t, expectedId, fileId)
				assert.Greater(t, batch.Size(), 0)
			})
		}
	})
}

func TestIndexAllFiles(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Close()

	t.Run("should handle non-existent notes directory", func(t *testing.T) {
		err := IndexAllFiles(env.TmpDir, env.Index)
		assert.NoError(t, err)
	})

	t.Run("should index markdown files with missing IDs", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder")
		env.createMarkdownFile(folderPath, "test1.md", basicMarkdown)
		env.createMarkdownFile(folderPath, "test2.md", "# Content\nThis is test content without frontmatter.")

		err := IndexAllFiles(env.TmpDir, env.Index)
		assert.NoError(t, err)

		// Verify files are indexed using their file paths as document IDs
		env.verifyDocumentExists("test-folder/test1.md")
		env.verifyDocumentExists("test-folder/test2.md")

		// Files don't have IDs added to their frontmatter
	})

	t.Run("should index files with existing IDs", func(t *testing.T) {
		folderPath := env.createTestFolder("test-folder-2")
		env.createMarkdownFile(folderPath, "test.md", markdownWithId)

		err := IndexAllFiles(env.TmpDir, env.Index)
		assert.NoError(t, err)

		env.verifyDocumentExists("test-folder-2/test.md")
	})

	t.Run("should handle multiple folders", func(t *testing.T) {
		folder1Path := env.createTestFolder("folder1")
		folder2Path := env.createTestFolder("folder2")

		env.createMarkdownFile(folder1Path, "note1.md", "# Content in folder 1")
		env.createMarkdownFile(folder2Path, "note2.md", "# Content in folder 2")

		err := IndexAllFiles(env.TmpDir, env.Index)
		assert.NoError(t, err)

		// Verify both files were processed and indexed using their file paths as document IDs
		env.verifyDocumentExists("folder1/note1.md")
		env.verifyDocumentExists("folder2/note2.md")

		// Files don't have IDs added to their frontmatter
	})

	t.Run("should handle empty folders", func(t *testing.T) {
		env.createTestFolder("empty-folder")

		err := IndexAllFiles(env.TmpDir, env.Index)
		assert.NoError(t, err) // Should not error on empty folders
	})
}

func TestIndexAllFilesWithAttachments(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Close()

	t.Run("should index both markdown files and attachments", func(t *testing.T) {
		folderPath := env.createTestFolder("mixed-content")

		// Create markdown file
		env.createMarkdownFile(folderPath, "document.md", basicMarkdown)

		// Create attachment files
		env.createAttachmentFile(folderPath, "attachment.pdf", "fake pdf content")
		env.createAttachmentFile(folderPath, "image.jpg", "fake image content")

		err := IndexAllFiles(env.TmpDir, env.Index)
		assert.NoError(t, err)

		// Verify markdown file was processed and indexed using file path as document ID
		env.verifyDocumentExists("mixed-content/document.md")

		// File doesn't have an ID added to frontmatter

		// Verify attachment documents exist in index
		env.verifyDocumentExists("mixed-content/attachment.pdf")
		env.verifyDocumentExists("mixed-content/image.jpg")
	})

	t.Run("should handle folders with only attachments", func(t *testing.T) {
		folderPath := env.createTestFolder("attachments-only")

		files := []string{"document.docx", "video.mp4", "audio.mp3"}
		for _, filename := range files {
			env.createAttachmentFile(folderPath, filename, "fake content")
		}

		err := IndexAllFiles(env.TmpDir, env.Index)
		assert.NoError(t, err)

		// Verify all attachment files were indexed
		for _, filename := range files {
			fileId := "attachments-only/" + filename
			env.verifyDocumentExists(fileId)
		}
	})

	t.Run("should not re-index existing attachments", func(t *testing.T) {
		folderPath := env.createTestFolder("existing-attachments")
		env.createAttachmentFile(folderPath, "existing.png", "fake image content")

		// Pre-index the attachment
		fileId := "existing-attachments/existing.png"
		bleveDoc := CreateAttachmentBleveDocument("existing", ".png")
		err := env.Index.Index(fileId, bleveDoc)
		require.NoError(t, err)

		// Get initial document count
		searchReq := bleve.NewSearchRequest(bleve.NewMatchAllQuery())
		searchReq.Size = 100
		initialResult, err := env.Index.Search(searchReq)
		require.NoError(t, err)
		initialCount := initialResult.Total

		err = IndexAllFiles(env.TmpDir, env.Index)
		assert.NoError(t, err)

		// Verify document count didn't increase
		finalResult, err := env.Index.Search(searchReq)
		require.NoError(t, err)
		assert.Equal(t, initialCount, finalResult.Total)
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
