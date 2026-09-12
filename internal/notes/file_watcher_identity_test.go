package notes

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/fsnotify/fsnotify"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWatcherRenameIdentity(t *testing.T) {
	t.Run("pairs several real moves despite reversed creates and an unrelated copy", func(t *testing.T) {
		project, _, root, _, _ := setupProjectFolders(t)
		require.NoError(t, os.Mkdir(filepath.Join(root, "dest"), 0755))
		// Identical contents ensure pairing must use filesystem identity.
		for _, name := range []string{"a.md", "b.png"} {
			require.NoError(t, os.WriteFile(filepath.Join(root, name), []byte("same content"), 0644))
		}
		fw := newTestFileWatcher(t, project)
		fw.addFolderTreeToWatcher(root)

		for _, name := range []string{"a.md", "b.png"} {
			require.NoError(t, os.Rename(filepath.Join(root, name), filepath.Join(root, "dest", name)))
			fw.processEvent(fsnotify.Event{Name: filepath.Join(root, name), Op: fsnotify.Rename})
		}
		require.NoError(t, os.WriteFile(filepath.Join(root, "copy.md"), []byte("same content"), 0644))
		// Reverse the destinations and mix in a copy to rule out event-order pairing.
		for _, name := range []string{"dest/b.png", "copy.md", "dest/a.md"} {
			fw.processEvent(fsnotify.Event{Name: filepath.Join(root, name), Op: fsnotify.Create})
		}
		fw.resolvePendingRenames(false)

		assert.ElementsMatch(t, []util.FileRenameEventData{
			{OldFilePath: "a.md", NewFilePath: "dest/a.md"},
			{OldFilePath: "b.png", NewFilePath: "dest/b.png"},
		}, fw.batch.fileRenames)
		assert.Empty(t, fw.batch.fileDeletes)
		assert.Equal(t, []util.FileCreateEventData{{FilePath: "copy.md"}}, fw.batch.fileCreates)
	})
	t.Run("does not pair a move out with an unrelated create", func(t *testing.T) {
		project, _, root, _, _ := setupProjectFolders(t)
		oldPath := filepath.Join(root, "old.md")
		newPath := filepath.Join(root, "unrelated.md")
		require.NoError(t, os.WriteFile(oldPath, []byte("same"), 0644))
		fw := newTestFileWatcher(t, project)
		fw.addFolderTreeToWatcher(root)

		// A move out and an unrelated copy in share a batch and even the same contents.
		require.NoError(t, os.Rename(oldPath, filepath.Join(t.TempDir(), "old.md")))
		require.NoError(t, os.WriteFile(newPath, []byte("same"), 0644))
		fw.processEvent(fsnotify.Event{Name: oldPath, Op: fsnotify.Rename})
		fw.processEvent(fsnotify.Event{Name: newPath, Op: fsnotify.Create})
		fw.resolvePendingRenames(false)

		assert.Empty(t, fw.batch.fileRenames)
		assert.Equal(t, []util.FileDeleteEventData{{FilePath: "old.md"}}, fw.batch.fileDeletes)
		assert.Equal(t, []util.FileCreateEventData{{FilePath: "unrelated.md"}}, fw.batch.fileCreates)
	})
}

func TestNativeWatcherBatchRenames(t *testing.T) {
	project, _, root, _, _ := setupProjectFolders(t)
	require.NoError(t, os.Mkdir(filepath.Join(root, "dest"), 0755))
	for _, name := range []string{"a.md", "b.png"} {
		require.NoError(t, os.WriteFile(filepath.Join(root, name), []byte("content"), 0644))
	}
	fw := newTestFileWatcher(t, project)
	fw.addFolderTreeToWatcher(root)

	for _, name := range []string{"a.md", "b.png"} {
		require.NoError(t, os.Rename(filepath.Join(root, name), filepath.Join(root, "dest", name)))
	}
	// Collect real OS events until the watcher debounce fires, without prescribing their order.
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
			t.Fatal("timed out waiting for filesystem rename events")
		}
	}
	fw.resolvePendingRenames(false)

	assert.ElementsMatch(t, []util.FileRenameEventData{
		{OldFilePath: "a.md", NewFilePath: "dest/a.md"},
		{OldFilePath: "b.png", NewFilePath: "dest/b.png"},
	}, fw.batch.fileRenames)
	assert.Empty(t, fw.batch.fileDeletes)
}

func TestWatcherAmbiguousIdentity(t *testing.T) {
	project, _, root, _, _ := setupProjectFolders(t)
	oldPath := filepath.Join(root, "old.md")
	require.NoError(t, os.WriteFile(oldPath, []byte("same"), 0644))
	fw := newTestFileWatcher(t, project)
	fw.addFolderTreeToWatcher(root)

	require.NoError(t, os.Rename(oldPath, filepath.Join(root, "first.md")))
	// Hard links share an identity, so neither destination can be chosen safely.
	require.NoError(t, os.Link(filepath.Join(root, "first.md"), filepath.Join(root, "second.md")))
	fw.processEvent(fsnotify.Event{Name: oldPath, Op: fsnotify.Rename})
	for _, name := range []string{"first.md", "second.md"} {
		fw.processEvent(fsnotify.Event{Name: filepath.Join(root, name), Op: fsnotify.Create})
	}
	fw.resolvePendingRenames(false)

	assert.Empty(t, fw.batch.fileRenames)
	assert.Len(t, fw.batch.fileCreates, 2)
}

func TestWatcherFolderBatchIdentity(t *testing.T) {
	project, _, root, _, _ := setupProjectFolders(t)
	for _, name := range []string{"a", "b"} {
		require.NoError(t, os.MkdirAll(filepath.Join(root, name, "child"), 0755))
	}
	fw := newTestFileWatcher(t, project)
	fw.addFolderTreeToWatcher(root)

	// Duplicate source events and reversed creates must still produce two distinct moves.
	for _, name := range []string{"a", "b"} {
		require.NoError(t, os.Rename(filepath.Join(root, name), filepath.Join(root, name+"-new")))
		fw.processEvent(fsnotify.Event{Name: filepath.Join(root, name), Op: fsnotify.Rename})
		fw.processEvent(fsnotify.Event{Name: filepath.Join(root, name), Op: fsnotify.Rename})
	}
	for _, name := range []string{"b-new", "a-new"} {
		fw.processEvent(fsnotify.Event{Name: filepath.Join(root, name), Op: fsnotify.Create})
	}
	fw.resolvePendingRenames(true)

	assert.ElementsMatch(t, []util.FolderRenameEventData{
		{OldFolderPath: "a", NewFolderPath: "a-new"},
		{OldFolderPath: "b", NewFolderPath: "b-new"},
	}, fw.batch.folderRenames)
	assert.Empty(t, fw.batch.folderDeletes)
	// Descendants must remain watched after their ancestor folders move.
	assert.Contains(t, fw.watcher.WatchList(), filepath.Join(root, "a-new", "child"))
	assert.Contains(t, fw.watcher.WatchList(), filepath.Join(root, "b-new", "child"))
}
