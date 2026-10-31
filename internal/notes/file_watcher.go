package notes

import (
	"errors"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes/sidecar"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v3/pkg/application"
)

const debounceTimeout = 50 * time.Millisecond

func init() {
	// These events are named in util but their payload types live here / in
	// config, which util cannot import without a cycle.
	application.RegisterEvent[config.ProjectSettingsJson](util.EventSettingsUpdate)
}

type pendingPath struct {
	path     string
	identity os.FileInfo
}

type pendingQueue struct {
	renames []pendingPath
	creates []pendingPath
}

// fileState is used to determine if a file has actually changed. Fsnotify events can be noisy
// saying that there is a write, when nothing was actually modified about the file.
type fileState struct {
	modTime time.Time
	size    int64
}

// FileWatcher manages file system monitoring and event handling
type FileWatcher struct {
	app                     *application.App
	projectPath             string
	watcher                 *fsnotify.Watcher
	knownWatchedDirectories *DirectoryWatchRegistry
	debounceTimer           *time.Timer
	batch                   watcherBatch
	files, folders          pendingQueue
	fileStateCache          map[string]fileState
}

func newFileWatcher(app *application.App, projectPath string, watcher *fsnotify.Watcher, registry *DirectoryWatchRegistry) *FileWatcher {
	return &FileWatcher{
		app: app, projectPath: projectPath, watcher: watcher,
		knownWatchedDirectories: registry, debounceTimer: time.NewTimer(0),
		fileStateCache: make(map[string]fileState),
	}
}

func addPendingWatcherEvent(events []pendingPath, event pendingPath) []pendingPath {
	for _, pending := range events {
		if pending.path == event.path {
			return events
		}
	}
	return append(events, event)
}

// handleDebounceReset stops the given debounce timer, drains its channel if necessary, and resets it.
func (fw *FileWatcher) handleDebounceReset() {
	// Stop the timer, but don't drain the channel if it's already empty.
	if !fw.debounceTimer.Stop() {
		// Try to drain the channel. This ensures that any pending trigger is consumed.
		select {
		case <-fw.debounceTimer.C:
		default:
		}
	}

	// Reset the timer to debounceTimeout
	fw.debounceTimer.Reset(debounceTimeout)
}

// handleFolderEvents processes folder-related events (create, delete, rename)
func (fw *FileWatcher) handleFolderEvents(event fsnotify.Event) {
	if event.Has(fsnotify.Create) {
		fw.folders.creates = addPendingWatcherEvent(fw.folders.creates, pendingPath{path: event.Name})
	} else if event.Has(fsnotify.Rename) {
		fw.folders.renames = fw.addPendingRename(fw.folders.renames, event)
	} else if event.Has(fsnotify.Remove) {
		fw.removeFolderTreeWatches(event.Name)
		fw.batch.folderDeletes = append(fw.batch.folderDeletes, util.FolderDeleteEventData{FolderPath: fw.pathFromNotes(event.Name)})
	}

}

// pathFromNotes returns the relative path from the notes root directory.
// For example, if the full path is /project/notes/folder/note.md, it returns "folder/note.md".
// Returns empty string if the path is the notes root itself.
func (fw *FileWatcher) pathFromNotes(path string) string {
	notesRoot := filepath.Join(fw.projectPath, "notes")
	relPath, err := filepath.Rel(notesRoot, path)
	if err != nil || strings.HasPrefix(relPath, "..") {
		return filepath.Base(path)
	}
	if relPath == "." {
		return ""
	}
	return relPath
}

// handleFileEvents processes file-related events (create, delete, write)
func (fw *FileWatcher) handleFileEvents(event fsnotify.Event) {
	filePath := event.Name

	if event.Has(fsnotify.Create) {
		fw.files.creates = addPendingWatcherEvent(fw.files.creates, pendingPath{path: event.Name})
		return
	}

	if event.Has(fsnotify.Rename) {
		fw.files.renames = fw.addPendingRename(fw.files.renames, event)
		return
	}

	if event.Has(fsnotify.Remove) {
		fw.clearFileState(filePath)
		fw.knownWatchedDirectories.forgetFile(filePath)
		fw.batch.fileDeletes = append(fw.batch.fileDeletes, util.FileDeleteEventData{FilePath: fw.pathFromNotes(filePath)})
		return
	}

	if event.Has(fsnotify.Write) {
		fw.emitFileWriteEvent(filePath)
	}

}

// handleSettingsUpdate processes updates to settings files
func (fw *FileWatcher) handleSettingsUpdate() {
	projectSettings, err := config.LoadProjectSettings(fw.projectPath)
	if err == nil {
		fw.app.Event.EmitEvent(&application.CustomEvent{
			Name: util.EventSettingsUpdate,
			Data: projectSettings,
		})
	}
}

// handleSavedSearchUpdate processes updates to saved searches file
func (fw *FileWatcher) handleSavedSearchUpdate(event fsnotify.Event) {
	if event.Has(fsnotify.Write) ||
		event.Has(fsnotify.Create) ||
		event.Has(fsnotify.Remove) ||
		event.Has(fsnotify.Rename) {
		fw.app.Event.EmitEvent(&application.CustomEvent{
			Name: util.EventSavedSearchUpdate,
			Data: nil,
		})
	}
}

// shouldIgnoreFile checks if a file name should be ignored by the watcher
func shouldIgnoreFile(fileName string) bool {
	if sidecar.IsFileName(fileName) {
		return false
	}
	// Ignore hidden files and folders (names starting with '.')
	if strings.HasPrefix(fileName, ".") {
		return true
	}
	return false
}

// hasFileChanged checks if a file has actually changed by comparing its modification time and size
// to the last recorded state. This helps filter out noisy fsnotify write events.
func (fw *FileWatcher) hasFileChanged(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		fw.clearFileState(path)
		return true
	}

	current := fileState{
		modTime: info.ModTime(),
		size:    info.Size(),
	}

	previous, ok := fw.fileStateCache[path]
	fw.fileStateCache[path] = current
	if !ok {
		return true
	}

	return previous.modTime != current.modTime || previous.size != current.size
}

// clearFileState removes the cached file state for the given path.
func (fw *FileWatcher) clearFileState(path string) {
	delete(fw.fileStateCache, path)
}

// renameFileState transfers the cached file state from the old path to the new path.
func (fw *FileWatcher) renameFileState(oldPath, newPath string) {
	if state, ok := fw.fileStateCache[oldPath]; ok {
		fw.fileStateCache[newPath] = state
		fw.clearFileState(oldPath)
	}
}

func collectWatchableFolderPaths(rootPath string) []string {
	info, err := os.Stat(rootPath)
	if err != nil {
		log.Printf("Error statting notes directory %s: %v", rootPath, err)
		return nil
	}
	if !info.IsDir() {
		return nil
	}

	paths := []string{}
	err = filepath.WalkDir(rootPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			log.Printf("Error walking notes directory %s: %v", path, err)
			return nil
		}

		if !d.IsDir() {
			return nil
		}

		if strings.HasPrefix(d.Name(), ".") && path != rootPath {
			return filepath.SkipDir
		}

		paths = append(paths, path)
		return nil
	})
	if err != nil {
		log.Printf("Error walking notes root %s: %v", rootPath, err)
	}

	return paths
}

func (fw *FileWatcher) addFolderTreeToWatcher(rootPath string) {
	for _, path := range collectWatchableFolderPaths(rootPath) {
		if err := fw.watcher.Add(path); err != nil {
			log.Printf("Error adding watcher for %s: %v", path, err)
			continue
		}
		fw.knownWatchedDirectories.Add(path)
	}
}

// Removes every folder from knownWatchedDirectories that is the rootPath or a child of rootPath (has it as a prefix)
func (fw *FileWatcher) removeFolderTreeWatches(rootPath string) {
	prefix := rootPath + string(os.PathSeparator)
	for _, watchedPath := range fw.knownWatchedDirectories.Snapshot() {
		if watchedPath != rootPath && !strings.HasPrefix(watchedPath, prefix) {
			continue
		}
		if err := fw.watcher.Remove(watchedPath); err != nil && !errors.Is(err, fsnotify.ErrNonExistentWatch) {
			log.Printf("Error removing watcher for %s: %v", watchedPath, err)
		}
		fw.knownWatchedDirectories.Remove(watchedPath)
	}
}

func (fw *FileWatcher) isDirectoryEvent(event fsnotify.Event) bool {
	if util.IsDirectory(event.Name) {
		return true
	}

	// Rename/remove events often arrive after the old path is already gone, so
	// os.Stat(event.Name) can no longer tell us whether it was a directory.
	// Keep an internal record of watched directories so old folder paths still
	// route through the folder event pipeline even if fsnotify has already
	// dropped the underlying watch entry.
	if info := fw.knownWatchedDirectories.fileInfo(event.Name); info != nil && info.IsDir() {
		return true
	}
	return fw.knownWatchedDirectories.Has(event.Name)
}

func (fw *FileWatcher) emitFileWriteEvent(filePath string) {
	fw.knownWatchedDirectories.recordPath(filePath)
	if !fw.hasFileChanged(filePath) {
		return
	}

	eventData := util.FileWriteEventData{FilePath: fw.pathFromNotes(filePath)}

	if filepath.Ext(filePath) == ".md" {
		content, err := os.ReadFile(filePath)
		if err != nil {
			// A failed read is not an empty note. Allow a later event to retry.
			fw.clearFileState(filePath)
			log.Printf("Error reading changed note %s: %v", filePath, err)
			return
		}
		eventData.Markdown = string(content)
	}

	fw.batch.fileWrites = append(fw.batch.fileWrites, eventData)
}

// processEvent handles a single filesystem event
func (fw *FileWatcher) processEvent(event fsnotify.Event) {
	// The search directory also contains index data and temporary atomic writes.
	// Only the saved-search file should produce application events here.
	projectSearchRoot := filepath.Join(fw.projectPath, "search")
	if event.Name == projectSearchRoot || strings.HasPrefix(event.Name, projectSearchRoot+string(os.PathSeparator)) {
		if event.Name == filepath.Join(projectSearchRoot, "saved-searches.json") {
			fw.handleSavedSearchUpdate(event)
		}
		return
	}

	isDir := fw.isDirectoryEvent(event)

	fileName := filepath.Base(event.Name)
	// Skip hidden files unless they are file sidecars handled below.
	if shouldIgnoreFile(fileName) {
		return
	}

	if sidecar.IsFileName(fileName) {
		return
	}

	projectSettingsRoot := filepath.Join(fw.projectPath, "settings")

	isProjectSettingsEvent := event.Name == projectSettingsRoot ||
		strings.HasPrefix(event.Name, projectSettingsRoot+string(os.PathSeparator))

	// We can ignore chmod events unless they target the project settings folder.
	// settings.json is written atomically (write temp + rename), which surfaces as Chmod.
	if event.Has(fsnotify.Chmod) && !isProjectSettingsEvent {
		return
	}

	if !isDir && isProjectSettingsEvent {
		fw.handleSettingsUpdate()
		return
	}
	if isDir {
		fw.handleFolderEvents(event)
	} else {
		fw.handleFileEvents(event)
	}
	fw.handleDebounceReset()
}

// resolveFileQueue pairs file renames with creates and handles replacements.
func (fw *FileWatcher) resolveFileQueue() {
	fw.resolveFileReplacements()
	queue := fw.files
	fw.files = pendingQueue{}
	matches := fw.matchRenameIdentities(queue.renames, queue.creates)
	consumed := make(map[int]bool)
	for i, pending := range queue.renames {
		matchedIndex, paired := matches[i]
		if !paired {
			fw.batch.fileDeletes = append(fw.batch.fileDeletes, util.FileDeleteEventData{FilePath: fw.pathFromNotes(pending.path)})
			fw.clearFileState(pending.path)
			fw.knownWatchedDirectories.forgetFile(pending.path)
			continue
		}
		matched := queue.creates[matchedIndex]
		consumed[matchedIndex] = true
		fw.knownWatchedDirectories.forgetFile(pending.path)
		fw.renameFileState(pending.path, matched.path)
		oldPath, newPath := fw.pathFromNotes(pending.path), fw.pathFromNotes(matched.path)
		if oldPath == newPath {
			fw.emitFileWriteEvent(matched.path)
			continue
		}
		fw.hasFileChanged(matched.path)
		fw.batch.fileRenames = append(fw.batch.fileRenames, util.FileRenameEventData{OldFilePath: oldPath, NewFilePath: newPath})
	}
	for i, pending := range queue.creates {
		if consumed[i] || !util.ExactPathExists(pending.path) {
			continue
		}
		previous := fw.knownWatchedDirectories.fileInfo(pending.path)
		current, err := os.Lstat(pending.path)
		if previous != nil && err == nil && current.Mode().IsRegular() && !os.SameFile(previous, current) {
			fw.clearFileState(pending.path)
			fw.emitFileWriteEvent(pending.path)
			continue
		}
		fw.hasFileChanged(pending.path)
		fw.batch.fileCreates = append(fw.batch.fileCreates, util.FileCreateEventData{FilePath: fw.pathFromNotes(pending.path)})
	}
	for _, pending := range queue.creates {
		fw.knownWatchedDirectories.recordPath(pending.path)
	}
}

// resolveFolderQueue pairs folder renames and refreshes subtree watches.
func (fw *FileWatcher) resolveFolderQueue() {
	queue := fw.folders
	fw.folders = pendingQueue{}
	matches := fw.matchRenameIdentities(queue.renames, queue.creates)
	consumed := make(map[int]bool)
	for i, pending := range queue.renames {
		matchedIndex, paired := matches[i]
		fw.removeFolderTreeWatches(pending.path)
		if !paired {
			fw.batch.folderDeletes = append(fw.batch.folderDeletes, util.FolderDeleteEventData{FolderPath: fw.pathFromNotes(pending.path)})
			continue
		}
		matched := queue.creates[matchedIndex]
		consumed[matchedIndex] = true
		fw.addFolderTreeToWatcher(matched.path)
		oldPath, newPath := fw.pathFromNotes(pending.path), fw.pathFromNotes(matched.path)
		if oldPath != newPath {
			fw.batch.folderRenames = append(fw.batch.folderRenames, util.FolderRenameEventData{OldFolderPath: oldPath, NewFolderPath: newPath})
		}
	}
	for i, pending := range queue.creates {
		if !consumed[i] && util.ExactPathExists(pending.path) {
			fw.batch.folderCreates = append(fw.batch.folderCreates, util.FolderCreateEventData{FolderPath: fw.pathFromNotes(pending.path)})
		}
	}
	for _, pending := range queue.creates {
		fw.knownWatchedDirectories.recordPath(pending.path)
	}
}

// emitDebouncedEvents sends a resolved, typed batch to the application.
func (fw *FileWatcher) emitDebouncedEvents() {
	// Files and folders have separate pending queues; resolve both before emission.
	// Resolve files before folder handling removes or rebuilds subtree watches.
	fw.resolveFileQueue()   // File queue, including replacements.
	fw.resolveFolderQueue() // Folder queue and subtree watch updates.
	for _, event := range fw.batch.events() {
		fw.app.Event.EmitEvent(event)
	}
	fw.batch = watcherBatch{}
}

// start begins the file watching process
func (fw *FileWatcher) start() {
	for {
		select {
		// Whenever a watcher event occurs
		case event, ok := <-fw.watcher.Events:
			if !ok {
				return
			}
			fw.processEvent(event)

		// Whenever the file watcher gives an error
		case err, ok := <-fw.watcher.Errors:
			if !ok {
				return
			}
			log.Println("error:", err)

		// Whenever the debounce timer expires
		case <-fw.debounceTimer.C:
			fw.emitDebouncedEvents()
		}
	}
}

// LaunchFileWatcher creates and starts a FileWatcher
func LaunchFileWatcher(app *application.App, projectPath string, watcher *fsnotify.Watcher, registry *DirectoryWatchRegistry) {
	fw := newFileWatcher(app, projectPath, watcher, registry)
	fw.start()
}

// AddProjectFoldersToWatcher sets up watchers for the essential project folders.
func AddProjectFoldersToWatcher(projectPath string, watcher *fsnotify.Watcher) {
	// Watch parent directories so atomic file replacements do not lose the watch.
	settingsPath := filepath.Join(projectPath, "settings")
	searchPath := filepath.Join(projectPath, "search")

	pathsToWatch := []string{settingsPath, searchPath}

	// Watch the notes root. Subtree watches are added progressively by the bulk import coordinator.
	notesFolderPath := filepath.Join(projectPath, "notes")
	pathsToWatch = append(pathsToWatch, notesFolderPath)

	for _, path := range pathsToWatch {
		if err := watcher.Add(path); err != nil {
			log.Printf("Error adding watcher for %s: %v", path, err)
		}
	}
}
