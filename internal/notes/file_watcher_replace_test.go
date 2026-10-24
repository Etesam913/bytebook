package notes

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/etesam913/bytebook/internal/testutil"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/fsnotify/fsnotify"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWatcherFileReplacement(t *testing.T) {
	t.Run("remove then create becomes a write with the final content", func(t *testing.T) {
		project, _, root, _, _ := setupProjectFolders(t)
		path := testutil.WriteFile(t, root, "note.md", []byte("before"))
		fw := newTestFileWatcher(t, project)
		replacement := testutil.WriteFile(t, t.TempDir(), "replacement.md", []byte("after"))

		// Model Finder Replace: overwrite the path, then deliver Remove followed by Create.
		require.NoError(t, os.Rename(replacement, path))
		fw.processEvent(fsnotify.Event{Name: path, Op: fsnotify.Remove})
		fw.processEvent(fsnotify.Event{Name: path, Op: fsnotify.Create})
		fw.resolvePendingRenames(false)

		// Only a content update should reach consumers, preserving pins and the open route.
		assert.Empty(t, fw.batch.fileDeletes)
		assert.Empty(t, fw.batch.fileCreates)
		assert.Equal(t, []util.FileWriteEventData{{FilePath: "note.md", Markdown: "after"}}, fw.batch.fileWrites)
	})
}

func TestWatcherReplacementEventOrder(t *testing.T) {
	t.Run("create before remove still updates empty content", func(t *testing.T) {
		project, _, root, _, _ := setupProjectFolders(t)
		path := testutil.WriteFile(t, root, "note.md", []byte("before"))
		fw := newTestFileWatcher(t, project)
		fw.hasFileChanged(path)

		// Deliver events in reverse order; the final empty file still replaces the old contents.
		require.NoError(t, os.Remove(path))
		require.NoError(t, os.WriteFile(path, nil, 0644))
		fw.processEvent(fsnotify.Event{Name: path, Op: fsnotify.Create})
		fw.processEvent(fsnotify.Event{Name: path, Op: fsnotify.Remove})
		fw.resolvePendingRenames(false)

		events := fw.batch.events()
		require.Len(t, events, 1)
		assert.Equal(t, util.EventFileWrite, events[0].Name)
		assert.Equal(t, []util.FileWriteEventData{{FilePath: "note.md", Markdown: ""}}, events[0].Data)
	})
	t.Run("real deletion and unrelated create remain separate", func(t *testing.T) {
		project, _, root, _, _ := setupProjectFolders(t)
		fw := newTestFileWatcher(t, project)
		path := testutil.WriteFile(t, root, "copy.md", []byte("other"))

		// A missing path and a different existing path are independent operations.
		fw.processEvent(fsnotify.Event{Name: filepath.Join(root, "deleted.md"), Op: fsnotify.Remove})
		fw.processEvent(fsnotify.Event{Name: path, Op: fsnotify.Create})
		fw.resolvePendingRenames(false)

		assert.Equal(t, []util.FileDeleteEventData{{FilePath: "deleted.md"}}, fw.batch.fileDeletes)
		assert.Equal(t, []util.FileCreateEventData{{FilePath: "copy.md"}}, fw.batch.fileCreates)
		assert.Empty(t, fw.batch.fileWrites)
	})
}

func TestNativeWatcherReplacement(t *testing.T) {
	project, _, root, _, _ := setupProjectFolders(t)
	path := testutil.WriteFile(t, root, "note.md", []byte("before"))
	fw := newTestFileWatcher(t, project)
	fw.addFolderTreeToWatcher(root)
	fw.hasFileChanged(path)
	info, err := os.Stat(path)
	require.NoError(t, err)
	// Preserve size and timestamp so replacement detection cannot rely on the write cache.
	replacement := testutil.WriteFile(t, t.TempDir(), "replacement.md", []byte("after!"))
	require.NoError(t, os.Chtimes(replacement, info.ModTime(), info.ModTime()))

	require.NoError(t, os.Rename(replacement, path))
	// Let the native fsnotify backend supply the replacement events through one debounce.
	deadline := time.NewTimer(3 * time.Second)
	defer deadline.Stop()
collect:
	for {
		select {
		case event := <-fw.watcher.Events:
			fw.processEvent(event)
		case err := <-fw.watcher.Errors:
			require.NoError(t, err)
		case <-fw.debounceTimer.C:
			break collect
		case <-deadline.C:
			t.Fatal("timed out waiting for replacement events")
		}
	}
	fw.resolvePendingRenames(false)

	events := fw.batch.events()
	require.Len(t, events, 1)
	assert.Equal(t, util.EventFileWrite, events[0].Name)
	assert.Equal(t, []util.FileWriteEventData{{FilePath: "note.md", Markdown: "after!"}}, events[0].Data)
	// Remember the replacement identity so a later rename can still be matched.
	assert.NotNil(t, fw.knownWatchedDirectories.fileInfo(path))
}
