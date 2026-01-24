package notes

import (
	"os"
	"path/filepath"
	"testing"

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

	t.Run("should not ignore hidden markdown files", func(t *testing.T) {
		assert.False(t, shouldIgnoreFile(".hidden.md"))
		assert.False(t, shouldIgnoreFile(".note.md"))
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
	t.Run("should only watch settings, notes root, and saved-searches.json", func(t *testing.T) {
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
		// Should only watch the essential folders (lazy loading approach)
		assert.Equal(t, 3, len(watchList))
		assert.Contains(t, watchList, notesDir)
		assert.Contains(t, watchList, settingsDir)
		assert.Contains(t, watchList, savedSearchesPath)

		// Should NOT include any top-level folders or files - they are added lazily
		assert.NotContains(t, watchList, alphaDir)
		assert.NotContains(t, watchList, gammaDir)
		assert.NotContains(t, watchList, rootNotePath)
		assert.NotContains(t, watchList, betaDir)
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
		// Should only include essential folders, no files from notes/
		assert.Equal(t, 3, len(watchList))
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
