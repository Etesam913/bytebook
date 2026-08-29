package services

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func writeAttachmentSource(
	t *testing.T,
	basePath string,
	relativePath string,
	content []byte,
) string {
	t.Helper()

	// Source fixtures may use nested folders to create duplicate basenames.
	path := filepath.Join(basePath, relativePath)
	require.NoError(t, os.MkdirAll(filepath.Dir(path), 0o755))
	require.NoError(t, os.WriteFile(path, content, 0o644))
	return path
}

func TestNodeServiceAddAttachmentsFromPaths(t *testing.T) {
	t.Run("Copies files into a nested notes folder and returns frontend paths", func(t *testing.T) {
		projectPath := t.TempDir()
		sourcePath := t.TempDir()
		destinationPath := filepath.Join(projectPath, "notes", "assets", "images")
		require.NoError(t, os.MkdirAll(destinationPath, 0o755))
		// Include binary data so the assertion verifies a byte-for-byte copy.
		imageContent := []byte{0x00, 0x01, 0x02, 0xff}
		documentContent := []byte("document content")
		imagePath := writeAttachmentSource(t, sourcePath, "photo.png", imageContent)
		documentPath := writeAttachmentSource(t, sourcePath, "document.pdf", documentContent)
		service := NodeService{ProjectPath: projectPath}

		response := service.AddAttachmentsFromPaths(
			filepath.Join("assets", "images"),
			[]string{imagePath, documentPath},
		)

		require.True(t, response.Success, response.Message)
		assert.Equal(t, []string{
			filepath.Join("notes", "assets", "images", "photo.png"),
			filepath.Join("notes", "assets", "images", "document.pdf"),
		}, response.Data)
		copiedImage, err := os.ReadFile(filepath.Join(destinationPath, "photo.png"))
		require.NoError(t, err)
		assert.Equal(t, imageContent, copiedImage)
		copiedDocument, err := os.ReadFile(filepath.Join(destinationPath, "document.pdf"))
		require.NoError(t, err)
		assert.Equal(t, documentContent, copiedDocument)
	})

	t.Run("Adds a suffix when source files have the same basename", func(t *testing.T) {
		projectPath := t.TempDir()
		sourcePath := t.TempDir()
		destinationPath := filepath.Join(projectPath, "notes", "assets")
		require.NoError(t, os.MkdirAll(destinationPath, 0o755))
		firstContent := []byte("first image")
		secondContent := []byte("second image")
		firstPath := writeAttachmentSource(t, sourcePath, "first/photo.png", firstContent)
		secondPath := writeAttachmentSource(t, sourcePath, "second/photo.png", secondContent)
		service := NodeService{ProjectPath: projectPath}

		response := service.AddAttachmentsFromPaths("assets", []string{firstPath, secondPath})

		require.True(t, response.Success, response.Message)
		assert.Equal(t, []string{
			filepath.Join("notes", "assets", "photo.png"),
			filepath.Join("notes", "assets", "photo 1.png"),
		}, response.Data)
		// The collision must not overwrite the first imported file.
		firstCopy, err := os.ReadFile(filepath.Join(destinationPath, "photo.png"))
		require.NoError(t, err)
		assert.Equal(t, firstContent, firstCopy)
		secondCopy, err := os.ReadFile(filepath.Join(destinationPath, "photo 1.png"))
		require.NoError(t, err)
		assert.Equal(t, secondContent, secondCopy)
	})

	t.Run("Normalizes the filename on disk and in the frontend path", func(t *testing.T) {
		projectPath := t.TempDir()
		sourcePath := t.TempDir()
		destinationPath := filepath.Join(projectPath, "notes", "assets")
		require.NoError(t, os.MkdirAll(destinationPath, 0o755))
		content := []byte("normalized")
		// These characters are valid in the source path but removed on import.
		filePath := writeAttachmentSource(t, sourcePath, "report:name?.txt", content)
		service := NodeService{ProjectPath: projectPath}

		response := service.AddAttachmentsFromPaths("assets", []string{filePath})

		require.True(t, response.Success, response.Message)
		assert.Equal(t, []string{filepath.Join("notes", "assets", "reportname.txt")}, response.Data)
		copied, err := os.ReadFile(filepath.Join(destinationPath, "reportname.txt"))
		require.NoError(t, err)
		assert.Equal(t, content, copied)
	})

	t.Run("Returns a failure when a source file is missing", func(t *testing.T) {
		projectPath := t.TempDir()
		destinationPath := filepath.Join(projectPath, "notes", "assets")
		require.NoError(t, os.MkdirAll(destinationPath, 0o755))
		service := NodeService{ProjectPath: projectPath}

		response := service.AddAttachmentsFromPaths(
			"assets",
			[]string{filepath.Join(t.TempDir(), "missing.txt")},
		)

		assert.False(t, response.Success)
		assert.NotEmpty(t, response.Message)
		assert.Empty(t, response.Data)
		assert.NotNil(t, response.Data)
		assert.NoFileExists(t, filepath.Join(destinationPath, "missing.txt"))
	})

	t.Run("Returns a failure when the destination folder is missing", func(t *testing.T) {
		projectPath := t.TempDir()
		sourcePath := t.TempDir()
		content := []byte("source remains")
		filePath := writeAttachmentSource(t, sourcePath, "attachment.txt", content)
		service := NodeService{ProjectPath: projectPath}

		response := service.AddAttachmentsFromPaths("missing", []string{filePath})

		assert.False(t, response.Success)
		assert.NotEmpty(t, response.Message)
		assert.Empty(t, response.Data)
		assert.NotNil(t, response.Data)
		persistedSource, err := os.ReadFile(filePath)
		require.NoError(t, err)
		assert.Equal(t, content, persistedSource)
		// Attachment imports should not create the requested folder implicitly.
		assert.NoFileExists(t, filepath.Join(projectPath, "notes", "missing", "attachment.txt"))
	})

	t.Run("Returns a non-nil empty result when no files are selected", func(t *testing.T) {
		service := NodeService{ProjectPath: t.TempDir()}

		response := service.AddAttachmentsFromPaths("missing", []string{})

		assert.True(t, response.Success)
		assert.Empty(t, response.Message)
		assert.Empty(t, response.Data)
		// Wails should serialize an empty list as [] rather than null.
		assert.NotNil(t, response.Data)
	})
}
