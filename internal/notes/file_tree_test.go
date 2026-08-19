package notes

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetAllPaths(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "file_tree_all_paths_test")
	assert.NoError(t, err)
	defer os.RemoveAll(tempDir)

	notesDir := filepath.Join(tempDir, "notes")
	assert.NoError(t, os.Mkdir(notesDir, 0755))

	assert.NoError(t, os.Mkdir(filepath.Join(notesDir, "folder-a"), 0755))
	assert.NoError(t, os.Mkdir(filepath.Join(notesDir, "folder-a", "nested"), 0755))
	assert.NoError(t, os.Mkdir(filepath.Join(notesDir, "folder-b"), 0755))
	assert.NoError(t, os.WriteFile(filepath.Join(notesDir, "folder-a", "note.md"), []byte("content"), 0644))
	assert.NoError(t, os.WriteFile(filepath.Join(notesDir, "folder-a", "nested", "deep.md"), []byte("content"), 0644))
	assert.NoError(t, os.WriteFile(filepath.Join(notesDir, "top.md"), []byte("content"), 0644))

	// Hidden entries should be skipped, including everything inside hidden dirs
	assert.NoError(t, os.WriteFile(filepath.Join(notesDir, ".DS_Store"), []byte("content"), 0644))
	assert.NoError(t, os.Mkdir(filepath.Join(notesDir, ".hidden_dir"), 0755))
	assert.NoError(t, os.WriteFile(filepath.Join(notesDir, ".hidden_dir", "inside.md"), []byte("content"), 0644))

	t.Run("returns sorted paths with trailing slashes on directories", func(t *testing.T) {
		paths, err := GetAllPaths(tempDir)
		assert.NoError(t, err)
		assert.Equal(t, []string{
			"folder-a/",
			"folder-a/nested/",
			"folder-a/nested/deep.md",
			"folder-a/note.md",
			"folder-b/",
			"top.md",
		}, paths)
	})

	t.Run("errors when notes directory does not exist", func(t *testing.T) {
		_, err := GetAllPaths(filepath.Join(tempDir, "nonexistent"))
		assert.Error(t, err)
	})

	t.Run("skips unreadable directories instead of failing the whole walk", func(t *testing.T) {
		isolatedDir := t.TempDir()
		isolatedNotes := filepath.Join(isolatedDir, "notes")
		require.NoError(t, os.MkdirAll(filepath.Join(isolatedNotes, "readable"), 0755))
		require.NoError(t, os.WriteFile(filepath.Join(isolatedNotes, "readable", "a.md"), []byte("content"), 0644))

		locked := filepath.Join(isolatedNotes, "locked")
		require.NoError(t, os.Mkdir(locked, 0755))
		require.NoError(t, os.Chmod(locked, 0000))
		// Restore permissions so t.TempDir's cleanup can remove the directory.
		t.Cleanup(func() { _ = os.Chmod(locked, 0755) })

		paths, err := GetAllPaths(isolatedDir)
		require.NoError(t, err)
		assert.Contains(t, paths, "readable/")
		assert.Contains(t, paths, "readable/a.md")
		// The directory itself is still listed; only its contents are skipped.
		assert.Contains(t, paths, "locked/")
	})
}
