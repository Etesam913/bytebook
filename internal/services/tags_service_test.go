package services

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSetTagsOnNotes(t *testing.T) {
	t.Run("Adds and removes tags on multiple notes and attachments", func(t *testing.T) {
		project := t.TempDir()
		paths := []string{"root.md", "nested/note.md", "nested/image.png"}
		service := TagsService{ProjectPath: project}
		for _, path := range paths {
			writeTestNote(t, project, path, "original content")
			_, err := notes.AddTags(project, path, []string{"keep", "remove"})
			require.NoError(t, err)
		}

		response := service.SetTagsOnNotes(paths, []string{"added", "keep", "remove"}, []string{"remove"})

		require.True(t, response.Success, response.Message)
		// Read from disk independently of GetTagsForNotes to check persistence.
		for _, path := range paths {
			tags, err := notes.GetTags(project, path)
			require.NoError(t, err)
			assert.ElementsMatch(t, []string{"keep", "added"}, tags, path)
			content, err := os.ReadFile(filepath.Join(project, "notes", path))
			require.NoError(t, err)
			assert.Contains(t, string(content), "original content")
		}
	})

	t.Run("Reports failure for a missing note", func(t *testing.T) {
		service := TagsService{ProjectPath: t.TempDir()}

		response := service.SetTagsOnNotes([]string{"missing.md"}, []string{"added"}, nil)

		assert.False(t, response.Success)
		assert.NotEmpty(t, response.Message)
	})

	t.Run("Accepts an empty selection", func(t *testing.T) {
		service := TagsService{ProjectPath: t.TempDir()}

		response := service.SetTagsOnNotes(nil, []string{"added"}, nil)

		assert.True(t, response.Success)
	})
}

func TestGetTagsForNotes(t *testing.T) {
	t.Run("Returns tags keyed by path including untagged notes and attachments", func(t *testing.T) {
		project := t.TempDir()
		writeTestNote(t, project, "root.md", "---\ntags:\n  - root\n---\n# Root")
		writeTestNote(t, project, "nested/note.md", "# Untagged")
		writeTestNote(t, project, "nested/image.png", "image")
		_, err := notes.AddTags(project, "nested/image.png", []string{"image"})
		require.NoError(t, err)
		service := TagsService{ProjectPath: project}

		response := service.GetTagsForNotes([]string{"root.md", "nested/note.md", "nested/image.png"})

		require.True(t, response.Success, response.Message)
		require.Len(t, response.Data, 3)
		assert.Equal(t, []string{"root"}, response.Data["root.md"])
		assert.Empty(t, response.Data["nested/note.md"])
		assert.Equal(t, []string{"image"}, response.Data["nested/image.png"])
	})

	t.Run("Returns failure without partial data if a note is missing", func(t *testing.T) {
		project := t.TempDir()
		writeTestNote(t, project, "note.md", "---\ntags:\n  - keep\n---\n# Note")
		service := TagsService{ProjectPath: project}

		response := service.GetTagsForNotes([]string{"note.md", "missing.md"})

		assert.False(t, response.Success)
		assert.NotEmpty(t, response.Message)
		assert.Empty(t, response.Data)
		assert.NotNil(t, response.Data)
	})

	t.Run("Returns an empty map for an empty selection", func(t *testing.T) {
		service := TagsService{ProjectPath: t.TempDir()}

		response := service.GetTagsForNotes(nil)

		assert.True(t, response.Success)
		assert.Empty(t, response.Data)
		assert.NotNil(t, response.Data)
	})
}

func TestDeleteTags(t *testing.T) {
	t.Run("Deletes any matching tag across search pages while preserving other tags and content", func(t *testing.T) {
		project := t.TempDir()
		index := createTestSearchIndex(t)
		service := TagsService{ProjectPath: project, Index: search.NewIndexHolder(index)}
		// Cross two full pages so a single-page implementation cannot pass.
		paths := make([]string, 0, 2001)
		for i := 0; i < 2001; i++ {
			path := fmt.Sprintf("nested/note-%04d.md", i)
			tag := "remove-a"
			if i%2 == 1 {
				tag = "remove-b"
			}
			writeTestNote(t, project, path, fmt.Sprintf("---\ntags:\n  - %s\n  - keep\n---\n# Original content", tag))
			paths = append(paths, path)
		}
		writeTestNote(t, project, "image.png", "original image")
		_, err := notes.AddTags(project, "image.png", []string{"remove-a", "remove-b", "keep"})
		require.NoError(t, err)
		paths = append(paths, "image.png")
		writeTestNote(t, project, "unrelated.md", "---\ntags:\n  - unrelated\n---\n# Unchanged")
		indexTestNotes(t, project, index, append(paths, "unrelated.md")...)

		response := service.DeleteTags([]string{"remove-a", "remove-b"})

		require.True(t, response.Success, response.Message)
		for _, path := range paths {
			tags, err := notes.GetTags(project, path)
			require.NoError(t, err)
			require.ElementsMatch(t, []string{"keep"}, tags, path)
			content, err := os.ReadFile(filepath.Join(project, "notes", path))
			require.NoError(t, err)
			if path == "image.png" {
				assert.Equal(t, "original image", string(content))
			} else {
				assert.Contains(t, string(content), "# Original content", path)
			}
		}
		content, err := os.ReadFile(filepath.Join(project, "notes", "unrelated.md"))
		require.NoError(t, err)
		assert.Equal(t, "---\ntags:\n  - unrelated\n---\n# Unchanged", string(content))
	})

	t.Run("Succeeds when no notes match", func(t *testing.T) {
		project := t.TempDir()
		index := createTestSearchIndex(t)
		writeTestNote(t, project, "note.md", "# Unchanged")
		indexTestNotes(t, project, index, "note.md")
		service := TagsService{ProjectPath: project, Index: search.NewIndexHolder(index)}

		response := service.DeleteTags([]string{"missing"})

		assert.True(t, response.Success)
		content, err := os.ReadFile(filepath.Join(project, "notes", "note.md"))
		require.NoError(t, err)
		assert.Equal(t, "# Unchanged", string(content))
	})

	t.Run("Accepts no tags without accessing the index", func(t *testing.T) {
		service := TagsService{ProjectPath: t.TempDir()}

		response := service.DeleteTags(nil)

		assert.True(t, response.Success)
	})

	t.Run("Reports a search failure", func(t *testing.T) {
		index, err := search.OpenOrCreateIndex(t.TempDir())
		require.NoError(t, err)
		require.NoError(t, index.Close())
		service := TagsService{Index: search.NewIndexHolder(index)}

		response := service.DeleteTags([]string{"remove"})

		assert.False(t, response.Success)
		assert.NotEmpty(t, response.Message)
	})
}
