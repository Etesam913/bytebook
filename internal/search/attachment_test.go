package search

import (
	"testing"

	"github.com/etesam913/bytebook/internal/notes/sidecar"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateAttachmentBleveDocument(t *testing.T) {
	env := setupTestEnv(t)
	defer env.Close()

	t.Run("should include tags from sidecar", func(t *testing.T) {
		folderName := "test-folder-tags"
		env.createAttachmentFile(env.createTestFolder(folderName), "image.jpg", "fake")
		err := sidecar.WriteTags(env.TmpDir, folderName, "image.jpg", []string{"foo", "bar"})
		require.NoError(t, err)

		doc := createAttachmentBleveDocument(env.TmpDir, folderName, "image.jpg", ".jpg")
		assert.ElementsMatch(t, []string{"foo", "bar"}, doc.Tags)
		assert.NotEmpty(t, doc.CreatedDate)
		assert.Greater(t, doc.Size, int64(0))
	})

	testCases := []struct {
		fileName      string
		fileExtension string
	}{
		{"test-file.pdf", ".pdf"},
		{"image.jpg", ".jpg"},
		{"document.docx", ".docx"},
		{"video.mp4", ".mp4"},
		{"file.txt", ".txt"}, // With extension
		{"noext", ""},        // No extension
	}

	for _, tc := range testCases {
		t.Run(tc.fileName+tc.fileExtension, func(t *testing.T) {
			env.createAttachmentFile(env.createTestFolder("test-folder"), tc.fileName, "fake")
			doc := createAttachmentBleveDocument(env.TmpDir, "test-folder", tc.fileName, tc.fileExtension)

			assert.Equal(t, tc.fileName, doc.FileName)
			assert.Equal(t, tc.fileExtension, doc.FileExtension)
			assert.Empty(t, doc.Tags)
			assert.NotEmpty(t, doc.CreatedDate)
			assert.GreaterOrEqual(t, doc.Size, int64(0))
		})
	}
}
