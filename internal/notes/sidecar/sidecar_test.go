package sidecar

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPathFor(t *testing.T) {
	notePath := filepath.Join("notes", "folder", "note.md")
	assert.Equal(t, filepath.Join("notes", "folder", ".note.json"), PathFor(notePath))
}

func TestPathForFile(t *testing.T) {
	tests := []struct {
		name        string
		projectPath string
		folder      string
		fileName    string
		expected    string
	}{
		{
			name:        "simple file",
			projectPath: "/project",
			folder:      "folder1",
			fileName:    "photo.jpg",
			expected:    filepath.Join("/project", "notes", "folder1", ".photo.json"),
		},
		{
			name:        "file with multiple dots",
			projectPath: "/project",
			folder:      "docs",
			fileName:    "file.name.png",
			expected:    filepath.Join("/project", "notes", "docs", ".file.name.json"),
		},
		{
			name:        "empty folder",
			projectPath: "/project",
			folder:      "",
			fileName:    "image.gif",
			expected:    filepath.Join("/project", "notes", ".image.json"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := PathForFile(tt.projectPath, tt.folder, tt.fileName)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestIsFileName(t *testing.T) {
	assert.True(t, IsFileName(".note.json"))
	assert.True(t, IsFileName(".file.name.json"))
	assert.False(t, IsFileName("note.json"))
	assert.False(t, IsFileName(".json"))
	assert.False(t, IsFileName(".note.txt"))
}

func TestNotePathFromPath(t *testing.T) {
	assert.Equal(
		t,
		filepath.Join("folder", "note.md"),
		NotePathFromPath(filepath.Join("folder", ".note.json")),
	)
	assert.Empty(t, NotePathFromPath(filepath.Join("folder", "note.json")))
}

func setupTestDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	notesDir := filepath.Join(dir, "notes", "testfolder")
	require.NoError(t, os.MkdirAll(notesDir, 0755))
	return dir
}

func TestEnsure(t *testing.T) {
	t.Run("creates sidecar if missing", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := Ensure(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)

		sidecarPath := PathForFile(projectPath, "testfolder", "photo.jpg")
		_, err = os.Stat(sidecarPath)
		assert.NoError(t, err)
	})

	t.Run("does not overwrite existing sidecar", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteTags(projectPath, "testfolder", "photo.jpg", []string{"existing"})
		require.NoError(t, err)

		err = Ensure(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)

		tags, err := ReadTags(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"existing"}, tags)
	})
}

func TestDelete(t *testing.T) {
	t.Run("deletes existing sidecar", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteTags(projectPath, "testfolder", "photo.jpg", []string{"tag1"})
		require.NoError(t, err)

		err = Delete(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)

		sidecarPath := PathForFile(projectPath, "testfolder", "photo.jpg")
		_, err = os.Stat(sidecarPath)
		assert.True(t, os.IsNotExist(err))
	})

	t.Run("returns nil if sidecar does not exist", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := Delete(projectPath, "testfolder", "missing.jpg")
		assert.NoError(t, err)
	})
}

func TestMove(t *testing.T) {
	t.Run("moves entire sidecar (tags and code results)", func(t *testing.T) {
		projectPath := setupTestDir(t)
		require.NoError(t, os.MkdirAll(filepath.Join(projectPath, "notes", "newfolder"), 0755))

		oldNotePath := filepath.Join(projectPath, "notes", "testfolder", "note.md")
		newNotePath := filepath.Join(projectPath, "notes", "newfolder", "renamed.md")
		require.NoError(t, os.WriteFile(oldNotePath, []byte("# Note"), 0644))
		require.NoError(t, WriteTags(projectPath, "testfolder", "note.md", []string{"tag1"}))
		require.NoError(t, WriteCodeResults(oldNotePath, CodeResults{
			CodeBlocks: []CodeBlock{{CodeBlockID: "x", ResultHTML: "<div>ok</div>"}},
		}))

		require.NoError(t, Move(oldNotePath, newNotePath))

		_, err := os.Stat(PathFor(oldNotePath))
		assert.True(t, os.IsNotExist(err))

		tags, err := ReadTags(projectPath, "newfolder", "renamed.md")
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1"}, tags)

		results, err := ReadCodeResults(newNotePath)
		require.NoError(t, err)
		assert.Len(t, results.CodeBlocks, 1)
	})

	t.Run("no-op when source sidecar does not exist", func(t *testing.T) {
		projectPath := setupTestDir(t)
		require.NoError(t, os.MkdirAll(filepath.Join(projectPath, "notes", "newfolder"), 0755))

		oldFilePath := filepath.Join(projectPath, "notes", "testfolder", "missing.jpg")
		newFilePath := filepath.Join(projectPath, "notes", "newfolder", "new.jpg")
		require.NoError(t, Move(oldFilePath, newFilePath))

		_, err := os.Stat(PathFor(newFilePath))
		assert.True(t, os.IsNotExist(err))
	})

	t.Run("errors when destination sidecar already exists", func(t *testing.T) {
		projectPath := setupTestDir(t)
		require.NoError(t, os.MkdirAll(filepath.Join(projectPath, "notes", "newfolder"), 0755))

		require.NoError(t, WriteTags(projectPath, "testfolder", "old.jpg", []string{"tag1"}))
		require.NoError(t, WriteTags(projectPath, "newfolder", "new.jpg", []string{"existing"}))

		oldFilePath := filepath.Join(projectPath, "notes", "testfolder", "old.jpg")
		newFilePath := filepath.Join(projectPath, "notes", "newfolder", "new.jpg")
		err := Move(oldFilePath, newFilePath)
		assert.Error(t, err)
	})
}
