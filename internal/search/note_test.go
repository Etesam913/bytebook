package search

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCreateNoteBleveDocument(t *testing.T) {
	t.Run("should create document with basic markdown", func(t *testing.T) {
		doc := CreateNoteBleveDocument(basicMarkdown, "test-folder", "test.md")

		assert.Equal(t, "test-folder", doc.Folder)
		assert.Equal(t, "test.md", doc.FileName)
		assert.Equal(t, ".md", doc.FileExtension)
		assert.Contains(t, doc.TextContent, "Test Content")
		assert.False(t, doc.HasCode)
		assert.Greater(t, doc.Size, int64(0))
	})

	t.Run("should handle complex markdown with all features", func(t *testing.T) {
		doc := CreateNoteBleveDocument(complexMarkdown, "examples", "multi.md")

		assert.True(t, doc.HasCode)
		assert.True(t, doc.HasGoCode)
		assert.True(t, doc.HasPythonCode)
		assert.True(t, doc.HasJavascriptCode)
		assert.True(t, doc.HasJavaCode)
		assert.Equal(t, "2023-12-05T14:30:00Z", doc.LastUpdated)
		assert.Equal(t, "2023-12-01T10:00:00Z", doc.CreatedDate)
	})
}
