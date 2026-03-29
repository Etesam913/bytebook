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
	t.Run("emits note rename for an unambiguous file pair", func(t *testing.T) {
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
			{"oldNotePath": "old.md", "newNotePath": "new.md"},
		}, fw.debounceEvents[util.Events.NoteRename])
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
			{"notePath": "old.md"},
		}, fw.debounceEvents[util.Events.NoteDelete])
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
			{"notePath": "new.md"},
		}, fw.debounceEvents[util.Events.NoteCreate])
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
			{"notePath": "old.md"},
		}, fw.debounceEvents[util.Events.NoteDelete])
		assert.Equal(t, []map[string]string{
			{"notePath": "new-a.md"},
			{"notePath": "new-b.md"},
		}, fw.debounceEvents[util.Events.NoteCreate])
		assert.Empty(t, fw.debounceEvents[util.Events.NoteRename])
	})

	t.Run("same-path file pair emits note write", func(t *testing.T) {
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
			{"notePath": "same.md", "markdown": "# title"},
		}, fw.debounceEvents[util.Events.NoteWrite])
		assert.Empty(t, fw.debounceEvents[util.Events.NoteRename])
		assert.Empty(t, fw.debounceEvents[util.Events.NoteDelete])
		assert.Empty(t, fw.debounceEvents[util.Events.NoteCreate])
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
		}, fw.debounceEvents[util.Events.FolderRename])

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
		}, fw.debounceEvents[util.Events.FolderDelete])
		assert.Empty(t, fw.debounceEvents[util.Events.NoteDelete])
	})
}

func TestFilterUnneededDebouncedEvents(t *testing.T) {
	t.Run("filters note:create when rename targets same path", func(t *testing.T) {
		events := map[string][]map[string]string{
			util.Events.NoteCreate: {
				{"notePath": "alpha/new.md"},
				{"notePath": "alpha/keep.md"},
			},
			util.Events.NoteRename: {
				{"oldNotePath": "alpha/old.md", "newNotePath": "alpha/new.md"},
			},
			util.Events.NoteWrite: {
				{"notePath": "alpha/keep.md"},
			},
		}

		filtered := filterUnneededDebouncedEvents(events)

		if assert.Contains(t, filtered, util.Events.NoteCreate) {
			assert.Len(t, filtered[util.Events.NoteCreate], 1)
			assert.Equal(t, "alpha/keep.md", filtered[util.Events.NoteCreate][0]["notePath"])
		}
		assert.Equal(t, events[util.Events.NoteRename], filtered[util.Events.NoteRename])
		assert.Equal(t, events[util.Events.NoteWrite], filtered[util.Events.NoteWrite])
	})

	t.Run("filters folder:create when rename targets same path", func(t *testing.T) {
		events := map[string][]map[string]string{
			util.Events.FolderCreate: {
				{"folderPath": "alpha/new-folder"},
				{"folderPath": "alpha/keep-folder"},
			},
			util.Events.FolderRename: {
				{"oldFolderPath": "alpha/old-folder", "newFolderPath": "alpha/new-folder"},
			},
		}

		filtered := filterUnneededDebouncedEvents(events)

		if assert.Contains(t, filtered, util.Events.FolderCreate) {
			assert.Len(t, filtered[util.Events.FolderCreate], 1)
			assert.Equal(t, "alpha/keep-folder", filtered[util.Events.FolderCreate][0]["folderPath"])
		}
		assert.Equal(t, events[util.Events.FolderRename], filtered[util.Events.FolderRename])
	})

	t.Run("filters note:delete when rename targets same old path", func(t *testing.T) {
		events := map[string][]map[string]string{
			util.Events.NoteDelete: {
				{"notePath": "alpha/old.md"},
				{"notePath": "alpha/keep.md"},
			},
			util.Events.NoteRename: {
				{"oldNotePath": "alpha/old.md", "newNotePath": "alpha/new.md"},
			},
		}

		filtered := filterUnneededDebouncedEvents(events)

		if assert.Contains(t, filtered, util.Events.NoteDelete) {
			assert.Len(t, filtered[util.Events.NoteDelete], 1)
			assert.Equal(t, "alpha/keep.md", filtered[util.Events.NoteDelete][0]["notePath"])
		}
		assert.Equal(t, events[util.Events.NoteRename], filtered[util.Events.NoteRename])
	})

	t.Run("filters folder:delete when rename targets same old path", func(t *testing.T) {
		events := map[string][]map[string]string{
			util.Events.FolderDelete: {
				{"folderPath": "alpha/old-folder"},
				{"folderPath": "alpha/keep-folder"},
			},
			util.Events.FolderRename: {
				{"oldFolderPath": "alpha/old-folder", "newFolderPath": "alpha/new-folder"},
			},
		}

		filtered := filterUnneededDebouncedEvents(events)

		if assert.Contains(t, filtered, util.Events.FolderDelete) {
			assert.Len(t, filtered[util.Events.FolderDelete], 1)
			assert.Equal(t, "alpha/keep-folder", filtered[util.Events.FolderDelete][0]["folderPath"])
		}
		assert.Equal(t, events[util.Events.FolderRename], filtered[util.Events.FolderRename])
	})
}

func TestDedupeDebouncedEventsByPathPayload(t *testing.T) {
	t.Run("dedupes note writes by notePath and keeps latest payload", func(t *testing.T) {
		events := map[string][]map[string]string{
			util.Events.NoteWrite: {
				{"notePath": "alpha/a.md", "markdown": "v1"},
				{"notePath": "alpha/b.md", "markdown": "b1"},
				{"notePath": "alpha/a.md", "markdown": "v2"},
			},
		}

		deduped := dedupeDebouncedEventsByPathPayload(events)

		if assert.Contains(t, deduped, util.Events.NoteWrite) {
			assert.Len(t, deduped[util.Events.NoteWrite], 2)
			assert.Equal(
				t,
				map[string]string{"notePath": "alpha/a.md", "markdown": "v2"},
				deduped[util.Events.NoteWrite][0],
			)
			assert.Equal(
				t,
				map[string]string{"notePath": "alpha/b.md", "markdown": "b1"},
				deduped[util.Events.NoteWrite][1],
			)
		}
	})

	t.Run("dedupes rename payloads by combined old and new paths", func(t *testing.T) {
		events := map[string][]map[string]string{
			util.Events.NoteRename: {
				{"oldNotePath": "alpha/old.md", "newNotePath": "alpha/new.md", "markdown": "v1"},
				{"oldNotePath": "alpha/old.md", "newNotePath": "alpha/new.md", "markdown": "v2"},
				{"oldNotePath": "alpha/other-old.md", "newNotePath": "alpha/other-new.md"},
			},
		}

		deduped := dedupeDebouncedEventsByPathPayload(events)

		if assert.Contains(t, deduped, util.Events.NoteRename) {
			assert.Len(t, deduped[util.Events.NoteRename], 2)
			assert.Equal(
				t,
				map[string]string{"oldNotePath": "alpha/old.md", "newNotePath": "alpha/new.md", "markdown": "v2"},
				deduped[util.Events.NoteRename][0],
			)
			assert.Equal(
				t,
				map[string]string{"oldNotePath": "alpha/other-old.md", "newNotePath": "alpha/other-new.md"},
				deduped[util.Events.NoteRename][1],
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
		util.Events.NoteCreate:   {{"notePath": "a.md"}},
		util.Events.NoteRename:   {{"oldNotePath": "a.md", "newNotePath": "b.md"}},
		util.Events.FolderDelete: {{"folderPath": "folder"}},
		"custom:event":           {{"status": "ok"}},
	}

	assert.Equal(t, []string{
		util.Events.NoteRename,
		util.Events.FolderDelete,
		util.Events.NoteCreate,
		"custom:event",
	}, orderedDebouncedEventKeys(events))
}
