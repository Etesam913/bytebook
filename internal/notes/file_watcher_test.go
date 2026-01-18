package notes

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/fsnotify/fsnotify"
	"github.com/stretchr/testify/assert"
)

func TestShouldIgnoreFile(t *testing.T) {
	t.Run("should ignore .DS_Store files", func(t *testing.T) {
		assert.True(t, shouldIgnoreFile(".DS_Store"))
	})

	t.Run("should ignore other hidden files", func(t *testing.T) {
		assert.True(t, shouldIgnoreFile(".gitignore"))
		assert.True(t, shouldIgnoreFile(".env"))
		assert.True(t, shouldIgnoreFile(".hidden"))
	})

	t.Run("should not ignore hidden markdown files", func(t *testing.T) {
		assert.False(t, shouldIgnoreFile(".hidden.md"))
		assert.False(t, shouldIgnoreFile(".note.md"))
	})

	t.Run("should not ignore regular files", func(t *testing.T) {
		assert.False(t, shouldIgnoreFile("note.md"))
		assert.False(t, shouldIgnoreFile("document.txt"))
		assert.False(t, shouldIgnoreFile("image.png"))
	})
}

func TestAddProjectFoldersToWatcher(t *testing.T) {
	t.Run("should add project folders to watcher", func(t *testing.T) {
		// Create test directories using t.TempDir()
		testDir := t.TempDir()
		settingsDir := filepath.Join(testDir, "settings")
		notesDir := filepath.Join(testDir, "notes")
		alphaDir := filepath.Join(notesDir, "alpha")
		betaDir := filepath.Join(alphaDir, "beta")
		gammaDir := filepath.Join(notesDir, "gamma")
		rootNotePath := filepath.Join(notesDir, "root.md")
		betaNotePath := filepath.Join(betaDir, "note1.md")
		gammaNotePath := filepath.Join(gammaDir, "note2.md")

		// Create the directories
		err := os.MkdirAll(settingsDir, 0755)
		assert.NoError(t, err)
		err = os.MkdirAll(betaDir, 0755)
		assert.NoError(t, err)
		err = os.MkdirAll(gammaDir, 0755)
		assert.NoError(t, err)
		err = os.WriteFile(rootNotePath, []byte("root"), 0644)
		assert.NoError(t, err)
		err = os.WriteFile(betaNotePath, []byte("beta"), 0644)
		assert.NoError(t, err)
		err = os.WriteFile(gammaNotePath, []byte("gamma"), 0644)
		assert.NoError(t, err)

		// No need for manual cleanup with t.TempDir()

		watcher, err := fsnotify.NewWatcher()
		assert.NoError(t, err)
		defer watcher.Close()

		AddProjectFoldersToWatcher(testDir, watcher)

		assert.Equal(t, 8, len(watcher.WatchList()))
		assert.Contains(t, watcher.WatchList(), notesDir)
		assert.Contains(t, watcher.WatchList(), settingsDir)
		assert.Contains(t, watcher.WatchList(), alphaDir)
		assert.Contains(t, watcher.WatchList(), betaDir)
		assert.Contains(t, watcher.WatchList(), gammaDir)
		assert.Contains(t, watcher.WatchList(), rootNotePath)
		assert.Contains(t, watcher.WatchList(), betaNotePath)
		assert.Contains(t, watcher.WatchList(), gammaNotePath)
	})
}
