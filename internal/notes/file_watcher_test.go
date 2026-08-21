package notes

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/etesam913/bytebook/internal/util"
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

	t.Run("should not ignore json sidecars", func(t *testing.T) {
		assert.False(t, shouldIgnoreFile(".note.json"))
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
	t.Run("should watch settings, saved-searches.json, and notes root", func(t *testing.T) {
		testDir, settingsDir, notesDir, _, savedSearchesPath := setupProjectFolders(t)
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
		assert.Contains(t, watchList, savedSearchesPath)

		// Should NOT include any files
		assert.NotContains(t, watchList, alphaDir)
		assert.NotContains(t, watchList, betaDir)
		assert.NotContains(t, watchList, gammaDir)
		assert.NotContains(t, watchList, rootNotePath)
		assert.NotContains(t, watchList, betaNotePath)
		assert.NotContains(t, watchList, gammaNotePath)
	})

	t.Run("should not watch any files in notes/ at startup", func(t *testing.T) {
		testDir, settingsDir, notesDir, _, savedSearchesPath := setupProjectFolders(t)

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
		// Should include settings, notes root (no subfolders here), and saved-searches.json
		assert.Len(t, watchList, 3)
		assert.Contains(t, watchList, notesDir)
		assert.Contains(t, watchList, settingsDir)
		assert.Contains(t, watchList, savedSearchesPath)

		// None of the files should be watched
		assert.NotContains(t, watchList, dsStorePath)
		assert.NotContains(t, watchList, hiddenFile)
		assert.NotContains(t, watchList, validFile)
		assert.NotContains(t, watchList, hiddenMarkdown)
	})

	t.Run("should handle empty notes directory", func(t *testing.T) {
		testDir, settingsDir, notesDir, _, savedSearchesPath := setupProjectFolders(t)

		watcher, err := fsnotify.NewWatcher()
		assert.NoError(t, err)
		defer watcher.Close()

		AddProjectFoldersToWatcher(testDir, watcher)

		watchList := watcher.WatchList()
		// Should only include: settingsDir, notesDir, savedSearchesPath
		assert.Equal(t, 3, len(watchList))
		assert.Contains(t, watchList, notesDir)
		assert.Contains(t, watchList, settingsDir)
		assert.Contains(t, watchList, savedSearchesPath)
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

		assert.Equal(t, []map[string]string{
			{"filePath": "settings/note.md", "markdown": "hello"},
		}, fw.debounceEvents[util.EventFileWrite])
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

		assert.Equal(t, []map[string]string{
			{"filePath": "search/saved-searches.json"},
		}, fw.debounceEvents[util.EventFileWrite])
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

		assert.Empty(t, fw.debounceEvents)
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

		err := os.WriteFile(newPath, []byte("new"), 0644)
		assert.NoError(t, err)

		fw := newTestFileWatcher(t, testDir)
		fw.fileStateCache[oldPath] = fileState{modTime: time.Now(), size: 3}
		fw.pendingFileRenameEvents = []pendingWatcherEvent{{event: fsnotify.Event{Name: oldPath, Op: fsnotify.Rename}}}
		fw.mostRecentFileCreatedEvents = []pendingWatcherEvent{{event: fsnotify.Event{Name: newPath, Op: fsnotify.Create}}}

		fw.resolvePendingRenames(false)

		assert.Equal(t, []map[string]string{
			{"oldFilePath": "old.md", "newFilePath": "new.md"},
		}, fw.debounceEvents[util.EventFileRename])
		assert.NotContains(t, fw.fileStateCache, oldPath)
		assert.Contains(t, fw.fileStateCache, newPath)
		assert.Empty(t, fw.mostRecentFileCreatedEvents)
	})

	t.Run("unmatched file rename becomes delete", func(t *testing.T) {
		testDir, _, notesDir, _, _ := setupProjectFolders(t)
		oldPath := filepath.Join(notesDir, "old.md")

		fw := newTestFileWatcher(t, testDir)
		fw.pendingFileRenameEvents = []pendingWatcherEvent{{event: fsnotify.Event{Name: oldPath, Op: fsnotify.Rename}}}

		fw.resolvePendingRenames(false)

		assert.Equal(t, []map[string]string{
			{"filePath": "old.md"},
		}, fw.debounceEvents[util.EventFileDelete])
	})

	t.Run("unmatched file create becomes create", func(t *testing.T) {
		testDir, _, notesDir, _, _ := setupProjectFolders(t)
		newPath := filepath.Join(notesDir, "new.md")

		err := os.WriteFile(newPath, []byte("new"), 0644)
		assert.NoError(t, err)

		fw := newTestFileWatcher(t, testDir)
		fw.mostRecentFileCreatedEvents = []pendingWatcherEvent{{event: fsnotify.Event{Name: newPath, Op: fsnotify.Create}}}

		fw.resolvePendingRenames(false)

		assert.Equal(t, []map[string]string{
			{"filePath": "new.md"},
		}, fw.debounceEvents[util.EventFileCreate])
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
		fw.pendingFileRenameEvents = []pendingWatcherEvent{{event: fsnotify.Event{Name: oldPath, Op: fsnotify.Rename}}}
		fw.mostRecentFileCreatedEvents = []pendingWatcherEvent{
			{event: fsnotify.Event{Name: newPathA, Op: fsnotify.Create}},
			{event: fsnotify.Event{Name: newPathB, Op: fsnotify.Create}},
		}

		fw.resolvePendingRenames(false)

		assert.Equal(t, []map[string]string{
			{"filePath": "old.md"},
		}, fw.debounceEvents[util.EventFileDelete])
		assert.Equal(t, []map[string]string{
			{"filePath": "new-a.md"},
			{"filePath": "new-b.md"},
		}, fw.debounceEvents[util.EventFileCreate])
		assert.Empty(t, fw.debounceEvents[util.EventFileRename])
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

		assert.Equal(t, []map[string]string{
			{"filePath": "same.md", "markdown": "# title"},
		}, fw.debounceEvents[util.EventFileWrite])
		assert.Empty(t, fw.debounceEvents[util.EventFileRename])
		assert.Empty(t, fw.debounceEvents[util.EventFileDelete])
		assert.Empty(t, fw.debounceEvents[util.EventFileCreate])
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

		fw.pendingFolderRenameEvents = []pendingWatcherEvent{{event: fsnotify.Event{Name: oldDir, Op: fsnotify.Rename}}}
		fw.mostRecentFolderCreatedEvents = []pendingWatcherEvent{{event: fsnotify.Event{Name: newDir, Op: fsnotify.Create}}}

		fw.resolvePendingRenames(true)

		assert.Equal(t, []map[string]string{
			{"oldFolderPath": "old-folder", "newFolderPath": "new-folder"},
		}, fw.debounceEvents[util.EventFolderRename])

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

		assert.Equal(t, []map[string]string{
			{"folderPath": "Third/Fourth"},
		}, fw.debounceEvents[util.EventFolderDelete])
		assert.Empty(t, fw.debounceEvents[util.EventFileDelete])
	})
}

func TestFilterUnneededDebouncedEvents(t *testing.T) {
	t.Run("filters file:create when rename targets same path", func(t *testing.T) {
		events := map[string][]map[string]string{
			util.EventFileCreate: {
				{"filePath": "alpha/new.md"},
				{"filePath": "alpha/keep.md"},
			},
			util.EventFileRename: {
				{"oldFilePath": "alpha/old.md", "newFilePath": "alpha/new.md"},
			},
			util.EventFileWrite: {
				{"filePath": "alpha/keep.md"},
			},
		}

		filtered := filterUnneededDebouncedEvents(events)

		if assert.Contains(t, filtered, util.EventFileCreate) {
			assert.Len(t, filtered[util.EventFileCreate], 1)
			assert.Equal(t, "alpha/keep.md", filtered[util.EventFileCreate][0]["filePath"])
		}
		assert.Equal(t, events[util.EventFileRename], filtered[util.EventFileRename])
		assert.Equal(t, events[util.EventFileWrite], filtered[util.EventFileWrite])
	})

	t.Run("filters folder:create when rename targets same path", func(t *testing.T) {
		events := map[string][]map[string]string{
			util.EventFolderCreate: {
				{"folderPath": "alpha/new-folder"},
				{"folderPath": "alpha/keep-folder"},
			},
			util.EventFolderRename: {
				{"oldFolderPath": "alpha/old-folder", "newFolderPath": "alpha/new-folder"},
			},
		}

		filtered := filterUnneededDebouncedEvents(events)

		if assert.Contains(t, filtered, util.EventFolderCreate) {
			assert.Len(t, filtered[util.EventFolderCreate], 1)
			assert.Equal(t, "alpha/keep-folder", filtered[util.EventFolderCreate][0]["folderPath"])
		}
		assert.Equal(t, events[util.EventFolderRename], filtered[util.EventFolderRename])
	})

	t.Run("filters file:delete when rename targets same old path", func(t *testing.T) {
		events := map[string][]map[string]string{
			util.EventFileDelete: {
				{"filePath": "alpha/old.md"},
				{"filePath": "alpha/keep.md"},
			},
			util.EventFileRename: {
				{"oldFilePath": "alpha/old.md", "newFilePath": "alpha/new.md"},
			},
		}

		filtered := filterUnneededDebouncedEvents(events)

		if assert.Contains(t, filtered, util.EventFileDelete) {
			assert.Len(t, filtered[util.EventFileDelete], 1)
			assert.Equal(t, "alpha/keep.md", filtered[util.EventFileDelete][0]["filePath"])
		}
		assert.Equal(t, events[util.EventFileRename], filtered[util.EventFileRename])
	})

	t.Run("filters folder:delete when rename targets same old path", func(t *testing.T) {
		events := map[string][]map[string]string{
			util.EventFolderDelete: {
				{"folderPath": "alpha/old-folder"},
				{"folderPath": "alpha/keep-folder"},
			},
			util.EventFolderRename: {
				{"oldFolderPath": "alpha/old-folder", "newFolderPath": "alpha/new-folder"},
			},
		}

		filtered := filterUnneededDebouncedEvents(events)

		if assert.Contains(t, filtered, util.EventFolderDelete) {
			assert.Len(t, filtered[util.EventFolderDelete], 1)
			assert.Equal(t, "alpha/keep-folder", filtered[util.EventFolderDelete][0]["folderPath"])
		}
		assert.Equal(t, events[util.EventFolderRename], filtered[util.EventFolderRename])
	})
}

func TestDedupeDebouncedEventsByPathPayload(t *testing.T) {
	t.Run("dedupes file writes by filePath and keeps latest payload", func(t *testing.T) {
		events := map[string][]map[string]string{
			util.EventFileWrite: {
				{"filePath": "alpha/a.md", "markdown": "v1"},
				{"filePath": "alpha/b.md", "markdown": "b1"},
				{"filePath": "alpha/a.md", "markdown": "v2"},
			},
		}

		deduped := dedupeDebouncedEventsByPathPayload(events)

		if assert.Contains(t, deduped, util.EventFileWrite) {
			assert.Len(t, deduped[util.EventFileWrite], 2)
			assert.Equal(
				t,
				map[string]string{"filePath": "alpha/a.md", "markdown": "v2"},
				deduped[util.EventFileWrite][0],
			)
			assert.Equal(
				t,
				map[string]string{"filePath": "alpha/b.md", "markdown": "b1"},
				deduped[util.EventFileWrite][1],
			)
		}
	})

	t.Run("dedupes rename payloads by combined old and new paths", func(t *testing.T) {
		events := map[string][]map[string]string{
			util.EventFileRename: {
				{"oldFilePath": "alpha/old.md", "newFilePath": "alpha/new.md", "markdown": "v1"},
				{"oldFilePath": "alpha/old.md", "newFilePath": "alpha/new.md", "markdown": "v2"},
				{"oldFilePath": "alpha/other-old.md", "newFilePath": "alpha/other-new.md"},
			},
		}

		deduped := dedupeDebouncedEventsByPathPayload(events)

		if assert.Contains(t, deduped, util.EventFileRename) {
			assert.Len(t, deduped[util.EventFileRename], 2)
			assert.Equal(
				t,
				map[string]string{"oldFilePath": "alpha/old.md", "newFilePath": "alpha/new.md", "markdown": "v2"},
				deduped[util.EventFileRename][0],
			)
			assert.Equal(
				t,
				map[string]string{"oldFilePath": "alpha/other-old.md", "newFilePath": "alpha/other-new.md"},
				deduped[util.EventFileRename][1],
			)
		}
	})

	t.Run("does not dedupe payloads without path-like keys", func(t *testing.T) {
		events := map[string][]map[string]string{
			"custom:event": {
				{"status": "ok"},
				{"status": "ok"},
			},
		}

		deduped := dedupeDebouncedEventsByPathPayload(events)

		if assert.Contains(t, deduped, "custom:event") {
			assert.Len(t, deduped["custom:event"], 2)
			assert.Equal(t, events["custom:event"], deduped["custom:event"])
		}
	})
}

func TestOrderedDebouncedEventKeys(t *testing.T) {
	events := map[string][]map[string]string{
		util.EventFileCreate:   {{"filePath": "a.md"}},
		util.EventFileRename:   {{"oldFilePath": "a.md", "newFilePath": "b.md"}},
		util.EventFolderDelete: {{"folderPath": "folder"}},
		"custom:event":           {{"status": "ok"}},
	}

	assert.Equal(t, []string{
		util.EventFileRename,
		util.EventFolderDelete,
		util.EventFileCreate,
		"custom:event",
	}, orderedDebouncedEventKeys(events))
}
