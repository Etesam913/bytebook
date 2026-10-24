package ingest

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/notes/sidecar"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/fsnotify/fsnotify"
	"github.com/stretchr/testify/assert"
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
	holder := search.NewIndexHolder(index)

	watcher, err := fsnotify.NewWatcher()
	require.NoError(t, err)
	defer watcher.Close()

	notes.AddProjectFoldersToWatcher(projectDir, watcher)

	registry := notes.NewDirectoryWatchRegistry()
	registry.SyncFromWatcher(watcher)

	coordinator := NewBulkImportCoordinator(projectDir, holder, watcher, registry)
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

func TestNormalizeNotesRelativeDirectoryPath(t *testing.T) {
	t.Run("Empty path represents the notes root", func(t *testing.T) {
		path, ok := normalizeNotesRelativeDirectoryPath("")

		assert.True(t, ok)
		assert.Empty(t, path)
	})
	t.Run("Dot represents the notes root", func(t *testing.T) {
		path, ok := normalizeNotesRelativeDirectoryPath(".")

		assert.True(t, ok)
		assert.Empty(t, path)
	})
	t.Run("Path cleaned to dot represents the notes root", func(t *testing.T) {
		path, ok := normalizeNotesRelativeDirectoryPath("a/..")

		assert.True(t, ok)
		assert.Empty(t, path)
	})
	t.Run("Cleans redundant separators and dot segments", func(t *testing.T) {
		path, ok := normalizeNotesRelativeDirectoryPath("./a//b/./")

		assert.True(t, ok)
		assert.Equal(t, filepath.Join("a", "b"), path)
	})
	t.Run("Allows dots inside visible directory names", func(t *testing.T) {
		path, ok := normalizeNotesRelativeDirectoryPath("a.b/c.d")

		assert.True(t, ok)
		assert.Equal(t, filepath.Join("a.b", "c.d"), path)
	})
	t.Run("Rejects absolute paths", func(t *testing.T) {
		path, ok := normalizeNotesRelativeDirectoryPath(filepath.Join(t.TempDir(), "a"))

		assert.False(t, ok)
		assert.Empty(t, path)
	})
	t.Run("Rejects the parent directory", func(t *testing.T) {
		path, ok := normalizeNotesRelativeDirectoryPath("..")

		assert.False(t, ok)
		assert.Empty(t, path)
	})
	t.Run("Rejects traversal outside the notes root", func(t *testing.T) {
		path, ok := normalizeNotesRelativeDirectoryPath("a/../../b")

		assert.False(t, ok)
		assert.Empty(t, path)
	})
	t.Run("Rejects a hidden final directory", func(t *testing.T) {
		path, ok := normalizeNotesRelativeDirectoryPath("a/.hidden")

		assert.False(t, ok)
		assert.Empty(t, path)
	})
	t.Run("Rejects a hidden first directory", func(t *testing.T) {
		path, ok := normalizeNotesRelativeDirectoryPath(".hidden/b")

		assert.False(t, ok)
		assert.Empty(t, path)
	})
	t.Run("Rejects a hidden intermediate directory", func(t *testing.T) {
		path, ok := normalizeNotesRelativeDirectoryPath("a/.hidden/b")

		assert.False(t, ok)
		assert.Empty(t, path)
	})
}

func TestPathCovers(t *testing.T) {
	t.Run("Root covers every subtree", func(t *testing.T) {
		assert.True(t, pathCovers("", "a/b"))
		assert.True(t, pathCovers("", ""))
	})
	t.Run("A path covers itself", func(t *testing.T) {
		assert.True(t, pathCovers("a", "a"))
	})
	t.Run("A parent covers nested descendants", func(t *testing.T) {
		assert.True(t, pathCovers("a", filepath.Join("a", "b", "c")))
	})
	t.Run("A shared prefix does not cover a sibling", func(t *testing.T) {
		assert.False(t, pathCovers("a", "ab"))
		assert.False(t, pathCovers("a", filepath.Join("ab", "c")))
	})
	t.Run("A child does not cover its parent or root", func(t *testing.T) {
		assert.False(t, pathCovers(filepath.Join("a", "b"), "a"))
		assert.False(t, pathCovers("a", ""))
	})
}

// Leave the worker stopped so queue coalescing can be tested without timing races.
func newQueuedImportCoordinator() *BulkImportCoordinator {
	return &BulkImportCoordinator{
		pending:  make(util.Set[string]),
		inFlight: make(util.Set[string]),
		jobs:     make(chan importRequest, bulkImportQueueSize),
		close:    make(chan struct{}),
	}
}

func TestBulkImportCoordinatorDeduplication(t *testing.T) {
	t.Run("Coalesces normalized duplicates and descendants of a pending parent", func(t *testing.T) {
		coordinator := newQueuedImportCoordinator()

		coordinator.EnqueueFolderImport("./a//")
		coordinator.EnqueueFolderImport("a")
		coordinator.EnqueueFolderImport("a/b")

		assert.Equal(t, util.Set[string]{"a": {}}, coordinator.pending)
		require.Len(t, coordinator.jobs, 1)
		assert.Equal(t, importRequest{relativeFolderPath: "a", settleDelay: bulkImportSettleDelay}, <-coordinator.jobs)
	})
	t.Run("A broader parent supersedes queued descendants but preserves siblings", func(t *testing.T) {
		coordinator := newQueuedImportCoordinator()
		coordinator.EnqueueFolderImport("a/b")
		coordinator.EnqueueFolderImport("a/c/d")
		coordinator.EnqueueFolderImport("ab")

		coordinator.EnqueueFolderImport("a")

		assert.Equal(t, util.Set[string]{"a": {}, "ab": {}}, coordinator.pending)
		require.Len(t, coordinator.jobs, 4)
		assert.False(t, coordinator.startRequest((<-coordinator.jobs).relativeFolderPath))
		assert.False(t, coordinator.startRequest((<-coordinator.jobs).relativeFolderPath))
		assert.True(t, coordinator.startRequest((<-coordinator.jobs).relativeFolderPath))
		assert.True(t, coordinator.startRequest((<-coordinator.jobs).relativeFolderPath))
		assert.Equal(t, util.Set[string]{"a": {}, "ab": {}}, coordinator.inFlight)
		assert.Empty(t, coordinator.pending)
	})
	t.Run("Coalesces duplicates and descendants of an in-flight parent", func(t *testing.T) {
		coordinator := newQueuedImportCoordinator()
		coordinator.EnqueueFolderImport("a")
		require.True(t, coordinator.startRequest((<-coordinator.jobs).relativeFolderPath))

		coordinator.EnqueueFolderImport("a")
		coordinator.EnqueueFolderImport("a/b")
		coordinator.EnqueueFolderImport("ab")

		assert.Equal(t, util.Set[string]{"a": {}}, coordinator.inFlight)
		assert.Equal(t, util.Set[string]{"ab": {}}, coordinator.pending)
		assert.Len(t, coordinator.jobs, 1)
	})
	t.Run("Queues a broader parent while a child is in flight", func(t *testing.T) {
		coordinator := newQueuedImportCoordinator()
		coordinator.EnqueueFolderImport("a/b")
		require.True(t, coordinator.startRequest((<-coordinator.jobs).relativeFolderPath))

		coordinator.EnqueueFolderImport("a")

		assert.Equal(t, util.Set[string]{"a/b": {}}, coordinator.inFlight)
		assert.Equal(t, util.Set[string]{"a": {}}, coordinator.pending)
		assert.Len(t, coordinator.jobs, 1)
	})
	t.Run("An initial scan supersedes pending subtrees and covers further requests", func(t *testing.T) {
		coordinator := newQueuedImportCoordinator()
		coordinator.EnqueueFolderImport("a")

		coordinator.EnqueueInitialScan()
		coordinator.EnqueueFolderImport("b")

		assert.Equal(t, util.Set[string]{"": {}}, coordinator.pending)
		require.Len(t, coordinator.jobs, 2)
		assert.False(t, coordinator.startRequest((<-coordinator.jobs).relativeFolderPath))
		require.Len(t, coordinator.jobs, 1)
		request := <-coordinator.jobs
		assert.Equal(t, importRequest{}, request)
		assert.True(t, coordinator.startRequest(request.relativeFolderPath))
	})
	t.Run("An in-flight initial scan covers all subtrees", func(t *testing.T) {
		coordinator := newQueuedImportCoordinator()
		coordinator.EnqueueInitialScan()
		require.True(t, coordinator.startRequest((<-coordinator.jobs).relativeFolderPath))

		coordinator.EnqueueFolderImport("a/b")
		coordinator.EnqueueInitialScan()

		assert.Empty(t, coordinator.pending)
		assert.Empty(t, coordinator.jobs)
	})
	t.Run("A finished subtree can be queued again", func(t *testing.T) {
		coordinator := newQueuedImportCoordinator()
		coordinator.EnqueueFolderImport("a")
		require.True(t, coordinator.startRequest((<-coordinator.jobs).relativeFolderPath))

		coordinator.finishRequest("a")
		coordinator.EnqueueFolderImport("a")

		assert.Empty(t, coordinator.inFlight)
		assert.Equal(t, util.Set[string]{"a": {}}, coordinator.pending)
		assert.Len(t, coordinator.jobs, 1)
	})
	t.Run("Hidden subtree requests never enter the queue", func(t *testing.T) {
		coordinator := newQueuedImportCoordinator()

		coordinator.EnqueueFolderImport("a/.hidden/b")

		assert.Empty(t, coordinator.pending)
		assert.Empty(t, coordinator.jobs)
	})
}

func TestFolderIndexLifecycle(t *testing.T) {
	project := t.TempDir()
	root := filepath.Join(project, "notes")
	for _, path := range []string{"Parent/Empty", "Other", ".hidden/Empty"} {
		require.NoError(t, os.MkdirAll(filepath.Join(root, path), 0755))
	}
	index, err := search.OpenOrCreateIndex(project)
	require.NoError(t, err)
	defer index.Close()
	watcher, err := fsnotify.NewWatcher()
	require.NoError(t, err)
	defer watcher.Close()
	coordinator := NewBulkImportCoordinator(project, search.NewIndexHolder(index), watcher, notes.NewDirectoryWatchRegistry())
	defer coordinator.Shutdown()
	batch := index.NewBatch()
	require.NoError(t, search.AddFolderToBatch(batch, "Missing"))
	require.NoError(t, index.Batch(batch))

	coordinator.processRequest("Parent")

	doc, err := index.Document("Parent/Empty/")
	require.NoError(t, err)
	assert.NotNil(t, doc, "empty folders must be indexed during partial imports")
	doc, err = index.Document("Missing/")
	require.NoError(t, err)
	assert.NotNil(t, doc, "partial imports must not prune other folders")
	coordinator.processRequest("")
	for _, id := range []string{"Parent/", "Parent/Empty/", "Other/"} {
		doc, err := index.Document(id)
		require.NoError(t, err)
		assert.NotNil(t, doc)
	}
	for _, id := range []string{"Missing/", ".hidden/", ".hidden/Empty/", "./"} {
		doc, err := index.Document(id)
		require.NoError(t, err)
		assert.Nil(t, doc)
	}
	// A directory created after discovery must survive reconciliation.
	require.NoError(t, os.MkdirAll(filepath.Join(root, "Later"), 0755))
	batch = index.NewBatch()
	require.NoError(t, search.AddFolderToBatch(batch, "Later"))
	require.NoError(t, index.Batch(batch))
	require.NoError(t, search.ReconcileDocuments(project, nil, nil, index))
	doc, err = index.Document("Later/")
	require.NoError(t, err)
	assert.NotNil(t, doc)
	// Failed discovery must not prune the index.
	require.NoError(t, os.Rename(root, root+"-unavailable"))
	coordinator.processRequest("")
	doc, err = index.Document("Parent/Empty/")
	require.NoError(t, err)
	assert.NotNil(t, doc)
}

func TestStartupCatchUpReconcilesFiles(t *testing.T) {
	setup := func(t *testing.T) (*BulkImportCoordinator, bleve.Index, string) {
		t.Helper()
		project := t.TempDir()
		root := filepath.Join(project, "notes")
		require.NoError(t, os.MkdirAll(filepath.Join(root, "nested"), 0755))
		write := func(path, content string) {
			require.NoError(t, os.WriteFile(filepath.Join(root, path), []byte(content), 0644))
		}
		write("note.md", "---\ntags: [oldtag]\n---\nobsoleteword")
		write("nested/renamed.md", "movedword")
		write("deleted.md", "deletedword")
		write("asset.png", "old")
		write("deleted.png", "attachment")
		require.NoError(t, sidecar.WriteTags(project, "", "asset.png", []string{"oldtag"}))
		index, err := search.OpenOrCreateIndex(project)
		require.NoError(t, err)
		t.Cleanup(func() { require.NoError(t, index.Close()) })
		watcher, err := fsnotify.NewWatcher()
		require.NoError(t, err)
		t.Cleanup(func() { require.NoError(t, watcher.Close()) })
		coordinator := NewBulkImportCoordinator(project, search.NewIndexHolder(index), watcher, notes.NewDirectoryWatchRegistry())
		t.Cleanup(coordinator.Shutdown)
		coordinator.processRequest("")

		// Simulate changes made while the app was closed, without watcher event handlers.
		write("note.md", "---\ntags: [newtag]\n---\ncurrentword")
		write("asset.png", "larger attachment")
		require.NoError(t, sidecar.WriteTags(project, "", "asset.png", []string{"newtag"}))
		require.NoError(t, os.Rename(filepath.Join(root, "nested/renamed.md"), filepath.Join(root, "nested/moved.md")))
		require.NoError(t, os.Remove(filepath.Join(root, "deleted.md")))
		require.NoError(t, os.Remove(filepath.Join(root, "deleted.png")))
		write("added.md", "addedword")
		return coordinator, index, root
	}

	t.Run("Partial imports preserve stale documents", func(t *testing.T) {
		// Arrange
		coordinator, index, _ := setup(t)

		// Act
		coordinator.processRequest("nested")

		// Assert
		for _, id := range []string{"deleted.md", "deleted.png", "nested/renamed.md"} {
			doc, err := index.Document(id)
			require.NoError(t, err)
			assert.NotNil(t, doc, "partial scans must not prune: %s", id)
		}
	})

	t.Run("Full scans refresh content and metadata and prune stale documents", func(t *testing.T) {
		// Arrange
		coordinator, index, _ := setup(t)

		// Act
		coordinator.processRequest("")

		// Assert
		for _, id := range []string{"deleted.md", "deleted.png", "nested/renamed.md"} {
			doc, err := index.Document(id)
			require.NoError(t, err)
			assert.Nil(t, doc, id)
		}
		for _, id := range []string{"note.md", "asset.png", "nested/moved.md", "added.md"} {
			doc, err := index.Document(id)
			require.NoError(t, err)
			assert.NotNil(t, doc, id)
		}
		for _, term := range []string{"obsoleteword", "oldtag"} {
			result, err := index.Search(bleve.NewSearchRequest(bleve.NewMatchQuery(term)))
			require.NoError(t, err)
			assert.Zero(t, result.Total, term)
		}
		query := bleve.NewTermQuery("newtag")
		query.SetField(search.FieldTags)
		request := bleve.NewSearchRequest(query)
		request.Fields = []string{search.FieldSize}
		result, err := index.Search(request)
		require.NoError(t, err)
		require.Len(t, result.Hits, 2, "both note frontmatter and attachment sidecar tags must refresh")
		for _, hit := range result.Hits {
			if hit.ID == "asset.png" {
				assert.Equal(t, float64(len("larger attachment")), hit.Fields[search.FieldSize])
			}
		}
		result, err = index.Search(bleve.NewSearchRequest(bleve.NewMatchQuery("currentword")))
		require.NoError(t, err)
		require.Len(t, result.Hits, 1)
		assert.Equal(t, "note.md", result.Hits[0].ID)
	})

	t.Run("Failed indexing preserves stale documents", func(t *testing.T) {
		// Arrange
		coordinator, index, root := setup(t)
		require.NoError(t, os.Symlink("unreadable.md", filepath.Join(root, "unreadable.md")))

		// Act
		coordinator.processRequest("")

		// Assert
		for _, id := range []string{"deleted.md", "deleted.png", "nested/renamed.md"} {
			doc, err := index.Document(id)
			require.NoError(t, err)
			assert.NotNil(t, doc, "failed indexing must not prune: %s", id)
		}
	})

	t.Run("An empty full scan removes all stale documents", func(t *testing.T) {
		// Arrange
		coordinator, index, root := setup(t)
		require.NoError(t, os.RemoveAll(root))
		require.NoError(t, os.MkdirAll(root, 0755))

		// Act
		coordinator.processRequest("")

		// Assert
		count, err := index.DocCount()
		require.NoError(t, err)
		assert.Zero(t, count)
	})
}
