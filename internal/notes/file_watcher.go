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

// Constants for file types
const (
	debounceTimeout = 50 * time.Millisecond
)

// CodeResultsUpdateEventData is the payload for code-results:update events,
// emitted when a note's code-results sidecar file changes on disk.
type CodeResultsUpdateEventData struct {
	FilePath    string              `json:"filePath"`
	CodeResults sidecar.CodeResults `json:"codeResults"`
}

func init() {
	// These events are named in util but their payload types live here / in
	// config, which util cannot import without a cycle.
	application.RegisterEvent[config.ProjectSettingsJson](util.EventSettingsUpdate)
	application.RegisterEvent[CodeResultsUpdateEventData](util.EventCodeResultsUpdate)
}

type pendingWatcherEvent struct {
	event    fsnotify.Event
	identity os.FileInfo
}

// fileState is used to determine if a file has actually changed. Fsnotify events can be noisy
// saying that there is a write, when nothing was actually modified about the file.
type fileState struct {
	modTime time.Time
	size    int64
}

// FileWatcher manages file system monitoring and event handling
type FileWatcher struct {
	app                           *application.App
	projectPath                   string
	watcher                       *fsnotify.Watcher
	knownWatchedDirectories       *DirectoryWatchRegistry // Directory paths we have registered watches for, including old rename paths until cleanup runs
	debounceTimer                 *time.Timer             // Timer that fires after inactivity to flush accumulated events
	batch                         watcherBatch            // Events accumulated until debounce fires
	mostRecentFolderCreatedEvents []pendingWatcherEvent   // Folder creates accumulated for the current debounce batch
	mostRecentFileCreatedEvents   []pendingWatcherEvent   // File creates accumulated for the current debounce batch
	pendingFolderRenameEvents     []pendingWatcherEvent   // Folder renames waiting to be paired with a create
	pendingFileRenameEvents       []pendingWatcherEvent   // File renames waiting to be paired with a create
	fileStateCache                map[string]fileState    // Cached modTime/size per path to dedupe changes
}

// newFileWatcher creates and initializes a new FileWatcher
func newFileWatcher(app *application.App, projectPath string, watcher *fsnotify.Watcher, registry *DirectoryWatchRegistry) *FileWatcher {
	return &FileWatcher{
		app:                           app,
		projectPath:                   projectPath,
		watcher:                       watcher,
		knownWatchedDirectories:       registry,
		debounceTimer:                 time.NewTimer(0),
		fileStateCache:                make(map[string]fileState),
		mostRecentFolderCreatedEvents: []pendingWatcherEvent{},
		mostRecentFileCreatedEvents:   []pendingWatcherEvent{},
	}
}

func addPendingWatcherEvent(events []pendingWatcherEvent, event pendingWatcherEvent) []pendingWatcherEvent {
	for _, pending := range events {
		if pending.event.Name == event.event.Name {
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
		fw.mostRecentFolderCreatedEvents = addPendingWatcherEvent(fw.mostRecentFolderCreatedEvents, pendingWatcherEvent{event: event})
	} else if event.Has(fsnotify.Rename) {
		fw.pendingFolderRenameEvents = fw.addPendingRename(fw.pendingFolderRenameEvents, event)
	} else if event.Has(fsnotify.Remove) {
		fw.removeFolderTreeWatches(event.Name)
		fw.queueDelete(true, fw.pathFromNotes(event.Name))
	}

	fw.handleDebounceReset()
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
		fw.mostRecentFileCreatedEvents = addPendingWatcherEvent(fw.mostRecentFileCreatedEvents, pendingWatcherEvent{event: event})
		fw.handleDebounceReset()
		return
	}

	if event.Has(fsnotify.Rename) {
		fw.pendingFileRenameEvents = fw.addPendingRename(fw.pendingFileRenameEvents, event)
		fw.handleDebounceReset()
		return
	}

	if event.Has(fsnotify.Remove) {
		fw.clearFileState(filePath)
		fw.knownWatchedDirectories.forgetFile(filePath)
		fw.queueDelete(false, fw.pathFromNotes(filePath))
		fw.handleDebounceReset()
		return
	}

	if event.Has(fsnotify.Write) {
		fw.emitFileWriteEvent(filePath)
	}

	fw.handleDebounceReset()
}

// handleSettingsUpdate processes updates to settings files
func (fw *FileWatcher) handleSettingsUpdate() {
	var projectSettings config.ProjectSettingsJson
	err := util.ReadJsonFromPath(filepath.Join(fw.projectPath, "settings", "settings.json"), &projectSettings)
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

func (fw *FileWatcher) emitCodeResultsSidecarUpdateEvent(sidecarPath string) {
	notePath := sidecar.NotePathFromPath(sidecarPath)
	if notePath == "" {
		return
	}
	if _, err := os.Stat(notePath); err != nil {
		return
	}

	results := sidecar.CodeResults{
		Version:    sidecar.CodeResultsVersion,
		CodeBlocks: []sidecar.CodeBlock{},
	}
	if _, err := os.Stat(sidecarPath); err == nil {
		readResults, err := sidecar.ReadCodeResults(notePath)
		if err != nil {
			log.Printf("Error reading code results sidecar %s: %v", sidecarPath, err)
			return
		}
		results = readResults
	} else if !os.IsNotExist(err) {
		log.Printf("Error statting code results sidecar %s: %v", sidecarPath, err)
		return
	}

	if fw.app == nil {
		return
	}
	fw.app.Event.EmitEvent(&application.CustomEvent{
		Name: util.EventCodeResultsUpdate,
		Data: CodeResultsUpdateEventData{
			FilePath:    fw.pathFromNotes(notePath),
			CodeResults: results,
		},
	})
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

	// File sidecars are hidden JSON files, but code-result sidecar changes need
	// their own event so other windows can refresh rendered code output.
	if sidecar.IsFileName(fileName) {
		// Chmod events do not change sidecar contents, so only content or path
		// mutations should trigger a code-results refresh.
		if event.Has(fsnotify.Write) || event.Has(fsnotify.Create) || event.Has(fsnotify.Remove) || event.Has(fsnotify.Rename) {
			fw.emitCodeResultsSidecarUpdateEvent(event.Name)
		}
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

	// Handle directory events
	if isDir {
		fw.handleFolderEvents(event)
	} else {
		// Handle file events
		if isProjectSettingsEvent {
			fw.handleSettingsUpdate()
		} else {
			fw.handleFileEvents(event)
		}
	}

}

// resolvePendingRenames pairs pending renames with queued create events for either files or folders.
func (fw *FileWatcher) resolvePendingRenames(isFolder bool) {
	var pendingRenames, recentCreates []pendingWatcherEvent
	if isFolder {
		pendingRenames, recentCreates = fw.pendingFolderRenameEvents, fw.mostRecentFolderCreatedEvents
		fw.pendingFolderRenameEvents, fw.mostRecentFolderCreatedEvents = nil, nil
	} else {
		fw.resolveFileReplacements()
		pendingRenames, recentCreates = fw.pendingFileRenameEvents, fw.mostRecentFileCreatedEvents
		fw.pendingFileRenameEvents, fw.mostRecentFileCreatedEvents = nil, nil
	}

	matches := fw.matchRenameIdentities(pendingRenames, recentCreates)
	consumed := make(map[int]bool)

	for i, pending := range pendingRenames {
		matchedIndex, paired := matches[i]
		if !paired {
			fw.queueDelete(isFolder, fw.pathFromNotes(pending.event.Name))
			if isFolder {
				fw.removeFolderTreeWatches(pending.event.Name)
			} else {
				fw.clearFileState(pending.event.Name)
				fw.knownWatchedDirectories.forgetFile(pending.event.Name)
			}
			continue
		}
		matched := recentCreates[matchedIndex]
		consumed[matchedIndex] = true
		if !isFolder {
			fw.knownWatchedDirectories.forgetFile(pending.event.Name)
		}

		oldPath := fw.pathFromNotes(pending.event.Name)
		newPath := fw.pathFromNotes(matched.event.Name)
		if oldPath == newPath {
			if isFolder {
				// Some editor/workflow sequences can surface as folder rename+create
				// with the same relative path. Refresh the watches and avoid
				// emitting any user-visible folder event for this no-op path change.
				fw.removeFolderTreeWatches(pending.event.Name)
				fw.addFolderTreeToWatcher(matched.event.Name)
				continue
			}
			// Same-path file rename+create is effectively a replace-in-place save.
			// Emitting file:write keeps the editor in sync without navigating the UI.
			fw.renameFileState(pending.event.Name, matched.event.Name)
			fw.emitFileWriteEvent(matched.event.Name)
			continue
		}

		if isFolder {
			// kqueue/fsnotify watches do not follow renamed directory trees. Re-add
			// watches for the new subtree so descendant changes remain observable.
			fw.removeFolderTreeWatches(pending.event.Name)
			fw.addFolderTreeToWatcher(matched.event.Name)
		} else {
			fw.renameFileState(pending.event.Name, matched.event.Name)
			fw.hasFileChanged(matched.event.Name)
		}
		fw.queueRename(isFolder, oldPath, newPath)
	}

	for i, pending := range recentCreates {
		if consumed[i] {
			continue
		}
		path := pending.event.Name
		if !util.ExactPathExists(path) {
			continue
		}
		if !isFolder {
			fw.hasFileChanged(path)
		}
		fw.queueCreate(isFolder, fw.pathFromNotes(path))
	}

	for _, pending := range recentCreates {
		fw.knownWatchedDirectories.recordPath(pending.event.Name)
	}
}

// emitDebouncedEvents sends a resolved, typed batch to the application.
func (fw *FileWatcher) emitDebouncedEvents() {
	// Files and folders have separate pending queues; resolve both before emission.
	// Resolve files before folder handling removes or rebuilds subtree watches.
	fw.resolvePendingRenames(false) // File queue, including replacements.
	fw.resolvePendingRenames(true)  // Folder queue and subtree watch updates.
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
