package notes

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/fsnotify/fsnotify"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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

	t.Run("should not ignore json sidecars", func(t *testing.T) {
		assert.False(t, shouldIgnoreFile(".note.md.json"))
		assert.False(t, shouldIgnoreFile(".note.pdf.json"))
	})

	t.Run("should ignore hidden markdown files", func(t *testing.T) {
		assert.True(t, shouldIgnoreFile(".hidden.md"))
		assert.True(t, shouldIgnoreFile(".note.md"))
	})

	t.Run("should not ignore regular files", func(t *testing.T) {
		assert.False(t, shouldIgnoreFile("note.md"))
		assert.False(t, shouldIgnoreFile("document.txt"))
		assert.False(t, shouldIgnoreFile("image.png"))
	})
}

// setupProjectFolders creates the basic project folder structure (settings, notes, search)
// and returns the paths. It also creates saved-searches.json.
func setupProjectFolders(t *testing.T) (string, string, string, string, string) {
	testDir := t.TempDir()
	settingsDir := filepath.Join(testDir, "settings")
	notesDir := filepath.Join(testDir, "notes")
	searchDir := filepath.Join(testDir, "search")
	savedSearchesPath := filepath.Join(searchDir, "saved-searches.json")

	err := os.MkdirAll(settingsDir, 0755)
	assert.NoError(t, err)
	err = os.MkdirAll(searchDir, 0755)
	assert.NoError(t, err)
	err = os.MkdirAll(notesDir, 0755)
	assert.NoError(t, err)
	err = os.WriteFile(savedSearchesPath, []byte("{}"), 0644)
	assert.NoError(t, err)

	return testDir, settingsDir, notesDir, searchDir, savedSearchesPath
}

func TestAddProjectFoldersToWatcher(t *testing.T) {
	t.Run("should watch settings, search, and notes root", func(t *testing.T) {
		testDir, settingsDir, notesDir, searchDir, _ := setupProjectFolders(t)
		alphaDir := filepath.Join(notesDir, "alpha")
		betaDir := filepath.Join(alphaDir, "beta")
		gammaDir := filepath.Join(notesDir, "gamma")
		rootNotePath := filepath.Join(notesDir, "root.md")
		betaNotePath := filepath.Join(betaDir, "note1.md")
		gammaNotePath := filepath.Join(gammaDir, "note2.md")

		// Create nested directories and files
		err := os.MkdirAll(betaDir, 0755)
		assert.NoError(t, err)
		err = os.MkdirAll(gammaDir, 0755)
		assert.NoError(t, err)
		err = os.WriteFile(rootNotePath, []byte("root"), 0644)
		assert.NoError(t, err)
		err = os.WriteFile(betaNotePath, []byte("beta"), 0644)
		assert.NoError(t, err)
		err = os.WriteFile(gammaNotePath, []byte("gamma"), 0644)
		assert.NoError(t, err)

		watcher, err := fsnotify.NewWatcher()
		assert.NoError(t, err)
		defer watcher.Close()

		AddProjectFoldersToWatcher(testDir, watcher)

		watchList := watcher.WatchList()
		assert.Len(t, watchList, 3)
		assert.Contains(t, watchList, notesDir)
		assert.Contains(t, watchList, settingsDir)
		assert.Contains(t, watchList, searchDir)

		// Should NOT include any files
		assert.NotContains(t, watchList, alphaDir)
		assert.NotContains(t, watchList, betaDir)
		assert.NotContains(t, watchList, gammaDir)
		assert.NotContains(t, watchList, rootNotePath)
		assert.NotContains(t, watchList, betaNotePath)
		assert.NotContains(t, watchList, gammaNotePath)
	})

	t.Run("should not watch any files in notes/ at startup", func(t *testing.T) {
		testDir, settingsDir, notesDir, searchDir, _ := setupProjectFolders(t)

		// Create files that would have been watched in the old implementation
		dsStorePath := filepath.Join(notesDir, ".DS_Store")
		hiddenFile := filepath.Join(notesDir, ".hidden")
		validFile := filepath.Join(notesDir, "note.md")
		hiddenMarkdown := filepath.Join(notesDir, ".note.md")

		err := os.WriteFile(dsStorePath, []byte("ignored"), 0644)
		assert.NoError(t, err)
		err = os.WriteFile(hiddenFile, []byte("ignored"), 0644)
		assert.NoError(t, err)
		err = os.WriteFile(validFile, []byte("valid"), 0644)
		assert.NoError(t, err)
		err = os.WriteFile(hiddenMarkdown, []byte("valid"), 0644)
		assert.NoError(t, err)

		watcher, err := fsnotify.NewWatcher()
		assert.NoError(t, err)
		defer watcher.Close()

		AddProjectFoldersToWatcher(testDir, watcher)

		watchList := watcher.WatchList()
		// Should include settings, notes root (no subfolders here), and search
		assert.Len(t, watchList, 3)
		assert.Contains(t, watchList, notesDir)
		assert.Contains(t, watchList, settingsDir)
		assert.Contains(t, watchList, searchDir)

		// None of the files should be watched
		assert.NotContains(t, watchList, dsStorePath)
		assert.NotContains(t, watchList, hiddenFile)
		assert.NotContains(t, watchList, validFile)
		assert.NotContains(t, watchList, hiddenMarkdown)
	})

	t.Run("should handle empty notes directory", func(t *testing.T) {
		testDir, settingsDir, notesDir, searchDir, _ := setupProjectFolders(t)

		watcher, err := fsnotify.NewWatcher()
		assert.NoError(t, err)
		defer watcher.Close()

		AddProjectFoldersToWatcher(testDir, watcher)

		watchList := watcher.WatchList()
		// Should only include: settingsDir, notesDir, searchDir
		assert.Equal(t, 3, len(watchList))
		assert.Contains(t, watchList, notesDir)
		assert.Contains(t, watchList, settingsDir)
		assert.Contains(t, watchList, searchDir)
	})
}

func newTestFileWatcher(t *testing.T, projectPath string) *FileWatcher {
	t.Helper()

	watcher, err := fsnotify.NewWatcher()
	assert.NoError(t, err)
	t.Cleanup(func() {
		_ = watcher.Close()
	})

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

func TestProcessEventRoutingDoesNotCollideWithUserFolders(t *testing.T) {
	t.Run("notes/settings/* file write is routed as a file event, not a settings update", func(t *testing.T) {
		testDir, _, notesDir, _, _ := setupProjectFolders(t)
		userSettingsDir := filepath.Join(notesDir, "settings")
		userNote := filepath.Join(userSettingsDir, "note.md")

		err := os.MkdirAll(userSettingsDir, 0755)
		assert.NoError(t, err)
		err = os.WriteFile(userNote, []byte("hello"), 0644)
		assert.NoError(t, err)

		fw := newTestFileWatcher(t, testDir)

		fw.processEvent(fsnotify.Event{Name: userNote, Op: fsnotify.Write})

		assert.Equal(t, []util.FileWriteEventData{
			{FilePath: "settings/note.md", Markdown: "hello"},
		}, fw.batch.fileWrites)
	})

	t.Run("notes/search/saved-searches.json is routed as a file event, not a saved-search update", func(t *testing.T) {
		testDir, _, notesDir, _, _ := setupProjectFolders(t)
		userSearchDir := filepath.Join(notesDir, "search")
		collidingFile := filepath.Join(userSearchDir, "saved-searches.json")

		err := os.MkdirAll(userSearchDir, 0755)
		assert.NoError(t, err)
		err = os.WriteFile(collidingFile, []byte("{}"), 0644)
		assert.NoError(t, err)

		fw := newTestFileWatcher(t, testDir)

		fw.processEvent(fsnotify.Event{Name: collidingFile, Op: fsnotify.Write})

		assert.Equal(t, []util.FileWriteEventData{
			{FilePath: "search/saved-searches.json"},
		}, fw.batch.fileWrites)
	})

	t.Run("chmod inside notes/settings/* is ignored, not treated as settings update", func(t *testing.T) {
		testDir, _, notesDir, _, _ := setupProjectFolders(t)
		userSettingsDir := filepath.Join(notesDir, "settings")
		userNote := filepath.Join(userSettingsDir, "note.md")

		err := os.MkdirAll(userSettingsDir, 0755)
		assert.NoError(t, err)
		err = os.WriteFile(userNote, []byte("hello"), 0644)
		assert.NoError(t, err)

		fw := newTestFileWatcher(t, testDir)

		fw.processEvent(fsnotify.Event{Name: userNote, Op: fsnotify.Chmod})

		assert.Empty(t, fw.batch.events())
	})
}

func TestCollectWatchableFolderPaths(t *testing.T) {
	testDir, _, notesDir, _, _ := setupProjectFolders(t)
	alphaDir := filepath.Join(notesDir, "alpha")
	betaDir := filepath.Join(alphaDir, "beta")
	hiddenDir := filepath.Join(notesDir, ".hidden")
	hiddenChild := filepath.Join(hiddenDir, "child")

	err := os.MkdirAll(betaDir, 0755)
	assert.NoError(t, err)
	err = os.MkdirAll(hiddenChild, 0755)
	assert.NoError(t, err)
	err = os.WriteFile(filepath.Join(notesDir, "root.md"), []byte("root"), 0644)
	assert.NoError(t, err)

	paths := collectWatchableFolderPaths(filepath.Join(testDir, "notes"))

	assert.Contains(t, paths, notesDir)
	assert.Contains(t, paths, alphaDir)
	assert.Contains(t, paths, betaDir)
	assert.NotContains(t, paths, hiddenDir)
	assert.NotContains(t, paths, hiddenChild)
}

func TestResolvePendingRenames(t *testing.T) {
	t.Run("emits file rename for an unambiguous file pair", func(t *testing.T) {
		testDir, _, notesDir, _, _ := setupProjectFolders(t)
		oldPath := filepath.Join(notesDir, "old.md")
		newPath := filepath.Join(notesDir, "new.md")

		err := os.WriteFile(oldPath, []byte("new"), 0644)
		assert.NoError(t, err)

		fw := newTestFileWatcher(t, testDir)
		fw.addFolderTreeToWatcher(notesDir)
		require.NoError(t, os.Rename(oldPath, newPath))
		fw.fileStateCache[oldPath] = fileState{modTime: time.Now(), size: 3}
		fw.pendingFileRenameEvents = fw.addPendingRename(nil, fsnotify.Event{Name: oldPath, Op: fsnotify.Rename})
		fw.mostRecentFileCreatedEvents = []pendingWatcherEvent{{event: fsnotify.Event{Name: newPath, Op: fsnotify.Create}}}

		fw.resolvePendingRenames(false)

		assert.Equal(t, []util.FileRenameEventData{
			{OldFilePath: "old.md", NewFilePath: "new.md"},
		}, fw.batch.fileRenames)
		assert.NotContains(t, fw.fileStateCache, oldPath)
		assert.Contains(t, fw.fileStateCache, newPath)
		assert.Empty(t, fw.mostRecentFileCreatedEvents)
	})

	t.Run("unmatched file rename becomes delete", func(t *testing.T) {
		testDir, _, notesDir, _, _ := setupProjectFolders(t)
		oldPath := filepath.Join(notesDir, "old.md")

		fw := newTestFileWatcher(t, testDir)
		fw.pendingFileRenameEvents = fw.addPendingRename(nil, fsnotify.Event{Name: oldPath, Op: fsnotify.Rename})

		fw.resolvePendingRenames(false)

		assert.Equal(t, []util.FileDeleteEventData{
			{FilePath: "old.md"},
		}, fw.batch.fileDeletes)
	})

	t.Run("unmatched file create becomes create", func(t *testing.T) {
		testDir, _, notesDir, _, _ := setupProjectFolders(t)
		newPath := filepath.Join(notesDir, "new.md")

		err := os.WriteFile(newPath, []byte("new"), 0644)
		assert.NoError(t, err)

		fw := newTestFileWatcher(t, testDir)
		fw.mostRecentFileCreatedEvents = []pendingWatcherEvent{{event: fsnotify.Event{Name: newPath, Op: fsnotify.Create}}}

		fw.resolvePendingRenames(false)

		assert.Equal(t, []util.FileCreateEventData{
			{FilePath: "new.md"},
		}, fw.batch.fileCreates)
	})

	t.Run("ambiguous file batch degrades to delete and create", func(t *testing.T) {
		testDir, _, notesDir, _, _ := setupProjectFolders(t)
		oldPath := filepath.Join(notesDir, "old.md")
		newPathA := filepath.Join(notesDir, "new-a.md")
		newPathB := filepath.Join(notesDir, "new-b.md")

		err := os.WriteFile(newPathA, []byte("a"), 0644)
		assert.NoError(t, err)
		err = os.WriteFile(newPathB, []byte("b"), 0644)
		assert.NoError(t, err)

		fw := newTestFileWatcher(t, testDir)
		fw.pendingFileRenameEvents = fw.addPendingRename(nil, fsnotify.Event{Name: oldPath, Op: fsnotify.Rename})
		fw.mostRecentFileCreatedEvents = []pendingWatcherEvent{
			{event: fsnotify.Event{Name: newPathA, Op: fsnotify.Create}},
			{event: fsnotify.Event{Name: newPathB, Op: fsnotify.Create}},
		}

		fw.resolvePendingRenames(false)

		assert.Equal(t, []util.FileDeleteEventData{
			{FilePath: "old.md"},
		}, fw.batch.fileDeletes)
		assert.Equal(t, []util.FileCreateEventData{
			{FilePath: "new-a.md"},
			{FilePath: "new-b.md"},
		}, fw.batch.fileCreates)
		assert.Empty(t, fw.batch.fileRenames)
	})

	t.Run("same-path file pair emits file write", func(t *testing.T) {
		testDir, _, notesDir, _, _ := setupProjectFolders(t)
		path := filepath.Join(notesDir, "same.md")

		err := os.WriteFile(path, []byte("# title"), 0644)
		assert.NoError(t, err)

		fw := newTestFileWatcher(t, testDir)
		fw.fileStateCache[path] = fileState{modTime: time.Unix(0, 0), size: 0}
		fw.pendingFileRenameEvents = []pendingWatcherEvent{{event: fsnotify.Event{Name: path, Op: fsnotify.Rename}}}
		fw.mostRecentFileCreatedEvents = []pendingWatcherEvent{{event: fsnotify.Event{Name: path, Op: fsnotify.Create}}}

		fw.resolvePendingRenames(false)

		assert.Equal(t, []util.FileWriteEventData{
			{FilePath: "same.md", Markdown: "# title"},
		}, fw.batch.fileWrites)
		assert.Empty(t, fw.batch.fileRenames)
		assert.Empty(t, fw.batch.fileDeletes)
		assert.Empty(t, fw.batch.fileCreates)
	})

	t.Run("matched folder rename re-registers descendant watches", func(t *testing.T) {
		testDir, _, notesDir, _, _ := setupProjectFolders(t)
		oldDir := filepath.Join(notesDir, "old-folder")
		oldChild := filepath.Join(oldDir, "child")
		newDir := filepath.Join(notesDir, "new-folder")
		newChild := filepath.Join(newDir, "child")

		err := os.MkdirAll(oldChild, 0755)
		assert.NoError(t, err)

		watcher, err := fsnotify.NewWatcher()
		assert.NoError(t, err)
		defer watcher.Close()

		AddProjectFoldersToWatcher(testDir, watcher)
		registry := NewDirectoryWatchRegistry()
		registry.SyncFromWatcher(watcher)
		fw := newFileWatcher(nil, testDir, watcher, registry)
		if !fw.debounceTimer.Stop() {
			select {
			case <-fw.debounceTimer.C:
			default:
			}
		}

		err = os.Rename(oldDir, newDir)
		assert.NoError(t, err)

		fw.pendingFolderRenameEvents = fw.addPendingRename(nil, fsnotify.Event{Name: oldDir, Op: fsnotify.Rename})
		fw.mostRecentFolderCreatedEvents = []pendingWatcherEvent{{event: fsnotify.Event{Name: newDir, Op: fsnotify.Create}}}

		fw.resolvePendingRenames(true)

		assert.Equal(t, []util.FolderRenameEventData{
			{OldFolderPath: "old-folder", NewFolderPath: "new-folder"},
		}, fw.batch.folderRenames)

		watchList := watcher.WatchList()
		assert.Contains(t, watchList, newDir)
		assert.Contains(t, watchList, newChild)
		assert.NotContains(t, watchList, oldDir)
		assert.NotContains(t, watchList, oldChild)
	})

	t.Run("missing watched folder rename degrades to folder delete", func(t *testing.T) {
		testDir, _, notesDir, _, _ := setupProjectFolders(t)
		oldDir := filepath.Join(notesDir, "Third", "Fourth")

		err := os.MkdirAll(oldDir, 0755)
		assert.NoError(t, err)

		fw := newTestFileWatcher(t, testDir)
		fw.knownWatchedDirectories.Add(oldDir)

		err = os.RemoveAll(filepath.Join(notesDir, "Third"))
		assert.NoError(t, err)

		fw.processEvent(fsnotify.Event{Name: oldDir, Op: fsnotify.Rename})
		assert.Len(t, fw.pendingFolderRenameEvents, 1)
		assert.Empty(t, fw.pendingFileRenameEvents)

		fw.resolvePendingRenames(true)

		assert.Equal(t, []util.FolderDeleteEventData{
			{FolderPath: "Third/Fourth"},
		}, fw.batch.folderDeletes)
		assert.Empty(t, fw.batch.fileDeletes)
	})
}

func waitForSavedSearchEvent(t *testing.T, watcher *fsnotify.Watcher, path string, op fsnotify.Op) {
	t.Helper()
	timer := time.NewTimer(3 * time.Second)
	defer timer.Stop()
	for {
		select {
		case event, ok := <-watcher.Events:
			require.True(t, ok, "watcher closed before %s", op)
			if event.Name == path && event.Has(op) {
				return
			}
		case err := <-watcher.Errors:
			t.Fatalf("watcher error: %v", err)
		case <-timer.C:
			t.Fatalf("timed out waiting for %s on %s", op, path)
		}
	}
}

func TestSavedSearchDirectoryWatch(t *testing.T) {
	t.Run("receives consecutive atomic saves", func(t *testing.T) {
		projectPath, _, _, _, savedSearchesPath := setupProjectFolders(t)
		watcher, err := fsnotify.NewWatcher()
		require.NoError(t, err)
		t.Cleanup(func() { _ = watcher.Close() })
		AddProjectFoldersToWatcher(projectPath, watcher)

		require.NoError(t, util.WriteJsonToPath(savedSearchesPath, map[string]int{"revision": 1}))

		waitForSavedSearchEvent(t, watcher, savedSearchesPath, fsnotify.Create)

		require.NoError(t, util.WriteJsonToPath(savedSearchesPath, map[string]int{"revision": 2}))

		waitForSavedSearchEvent(t, watcher, savedSearchesPath, fsnotify.Create)

		require.NoError(t, util.WriteJsonToPath(savedSearchesPath, map[string]int{"revision": 3}))

		waitForSavedSearchEvent(t, watcher, savedSearchesPath, fsnotify.Create)
	})

	t.Run("receives deletion followed by recreation", func(t *testing.T) {
		projectPath, _, _, _, savedSearchesPath := setupProjectFolders(t)
		watcher, err := fsnotify.NewWatcher()
		require.NoError(t, err)
		t.Cleanup(func() { _ = watcher.Close() })
		AddProjectFoldersToWatcher(projectPath, watcher)

		require.NoError(t, os.Remove(savedSearchesPath))

		waitForSavedSearchEvent(t, watcher, savedSearchesPath, fsnotify.Remove)

		require.NoError(t, util.WriteJsonToPath(savedSearchesPath, map[string]int{"revision": 4}))

		waitForSavedSearchEvent(t, watcher, savedSearchesPath, fsnotify.Create)
	})

	t.Run("watches for the first save when the file does not exist at startup", func(t *testing.T) {
		projectPath, _, _, _, savedSearchesPath := setupProjectFolders(t)
		require.NoError(t, os.Remove(savedSearchesPath))
		watcher, err := fsnotify.NewWatcher()
		require.NoError(t, err)
		t.Cleanup(func() { _ = watcher.Close() })
		AddProjectFoldersToWatcher(projectPath, watcher)

		require.NoError(t, util.WriteJsonToPath(savedSearchesPath, map[string]int{"revision": 1}))

		waitForSavedSearchEvent(t, watcher, savedSearchesPath, fsnotify.Create)
	})

	t.Run("ignores unrelated files and directories in the search directory", func(t *testing.T) {
		projectPath, _, _, searchDir, _ := setupProjectFolders(t)
		indexDir := filepath.Join(searchDir, "index.bleve")
		require.NoError(t, os.Mkdir(indexDir, 0755))
		fw := newTestFileWatcher(t, projectPath)

		fw.processEvent(fsnotify.Event{Name: indexDir, Op: fsnotify.Create})
		fw.processEvent(fsnotify.Event{Name: filepath.Join(searchDir, "saved-searches.json.tmp"), Op: fsnotify.Create})
		fw.processEvent(fsnotify.Event{Name: filepath.Join(searchDir, ".tmp-123"), Op: fsnotify.Rename})
		fw.processEvent(fsnotify.Event{Name: filepath.Join(searchDir, "store"), Op: fsnotify.Remove})

		assert.Empty(t, fw.batch.events())
		assert.Empty(t, fw.mostRecentFileCreatedEvents)
		assert.Empty(t, fw.mostRecentFolderCreatedEvents)
		assert.Empty(t, fw.pendingFileRenameEvents)
		assert.Empty(t, fw.watcher.WatchList())
	})
}

func TestFileWriteContent(t *testing.T) {
	t.Run("empty markdown survives event serialization", func(t *testing.T) {
		projectPath, _, notesPath, _, _ := setupProjectFolders(t)
		path := filepath.Join(notesPath, "empty.md")
		require.NoError(t, os.WriteFile(path, nil, 0644))
		fw := newTestFileWatcher(t, projectPath)

		fw.emitFileWriteEvent(path)
		payload, err := json.Marshal(fw.batch.fileWrites)

		require.NoError(t, err)
		assert.JSONEq(t, `[{"filePath":"empty.md","markdown":""}]`, string(payload))
	})
	t.Run("failed markdown read does not emit a content replacement", func(t *testing.T) {
		projectPath, _, notesPath, _, _ := setupProjectFolders(t)
		path := filepath.Join(notesPath, "missing.md")
		fw := newTestFileWatcher(t, projectPath)

		fw.emitFileWriteEvent(path)

		assert.Empty(t, fw.batch.fileWrites)
		assert.NotContains(t, fw.fileStateCache, path)
	})
}
