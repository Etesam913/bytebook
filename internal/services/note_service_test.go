package services

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAddNoteToFolder(t *testing.T) {
	t.Run("Creates an empty markdown note in an existing folder", func(t *testing.T) {
		project := t.TempDir()
		require.NoError(t, os.MkdirAll(filepath.Join(project, "notes", "nested", "folder"), 0755))
		service := NoteService{ProjectPath: project}

		response := service.AddNoteToFolder("nested/folder", "New note")

		require.True(t, response.Success, response.Message)
		content, err := os.ReadFile(filepath.Join(project, "notes", "nested", "folder", "New note.md"))
		require.NoError(t, err)
		assert.Empty(t, content)
	})

	t.Run("Creates a note at the notes root", func(t *testing.T) {
		project := t.TempDir()
		require.NoError(t, os.Mkdir(filepath.Join(project, "notes"), 0755))
		service := NoteService{ProjectPath: project}

		response := service.AddNoteToFolder("", "root")

		assert.True(t, response.Success)
		assert.FileExists(t, filepath.Join(project, "notes", "root.md"))
	})

	t.Run("Preserves an existing note on collision", func(t *testing.T) {
		project := t.TempDir()
		writeTestNote(t, project, "folder/note.md", "keep me")
		service := NoteService{ProjectPath: project}

		response := service.AddNoteToFolder("folder", "note")

		assert.False(t, response.Success)
		content, err := os.ReadFile(filepath.Join(project, "notes", "folder", "note.md"))
		require.NoError(t, err)
		assert.Equal(t, "keep me", string(content))
	})

	t.Run("Rejects a directory collision", func(t *testing.T) {
		project := t.TempDir()
		require.NoError(t, os.MkdirAll(filepath.Join(project, "notes", "note.md"), 0755))
		service := NoteService{ProjectPath: project}

		response := service.AddNoteToFolder("", "note")

		assert.False(t, response.Success)
		assert.DirExists(t, filepath.Join(project, "notes", "note.md"))
	})

	t.Run("Rejects a missing destination folder", func(t *testing.T) {
		project := t.TempDir()
		service := NoteService{ProjectPath: project}

		response := service.AddNoteToFolder("missing", "note")

		assert.False(t, response.Success)
		assert.NoFileExists(t, filepath.Join(project, "notes", "missing", "note.md"))
	})

	t.Run("Rejects paths escaping the notes root", func(t *testing.T) {
		project := t.TempDir()
		service := NoteService{ProjectPath: project}

		folderResponse := service.AddNoteToFolder("..", "outside")
		noteResponse := service.AddNoteToFolder("", "../outside")

		assert.False(t, folderResponse.Success)
		assert.False(t, noteResponse.Success)
		assert.NoFileExists(t, filepath.Join(project, "outside.md"))
	})
}

func TestDoesNoteExist(t *testing.T) {
	project := t.TempDir()
	writeTestNote(t, project, "folder/note.md", "note")
	require.NoError(t, os.WriteFile(filepath.Join(project, "outside.md"), []byte("outside"), 0644))
	service := NoteService{ProjectPath: project}

	t.Run("Finds an existing note", func(t *testing.T) {
		exists := service.DoesNoteExist("folder/note.md")

		assert.True(t, exists)
	})

	t.Run("Returns false for a missing note", func(t *testing.T) {
		exists := service.DoesNoteExist("folder/missing.md")

		assert.False(t, exists)
	})

	t.Run("Returns false for an empty path", func(t *testing.T) {
		exists := service.DoesNoteExist("")

		assert.False(t, exists)
	})

	t.Run("Rejects parent traversal", func(t *testing.T) {
		parentExists := service.DoesNoteExist("..")
		outsideExists := service.DoesNoteExist("../outside.md")

		assert.False(t, parentExists)
		assert.False(t, outsideExists)
	})
}
