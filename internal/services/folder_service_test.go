package services

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAddFolder(t *testing.T) {
	t.Run("Creates nested folders", func(t *testing.T) {
		project := t.TempDir()
		service := FolderService{ProjectPath: project}

		response := service.AddFolder("parent/child")

		assert.True(t, response.Success, response.Message)
		assert.DirExists(t, filepath.Join(project, "notes", "parent", "child"))
	})

	t.Run("Rejects an existing folder without changing its contents", func(t *testing.T) {
		project := t.TempDir()
		writeTestNote(t, project, "folder/note.md", "keep me")
		service := FolderService{ProjectPath: project}

		response := service.AddFolder("folder")

		assert.False(t, response.Success)
		assert.NotEmpty(t, response.Message)
		content, err := os.ReadFile(filepath.Join(project, "notes", "folder", "note.md"))
		require.NoError(t, err)
		assert.Equal(t, "keep me", string(content))
	})

	t.Run("Rejects a file collision", func(t *testing.T) {
		project := t.TempDir()
		writeTestNote(t, project, "occupied", "keep me")
		service := FolderService{ProjectPath: project}

		response := service.AddFolder("occupied")

		assert.False(t, response.Success)
		content, err := os.ReadFile(filepath.Join(project, "notes", "occupied"))
		require.NoError(t, err)
		assert.Equal(t, "keep me", string(content))
	})

	t.Run("Rejects parent traversal", func(t *testing.T) {
		project := t.TempDir()
		service := FolderService{ProjectPath: project}

		parentResponse := service.AddFolder("..")
		escapeResponse := service.AddFolder("../outside")

		assert.False(t, parentResponse.Success)
		assert.False(t, escapeResponse.Success)
		assert.NoDirExists(t, filepath.Join(project, "outside"))
	})
}

func TestRenameFolder(t *testing.T) {
	t.Run("Moves nested contents", func(t *testing.T) {
		project := t.TempDir()
		writeTestNote(t, project, "old/nested/note.md", "keep me")
		service := FolderService{ProjectPath: project}

		response := service.RenameFolder("old", "new")

		require.True(t, response.Success, response.Message)
		assert.NoDirExists(t, filepath.Join(project, "notes", "old"))
		content, err := os.ReadFile(filepath.Join(project, "notes", "new", "nested", "note.md"))
		require.NoError(t, err)
		assert.Equal(t, "keep me", string(content))
	})

	t.Run("Rejects an existing empty folder", func(t *testing.T) {
		project := t.TempDir()
		writeTestNote(t, project, "source/note.md", "keep me")
		require.NoError(t, os.Mkdir(filepath.Join(project, "notes", "target"), 0755))
		service := FolderService{ProjectPath: project}

		response := service.RenameFolder("source", "target")

		assert.False(t, response.Success)
		assert.FileExists(t, filepath.Join(project, "notes", "source", "note.md"))
		entries, err := os.ReadDir(filepath.Join(project, "notes", "target"))
		require.NoError(t, err)
		assert.Empty(t, entries)
	})

	t.Run("Rejects a file collision", func(t *testing.T) {
		project := t.TempDir()
		writeTestNote(t, project, "source/note.md", "source")
		writeTestNote(t, project, "target", "target")
		service := FolderService{ProjectPath: project}

		response := service.RenameFolder("source", "target")

		assert.False(t, response.Success)
		assert.FileExists(t, filepath.Join(project, "notes", "source", "note.md"))
		content, err := os.ReadFile(filepath.Join(project, "notes", "target"))
		require.NoError(t, err)
		assert.Equal(t, "target", string(content))
	})

	t.Run("Allows a case-only rename", func(t *testing.T) {
		project := t.TempDir()
		writeTestNote(t, project, "draft/note.md", "keep me")
		service := FolderService{ProjectPath: project}

		response := service.RenameFolder("draft", "Draft")

		require.True(t, response.Success, response.Message)
		entries, err := os.ReadDir(filepath.Join(project, "notes"))
		require.NoError(t, err)
		require.Len(t, entries, 1)
		assert.Equal(t, "Draft", entries[0].Name())
		content, err := os.ReadFile(filepath.Join(project, "notes", "Draft", "note.md"))
		require.NoError(t, err)
		assert.Equal(t, "keep me", string(content))
	})

	t.Run("Rejects parent traversal in either path", func(t *testing.T) {
		project := t.TempDir()
		writeTestNote(t, project, "source/note.md", "keep me")
		require.NoError(t, os.Mkdir(filepath.Join(project, "outside"), 0755))
		service := FolderService{ProjectPath: project}

		parentSourceResponse := service.RenameFolder("..", "renamed")
		escapeSourceResponse := service.RenameFolder("../outside", "renamed")
		parentTargetResponse := service.RenameFolder("source", "..")
		escapeTargetResponse := service.RenameFolder("source", "../escaped")

		assert.False(t, parentSourceResponse.Success)
		assert.False(t, escapeSourceResponse.Success)
		assert.False(t, parentTargetResponse.Success)
		assert.False(t, escapeTargetResponse.Success)
		assert.DirExists(t, filepath.Join(project, "outside"))
		assert.NoDirExists(t, filepath.Join(project, "escaped"))
		assert.NoDirExists(t, filepath.Join(project, "notes", "renamed"))
		assert.FileExists(t, filepath.Join(project, "notes", "source", "note.md"))
	})

	t.Run("Rejects moving a folder into its own subfolder", func(t *testing.T) {
		project := t.TempDir()
		writeTestNote(t, project, "source/child/note.md", "keep me")
		service := FolderService{ProjectPath: project}

		response := service.RenameFolder("source", "source/child/moved")

		assert.False(t, response.Success)
		assert.FileExists(t, filepath.Join(project, "notes", "source", "child", "note.md"))
		assert.NoDirExists(t, filepath.Join(project, "notes", "source", "child", "moved"))
	})

	t.Run("Rejects a missing source", func(t *testing.T) {
		service := FolderService{ProjectPath: t.TempDir()}

		response := service.RenameFolder("missing", "new")

		assert.False(t, response.Success)
	})
}
