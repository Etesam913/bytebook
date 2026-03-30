package notes

import (
	"errors"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/etesam913/bytebook/internal/config"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// Constants for file types
const (
	debounceTimeout = 50 * time.Millisecond
)

var IMAGE_FILE_EXTENSIONS = []string{"png", "jpg", "jpeg", "webp", "gif"}
var VIDEO_FILE_EXTENSIONS = []string{"mov", "mp4", "m4v"}

type pendingWatcherEvent struct {
	event fsnotify.Event
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
	knownWatchedDirectories       *DirectoryWatchRegistry        // Directory paths we have registered watches for, including old rename paths until cleanup runs
	debounceTimer                 *time.Timer                    // Timer that fires after inactivity to flush accumulated events
	debounceEvents                map[string][]map[string]string // Events keyed by type, accumulated until debounce fires
	mostRecentFolderCreatedEvents []pendingWatcherEvent          // Folder creates accumulated for the current debounce batch
	mostRecentFileCreatedEvents   []pendingWatcherEvent          // File creates accumulated for the current debounce batch
	pendingFolderRenameEvents     []pendingWatcherEvent          // Folder renames waiting to be paired with a create
	pendingFileRenameEvents       []pendingWatcherEvent          // File renames waiting to be paired with a create
	fileStateCache                map[string]fileState           // Cached modTime/size per path to dedupe changes
}

// newFileWatcher creates and initializes a new FileWatcher
func newFileWatcher(app *application.App, projectPath string, watcher *fsnotify.Watcher, registry *DirectoryWatchRegistry) *FileWatcher {
	if registry == nil {
		registry = NewDirectoryWatchRegistry()
		registry.SyncFromWatcher(watcher)
	}

	return &FileWatcher{
		app:                           app,
		projectPath:                   projectPath,
		watcher:                       watcher,
		knownWatchedDirectories:       registry,
		debounceTimer:                 time.NewTimer(0),
		debounceEvents:                make(map[string][]map[string]string),
		fileStateCache:                make(map[string]fileState),
		mostRecentFolderCreatedEvents: []pendingWatcherEvent{},
		mostRecentFileCreatedEvents:   []pendingWatcherEvent{},
	}
}

// removeRecentEvent removes an event at index from the given event slice when index is valid.
func removeRecentEvent(events []pendingWatcherEvent, index int) []pendingWatcherEvent {
	if index < 0 || index >= len(events) {
		return events
	}
	return append(events[:index], events[index+1:]...)
}

func addPendingWatcherEvent(events []pendingWatcherEvent, event fsnotify.Event) []pendingWatcherEvent {
	return append(events, pendingWatcherEvent{event: event})
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
		fw.mostRecentFolderCreatedEvents = addPendingWatcherEvent(fw.mostRecentFolderCreatedEvents, event)
	} else if event.Has(fsnotify.Rename) {
		fw.pendingFolderRenameEvents = addPendingWatcherEvent(fw.pendingFolderRenameEvents, event)
	} else if event.Has(fsnotify.Remove) {
		fw.removeFolderTreeWatches(event.Name)
		fw.appendDebouncedEvent(util.Events.FolderDelete, map[string]string{
			"folderPath": fw.pathFromNotes(event.Name),
		})
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
func (fw *FileWatcher) handleFileEvents(segments []string, event fsnotify.Event) {
	note := segments[len(segments)-1]
	notePath := event.Name

	if event.Has(fsnotify.Create) {
		fw.mostRecentFileCreatedEvents = addPendingWatcherEvent(fw.mostRecentFileCreatedEvents, event)
		fw.handleDebounceReset()
		return
	}

	if event.Has(fsnotify.Rename) {
		fw.pendingFileRenameEvents = addPendingWatcherEvent(fw.pendingFileRenameEvents, event)
		fw.handleDebounceReset()
		return
	}

	if event.Has(fsnotify.Remove) {
		fw.clearFileState(notePath)
		fw.appendDebouncedEvent(util.Events.NoteDelete, map[string]string{
			"notePath": fw.pathFromNotes(notePath),
		})
		fw.handleDebounceReset()
		return
	}

	if event.Has(fsnotify.Write) {
		fw.emitNoteWriteEvent(notePath, note)
	}

	fw.handleDebounceReset()
}

// handleSettingsUpdate processes updates to settings files
func (fw *FileWatcher) handleSettingsUpdate() {
	var projectSettings config.ProjectSettingsJson
	err := util.ReadJsonFromPath(filepath.Join(fw.projectPath, "settings", "settings.json"), &projectSettings)
	if err == nil {
		fw.app.Event.EmitEvent(&application.CustomEvent{
			Name: util.Events.SettingsUpdate,
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
			Name: util.Events.SavedSearchUpdate,
			Data: nil,
		})
	}
}

// filterUnneededDebouncedEvents removes redundant create and delete events for items
// that were also the "new*Path" (for create) or "old*Path" (for delete) target of a rename event within the same debounce cycle.
// This prevents redundant creation/deletion events for items that were simply renamed/moved.
func filterUnneededDebouncedEvents(events map[string][]map[string]string) map[string][]map[string]string {
	noteRenameEvents := events[util.Events.NoteRename]
	folderRenameEvents := events[util.Events.FolderRename]
	if len(noteRenameEvents) == 0 && len(folderRenameEvents) == 0 {
		return events
	}

	renamedNotePathsSet := util.Set[string]{}
	originalNotePathsSet := util.Set[string]{}
	for _, data := range noteRenameEvents {
		if newNotePath, ok := data["newNotePath"]; ok && newNotePath != "" {
			renamedNotePathsSet.Add(newNotePath)
		}
		if oldNotePath, ok := data["oldNotePath"]; ok && oldNotePath != "" {
			originalNotePathsSet.Add(oldNotePath)
		}
	}

	renamedFolderPathsSet := util.Set[string]{}
	originalFolderPathsSet := util.Set[string]{}

	for _, data := range folderRenameEvents {
		if newFolderPath, ok := data["newFolderPath"]; ok && newFolderPath != "" {
			renamedFolderPathsSet.Add(newFolderPath)
		}
		if oldFolderPath, ok := data["oldFolderPath"]; ok && oldFolderPath != "" {
			originalFolderPathsSet.Add(oldFolderPath)
		}
	}

	// Nothing changed
	if (len(renamedNotePathsSet) == 0 && len(renamedFolderPathsSet) == 0) &&
		(len(originalNotePathsSet) == 0 && len(originalFolderPathsSet) == 0) {
		return events
	}

	filteredEvents := make(map[string][]map[string]string, len(events))
	for eventKey, data := range events {
		switch eventKey {
		case util.Events.NoteCreate:
			kept := make([]map[string]string, 0, len(data))
			for _, payload := range data {
				notePath := payload["notePath"]
				// Filters out note:create events that are the result of a rename (already captured by note:rename)
				if renamedNotePathsSet.Has(notePath) {
					continue
				}
				kept = append(kept, payload)
			}
			if len(kept) > 0 {
				filteredEvents[eventKey] = kept
			}
		case util.Events.FolderCreate:
			kept := make([]map[string]string, 0, len(data))
			for _, payload := range data {
				folderPath := payload["folderPath"]
				if renamedFolderPathsSet.Has(folderPath) {
					continue
				}
				kept = append(kept, payload)
			}
			if len(kept) > 0 {
				filteredEvents[eventKey] = kept
			}
		case util.Events.NoteDelete:
			kept := make([]map[string]string, 0, len(data))
			for _, payload := range data {
				notePath := payload["notePath"]
				// Filters out note:delete events that are the result of a rename (already captured by note:rename)
				if originalNotePathsSet.Has(notePath) {
					continue
				}
				kept = append(kept, payload)
			}
			if len(kept) > 0 {
				filteredEvents[eventKey] = kept
			}
		case util.Events.FolderDelete:
			kept := make([]map[string]string, 0, len(data))
			for _, payload := range data {
				folderPath := payload["folderPath"]
				if originalFolderPathsSet.Has(folderPath) {
					continue
				}
				kept = append(kept, payload)
			}
			if len(kept) > 0 {
				filteredEvents[eventKey] = kept
			}
		default:
			filteredEvents[eventKey] = data
		}
	}

	return filteredEvents
}

// dedupeDebouncedEventsByPathPayload dedupes event payloads when they contain one or more path-like fields.
// A path-like field is any key ending in "Path" (e.g. notePath, folderPath, oldNotePath, newNotePath).
// For duplicate path signatures within the same event key, the latest payload is kept.
func dedupeDebouncedEventsByPathPayload(events map[string][]map[string]string) map[string][]map[string]string {
	deduped := make(map[string][]map[string]string, len(events))

	for eventKey, data := range events {
		if len(data) == 0 {
			continue
		}

		kept := make([]map[string]string, 0, len(data))
		signatureIndex := make(map[string]int, len(data))

		for _, payload := range data {
			pathKeys := []string{}
			for key := range payload {
				if strings.HasSuffix(key, "Path") {
					pathKeys = append(pathKeys, key)
				}
			}

			// If this payload doesn't represent a path, keep it as-is.
			if len(pathKeys) == 0 {
				kept = append(kept, payload)
				continue
			}

			sort.Strings(pathKeys)

			// Build a stable "path signature" for this payload.
			// Example:
			//   oldNotePath=a.md, newNotePath=b.md
			// becomes:
			//   oldNotePath=a.md|newNotePath=b.md|
			//
			// We only include *Path keys so non-path fields (like markdown body)
			// do not affect deduping identity. strings.Builder avoids repeated
			// intermediate string allocations while concatenating parts.
			var builder strings.Builder
			for _, key := range pathKeys {
				builder.WriteString(key)
				builder.WriteString("=")
				builder.WriteString(payload[key])
				builder.WriteString("|")
			}
			signature := builder.String()

			// If we already saw this signature for this event type, replace
			// the older payload with the latest one at the same position.
			// This preserves output order while still collapsing duplicates.
			if existingIndex, ok := signatureIndex[signature]; ok {
				kept[existingIndex] = payload
				continue
			}

			// First time we see this signature: record where it lives in `kept`
			// so a later duplicate can overwrite in-place.
			signatureIndex[signature] = len(kept)
			kept = append(kept, payload)
		}

		if len(kept) > 0 {
			deduped[eventKey] = kept
		}
	}

	return deduped
}

// shouldIgnoreFile checks if a file name should be ignored by the watcher
func shouldIgnoreFile(fileName string) bool {
	// Ignore macOS system files
	if fileName == ".DS_Store" {
		return true
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
	return fw.knownWatchedDirectories.Has(event.Name)
}

func (fw *FileWatcher) appendDebouncedEvent(eventKey string, payload map[string]string) {
	fw.debounceEvents[eventKey] = append(fw.debounceEvents[eventKey], payload)
}

func (fw *FileWatcher) emitNoteWriteEvent(notePath, note string) {
	if !fw.hasFileChanged(notePath) {
		return
	}

	eventData := map[string]string{
		"notePath": fw.pathFromNotes(notePath),
	}

	if filepath.Ext(note) == ".md" {
		content, err := os.ReadFile(notePath)
		if err == nil {
			eventData["markdown"] = string(content)
		}
	}

	fw.appendDebouncedEvent(util.Events.NoteWrite, eventData)
}

// processEvent handles a single filesystem event
func (fw *FileWatcher) processEvent(event fsnotify.Event) {
	// log.Println("event:", event, filepath.Ext(event.Name))

	isDir := fw.isDirectoryEvent(event)

	// Parse path components
	segments := strings.Split(event.Name, "/")
	if len(segments) < 3 {
		return // Skip if path is too short
	}

	// Skip system files like .DS_Store
	fileName := filepath.Base(event.Name)
	if shouldIgnoreFile(fileName) {
		return
	}

	oneFolderBack := segments[len(segments)-2]

	// We can ignore chmod events unless it is a settings folder
	if event.Has(fsnotify.Chmod) && oneFolderBack != "settings" {
		return
	}

	// Handle directory events
	if isDir {
		fw.handleFolderEvents(event)
	} else {
		// Handle file events
		if oneFolderBack == "settings" {
			fw.handleSettingsUpdate()
		} else if oneFolderBack == "search" && filepath.Base(event.Name) == "saved-searches.json" {
			fw.handleSavedSearchUpdate(event)
		} else {
			fw.handleFileEvents(segments, event)
		}
	}

}

// resolvePendingRenames pairs pending renames with queued create events for either files or folders.
func (fw *FileWatcher) resolvePendingRenames(isFolder bool) {
	var pendingRenames, recentCreates []pendingWatcherEvent
	var deleteEventKey, renameEventKey, createEventKey string
	var deletePathPayload, renameOldPathPayload, renameNewPathPayload, createPathPayload string

	if isFolder {
		pendingRenames, recentCreates = fw.pendingFolderRenameEvents, fw.mostRecentFolderCreatedEvents
		deleteEventKey, renameEventKey = util.Events.FolderDelete, util.Events.FolderRename
		createEventKey = util.Events.FolderCreate
		deletePathPayload, renameOldPathPayload, renameNewPathPayload = "folderPath", "oldFolderPath", "newFolderPath"
		createPathPayload = "folderPath"
	} else {
		pendingRenames, recentCreates = fw.pendingFileRenameEvents, fw.mostRecentFileCreatedEvents
		deleteEventKey, renameEventKey = util.Events.NoteDelete, util.Events.NoteRename
		createEventKey = util.Events.NoteCreate
		deletePathPayload, renameOldPathPayload, renameNewPathPayload = "notePath", "oldNotePath", "newNotePath"
		createPathPayload = "notePath"
	}

	// Fsnotify guarantees "old path Rename" plus "new path Create" for tracked
	// renames, but it does not expose a correlation ID. To avoid false renames,
	// only pair when the whole batch is a single old path and a single new path.
	// Anything else is treated conservatively as delete/create.
	canPairRenames := len(pendingRenames) == 1 && len(recentCreates) == 1

	for _, pending := range pendingRenames {
		if !canPairRenames {
			// Renames get represented as a delete on the old path when there is no match
			fw.appendDebouncedEvent(deleteEventKey, map[string]string{
				deletePathPayload: fw.pathFromNotes(pending.event.Name),
			})
			if isFolder {
				fw.removeFolderTreeWatches(pending.event.Name)
			} else {
				fw.clearFileState(pending.event.Name)
			}
			continue
		}

		matched := recentCreates[0]
		recentCreates = removeRecentEvent(recentCreates, 0)

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
			// Emitting note:write keeps the editor in sync without navigating the UI.
			fw.renameFileState(pending.event.Name, matched.event.Name)
			fw.emitNoteWriteEvent(matched.event.Name, filepath.Base(matched.event.Name))
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
		fw.appendDebouncedEvent(renameEventKey, map[string]string{
			renameOldPathPayload: oldPath,
			renameNewPathPayload: newPath,
		})
	}

	for _, pending := range recentCreates {
		path := pending.event.Name
		if !isFolder {
			fw.hasFileChanged(path)
		}
		fw.appendDebouncedEvent(createEventKey, map[string]string{
			createPathPayload: fw.pathFromNotes(path),
		})
	}

	if isFolder {
		fw.mostRecentFolderCreatedEvents = recentCreates
	} else {
		fw.mostRecentFileCreatedEvents = recentCreates
	}
}

func orderedDebouncedEventKeys(events map[string][]map[string]string) []string {
	order := []string{
		util.Events.FolderRename,
		util.Events.NoteRename,
		util.Events.FolderDelete,
		util.Events.NoteDelete,
		util.Events.FolderCreate,
		util.Events.NoteCreate,
		util.Events.NoteWrite,
	}

	keys := []string{}
	for _, key := range order {
		if len(events[key]) > 0 {
			keys = append(keys, key)
		}
	}

	for key, data := range events {
		if len(data) == 0 {
			continue
		}
		known := slices.Contains(order, key)
		if !known {
			keys = append(keys, key)
		}
	}

	return keys
}

// emitDebouncedEvents sends all accumulated events to the application
func (fw *FileWatcher) emitDebouncedEvents() {
	fw.resolvePendingRenames(false) // files first
	fw.resolvePendingRenames(true)  // then folders

	fw.mostRecentFileCreatedEvents = []pendingWatcherEvent{}
	fw.mostRecentFolderCreatedEvents = []pendingWatcherEvent{}
	fw.pendingFileRenameEvents = []pendingWatcherEvent{}
	fw.pendingFolderRenameEvents = []pendingWatcherEvent{}

	dedupedEvents := dedupeDebouncedEventsByPathPayload(fw.debounceEvents)
	filteredEvents := filterUnneededDebouncedEvents(dedupedEvents)
	for _, eventKey := range orderedDebouncedEventKeys(filteredEvents) {
		data := filteredEvents[eventKey]
		fw.app.Event.EmitEvent(&application.CustomEvent{
			Name: eventKey,
			Data: data,
		})
	}
	// Clear the debounced events
	fw.debounceEvents = make(map[string][]map[string]string)
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
	// Always watch the settings folder and saved searches file.
	settingsPath := filepath.Join(projectPath, "settings")
	savedSearchesPath := filepath.Join(projectPath, "search", "saved-searches.json")

	pathsToWatch := []string{settingsPath, savedSearchesPath}

	// Watch the notes root. Subtree watches are added progressively by the bulk import coordinator.
	notesFolderPath := filepath.Join(projectPath, "notes")
	pathsToWatch = append(pathsToWatch, notesFolderPath)

	for _, path := range pathsToWatch {
		if err := watcher.Add(path); err != nil {
			log.Printf("Error adding watcher for %s: %v", path, err)
		}
	}
}
