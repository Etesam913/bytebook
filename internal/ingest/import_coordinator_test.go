package ingest

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/fsnotify/fsnotify"
	"github.com/stretchr/testify/require"
)

func TestBulkImportCoordinatorInitialScan(t *testing.T) {
	projectDir := t.TempDir()
	settingsDir := filepath.Join(projectDir, "settings")
	notesDir := filepath.Join(projectDir, "notes")
	searchDir := filepath.Join(projectDir, "search")
	require.NoError(t, os.MkdirAll(settingsDir, 0755))
	require.NoError(t, os.MkdirAll(notesDir, 0755))
	require.NoError(t, os.MkdirAll(searchDir, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(searchDir, "saved-searches.json"), []byte("{}"), 0644))

	nestedDir := filepath.Join(notesDir, "alpha", "beta")
	require.NoError(t, os.MkdirAll(nestedDir, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(notesDir, "root.md"), []byte("# root"), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(nestedDir, "deep.md"), []byte("# deep"), 0644))

	index, err := search.OpenOrCreateIndex(projectDir)
	require.NoError(t, err)
	defer index.Close()

	watcher, err := fsnotify.NewWatcher()
	require.NoError(t, err)
	defer watcher.Close()

	notes.AddProjectFoldersToWatcher(projectDir, watcher)

	registry := notes.NewDirectoryWatchRegistry()
	registry.SyncFromWatcher(watcher)

	coordinator := NewBulkImportCoordinator(projectDir, &index, watcher, registry)
	defer coordinator.Shutdown()

	coordinator.EnqueueInitialScan()

	require.Eventually(t, func() bool {
		doc, err := index.Document(filepath.Join("alpha", "beta", "deep.md"))
		return err == nil && doc != nil
	}, 5*time.Second, 50*time.Millisecond)

	require.Eventually(t, func() bool {
		return registry.Has(filepath.Join(notesDir, "alpha")) &&
			registry.Has(nestedDir)
	}, 5*time.Second, 50*time.Millisecond)
}
