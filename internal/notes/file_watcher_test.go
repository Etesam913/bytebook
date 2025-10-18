package notes

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/fsnotify/fsnotify"
	"github.com/stretchr/testify/assert"
)

func TestAddProjectFoldersToWatcher(t *testing.T) {
	t.Run("should add project folders to watcher", func(t *testing.T) {
		// Create test directories using t.TempDir()
		testDir := t.TempDir()
		settingsDir := filepath.Join(testDir, "settings")
		notesDir := filepath.Join(testDir, "notes")

		// Create the directories
		err := os.MkdirAll(settingsDir, 0755)
		assert.NoError(t, err)
		err = os.MkdirAll(notesDir, 0755)
		assert.NoError(t, err)
		assert.NoError(t, err)

		// No need for manual cleanup with t.TempDir()

		watcher, err := fsnotify.NewWatcher()
		assert.NoError(t, err)
		defer watcher.Close()

		AddProjectFoldersToWatcher(testDir, watcher)

		assert.Equal(t, 2, len(watcher.WatchList()))
		assert.Contains(t, watcher.WatchList(), notesDir)
		assert.Contains(t, watcher.WatchList(), settingsDir)
	})
}
