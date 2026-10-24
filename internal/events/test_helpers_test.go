package events

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/ingest"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/testutil"
	"github.com/fsnotify/fsnotify"
	"github.com/stretchr/testify/require"
)

// createTestIndex creates a temporary Bleve index for testing
func createTestIndex(t *testing.T) bleve.Index {
	t.Helper()
	tmpDir := t.TempDir()
	index, err := search.OpenOrCreateIndex(tmpDir)
	require.NoError(t, err)
	t.Cleanup(func() {
		index.Close()
	})
	return index
}

// createTestParams creates an EventParams struct with a test index and a running
// import coordinator, matching the production wiring in main.go
func createTestParams(t *testing.T) EventParams {
	t.Helper()
	index := createTestIndex(t)
	projectPath := t.TempDir()
	holder := search.NewIndexHolder(index)

	watcher, err := fsnotify.NewWatcher()
	require.NoError(t, err)
	t.Cleanup(func() { watcher.Close() })

	registry := notes.NewDirectoryWatchRegistry()
	coordinator := ingest.NewBulkImportCoordinator(projectPath, holder, watcher, registry)
	t.Cleanup(coordinator.Shutdown)

	return EventParams{
		App:               nil, // Not needed for these tests
		ProjectPath:       projectPath,
		Index:             holder,
		ImportCoordinator: coordinator,
	}
}

// rawIndex returns the underlying bleve index from a test EventParams for
// assertions. Tests are single-goroutine so holding the read lock is not
// strictly required, but this mirrors how production code accesses the index.
func rawIndex(params EventParams) bleve.Index {
	idx := params.Index.RLock()
	params.Index.RUnlock()
	return idx
}

func createNoteInFolder(t *testing.T, projectPath, folderPath, fileName, content string) {
	t.Helper()
	createNoteFile(t, filepath.Join(projectPath, "notes"), folderPath, fileName, content)
}

// setupNotesDir creates a notes directory structure for testing
func setupNotesDir(t *testing.T, projectPath string) string {
	t.Helper()
	notesDir := filepath.Join(projectPath, "notes")
	err := os.MkdirAll(notesDir, 0755)
	require.NoError(t, err)
	return notesDir
}

func createNoteFile(t *testing.T, notesDir, folder, noteName, content string) {
	t.Helper()
	testutil.WriteFile(t, notesDir, filepath.Join(folder, noteName), []byte(content))
}
