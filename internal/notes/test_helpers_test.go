package notes

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/fsnotify/fsnotify"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupProjectFolders creates the basic project folder structure (settings, notes, search)
// and returns the paths. It also creates saved-searches.json.
func setupProjectFolders(t *testing.T) (string, string, string, string, string) {
	t.Helper()
	testDir := t.TempDir()
	settingsDir := filepath.Join(testDir, "settings")
	notesDir := filepath.Join(testDir, "notes")
	searchDir := filepath.Join(testDir, "search")
	savedSearchesPath := filepath.Join(searchDir, "saved-searches.json")

	err := os.MkdirAll(settingsDir, 0755)
	require.NoError(t, err)
	err = os.MkdirAll(searchDir, 0755)
	require.NoError(t, err)
	err = os.MkdirAll(notesDir, 0755)
	require.NoError(t, err)
	err = os.WriteFile(savedSearchesPath, []byte("{}"), 0644)
	require.NoError(t, err)

	return testDir, settingsDir, notesDir, searchDir, savedSearchesPath
}

func newTestFileWatcher(t *testing.T, projectPath string) *FileWatcher {
	t.Helper()

	watcher := newTestWatcher(t)

	registry := NewDirectoryWatchRegistry()
	registry.SyncFromWatcher(watcher)

	fw := newFileWatcher(nil, projectPath, watcher, registry)
	if !fw.debounceTimer.Stop() {
		select {
		case <-fw.debounceTimer.C:
		default:
		}
	}

	return fw
}

func newTestWatcher(t *testing.T) *fsnotify.Watcher {
	t.Helper()
	watcher, err := fsnotify.NewWatcher()
	require.NoError(t, err)
	t.Cleanup(func() { assert.NoError(t, watcher.Close()) })
	return watcher
}

func setupNotesFolder(t *testing.T) (project, folder string) {
	t.Helper()
	project = t.TempDir()
	folder = filepath.Join(project, "notes", "test-folder")
	require.NoError(t, os.MkdirAll(folder, 0o755))
	return
}
