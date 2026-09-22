package notes

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/etesam913/bytebook/internal/notes/sidecar"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTagsFacadeDispatch(t *testing.T) {
	projectPath := t.TempDir()
	folder := filepath.Join(projectPath, "notes", "docs")
	require.NoError(t, os.MkdirAll(folder, 0755))

	t.Run("markdown notes store tags in frontmatter", func(t *testing.T) {
		notePath := filepath.Join(folder, "note.md")
		require.NoError(t, os.WriteFile(notePath, []byte("# Note"), 0644))

		added, err := AddTags(projectPath, "docs/note.md", []string{"a", "b"})
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"a", "b"}, added)

		remaining, err := DeleteTags(projectPath, "docs/note.md", []string{"a"})
		require.NoError(t, err)
		assert.Equal(t, []string{"b"}, remaining)

		got, err := GetTags(projectPath, "docs/note.md")
		require.NoError(t, err)
		assert.Equal(t, []string{"b"}, got)

		content, err := os.ReadFile(notePath)
		require.NoError(t, err)
		assert.Contains(t, string(content), "- b")
		_, err = os.Stat(sidecar.PathFor(notePath))
		assert.True(t, os.IsNotExist(err), "markdown tags must not create a sidecar")
	})

	t.Run("attachments store tags in the sidecar", func(t *testing.T) {
		imagePath := filepath.Join(folder, "image.png")
		require.NoError(t, os.WriteFile(imagePath, []byte("png"), 0644))

		added, err := AddTags(projectPath, "docs/image.png", []string{"a", "b"})
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"a", "b"}, added)

		remaining, err := DeleteTags(projectPath, "docs/image.png", []string{"a"})
		require.NoError(t, err)
		assert.Equal(t, []string{"b"}, remaining)

		got, err := GetTags(projectPath, "docs/image.png")
		require.NoError(t, err)
		assert.Equal(t, []string{"b"}, got)

		_, err = os.Stat(sidecar.PathFor(imagePath))
		assert.NoError(t, err, "attachment tags must live in the sidecar")
	})
}
