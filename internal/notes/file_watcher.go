package notes

import (
	"log"
	"os"
	"path/filepath"
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
var TIME_FOR_TWO_EVENTS_TO_BE_RELATED = time.Second * 2

// MostRecentCreatedEvent holds a create event with timestamp and optional file state for rename matching.
type MostRecentCreatedEvent struct {
	event    fsnotify.Event // The filesystem create event (path in event.Name)
	time     time.Time      // When the event was recorded; used to pair with renames within a time window
	state    fileState      // modTime/size at create time; used to match rename with create when available
	hasState bool           // True if state was obtained (e.g. from Stat); when false, only time-window fallback is used
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
	debounceTimer                 *time.Timer                    // Timer that fires after inactivity to flush accumulated events
	debounceEvents                map[string][]map[string]string // Events keyed by type, accumulated until debounce fires
	mostRecentFolderCreatedEvents []MostRecentCreatedEvent       // Recent folder creates used to match renames (emit FolderRename)
	mostRecentFileCreatedEvents   []MostRecentCreatedEvent       // Recent file creates used to match renames (emit NoteRename)
	pendingFolderRenameEvents     []MostRecentCreatedEvent       // Folder renames waiting to be paired with a create
	pendingFileRenameEvents       []MostRecentCreatedEvent       // File renames waiting to be paired with a create
	fileStateCache                map[string]fileState           // Cached modTime/size per path to detect real changes and match renames
}

// newFileWatcher creates and initializes a new FileWatcher
func newFileWatcher(app *application.App, projectPath string, watcher *fsnotify.Watcher) *FileWatcher {
	return &FileWatcher{
		app:                           app,
		projectPath:                   projectPath,
		watcher:                       watcher,
		debounceTimer:                 time.NewTimer(0),
		debounceEvents:                make(map[string][]map[string]string),
		fileStateCache:                make(map[string]fileState),
		mostRecentFolderCreatedEvents: []MostRecentCreatedEvent{},
		mostRecentFileCreatedEvents:   []MostRecentCreatedEvent{},
	}
}

// removeRecentEvent removes an event at index from the given event slice when index is valid.
func removeRecentEvent(events []MostRecentCreatedEvent, index int) []MostRecentCreatedEvent {
	if index < 0 || index >= len(events) {
		return events
	}
	return append(events[:index], events[index+1:]...)
}

// findRelatedRecentEvent finds a matching recent event by state and time, with a unique time-window fallback.
func findRelatedRecentEvent(target fileState, targetOk bool, eventTime time.Time, eventData []MostRecentCreatedEvent) (MostRecentCreatedEvent, int, bool) {
	if len(eventData) == 0 {
		return MostRecentCreatedEvent{}, -1, false
	}

	fileStateMatches := func(a, b fileState) bool {
		return a.size == b.size && a.modTime.Equal(b.modTime)
	}

	// withinRelatedWindow returns true when two timestamps are within the rename-match window.
	withinRelatedWindow := func(a, b time.Time) bool {
		diff := a.Sub(b)
		if diff < 0 {
			diff = -diff
		}
		return diff <= TIME_FOR_TWO_EVENTS_TO_BE_RELATED
	}

	if targetOk {
		for i := len(eventData) - 1; i >= 0; i-- {
			data := eventData[i]
			if !data.hasState {
				continue
			}
			if !withinRelatedWindow(eventTime, data.time) {
				continue
			}
			if fileStateMatches(target, data.state) {
				return data, i, true
			}
		}
	}

	// Fallback: if exactly one candidate is within the window, pair it.
	fallbackIndex := -1
	for i := len(eventData) - 1; i >= 0; i-- {
		if !withinRelatedWindow(eventTime, eventData[i].time) {
			continue
		}
		if fallbackIndex != -1 {
			return MostRecentCreatedEvent{}, -1, false
		}
		fallbackIndex = i
	}

	if fallbackIndex != -1 {
		return eventData[fallbackIndex], fallbackIndex, true
	}

	return MostRecentCreatedEvent{}, -1, false
}

// getFileState stats a path and returns its mod time and size when available.
func (fw *FileWatcher) getFileState(path string) (fileState, bool) {
	info, err := os.Stat(path)
	if err != nil {
		return fileState{}, false
	}
	return fileState{
		modTime: info.ModTime(),
		size:    info.Size(),
	}, true
}

// getRecordedOrStatFileState returns cached state when present, otherwise stats the path.
func (fw *FileWatcher) getRecordedOrStatFileState(path string) (fileState, bool) {
	if state, ok := fw.fileStateCache[path]; ok {
		return state, true
	}
	return fw.getFileState(path)
}

// addRecentCreateEvent records a create event with timestamp and best-effort file state.
func (fw *FileWatcher) addRecentCreateEvent(events []MostRecentCreatedEvent, event fsnotify.Event) []MostRecentCreatedEvent {
	state, ok := fw.getFileState(event.Name)
	return append(events, MostRecentCreatedEvent{
		event:    event,
		time:     time.Now(),
		state:    state,
		hasState: ok,
	})
}

// addPendingRenameEvent records a rename event that is waiting for its related create event.
func (fw *FileWatcher) addPendingRenameEvent(events []MostRecentCreatedEvent, event fsnotify.Event, state fileState, ok bool) []MostRecentCreatedEvent {
	return append(events, MostRecentCreatedEvent{
		event:    event,
		time:     time.Now(),
		state:    state,
		hasState: ok,
	})
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
	eventKey := ""

	if event.Has(fsnotify.Create) {
		fw.mostRecentFolderCreatedEvents = fw.addRecentCreateEvent(fw.mostRecentFolderCreatedEvents, event)
	} else if event.Has(fsnotify.Rename) {
		oldState, oldOk := fw.getRecordedOrStatFileState(event.Name)
		fw.pendingFolderRenameEvents = fw.addPendingRenameEvent(fw.pendingFolderRenameEvents, event, oldState, oldOk)
		// We do not emit a rename event here. The path and its state are stored in pendingFolderRenameEvents.
		// When the debounce timer fires, resolvePendingRenames matches this pending rename with a recent
		// folder create (same state, within the time window). If matched we emit FolderRename(oldPath, newPath);
		// otherwise we emit FolderDelete for the old path.
	} else if event.Has(fsnotify.Remove) {
		eventKey = util.Events.FolderDelete

		fw.debounceEvents[eventKey] = append(
			fw.debounceEvents[eventKey],
			map[string]string{
				"folderPath": fw.pathFromNotes(event.Name),
			},
		)
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

	eventKey := ""

	if event.Has(fsnotify.Create) {
		fw.mostRecentFileCreatedEvents = fw.addRecentCreateEvent(fw.mostRecentFileCreatedEvents, event)
	}

	// A RENAME gets triggered when a file is deleted on macOS
	if event.Has(fsnotify.Rename) || event.Has(fsnotify.Remove) || event.Has(fsnotify.Write) {
		if event.Has(fsnotify.Rename) {
			oldState, oldOk := fw.getRecordedOrStatFileState(notePath)
			fw.pendingFileRenameEvents = fw.addPendingRenameEvent(fw.pendingFileRenameEvents, event, oldState, oldOk)
			// We do not emit a rename event here. The path and its state are stored in pendingFileRenameEvents.
			// When the debounce timer fires, resolvePendingRenames matches this pending rename with a recent
			// file create (same state, within the time window). If matched we emit NoteRename(oldPath, newPath);
			// otherwise we emit NoteDelete for the old path.
		} else if event.Has(fsnotify.Write) {
			eventKey = util.Events.NoteWrite
		} else {
			eventKey = util.Events.NoteDelete
		}
	}

	if eventKey == util.Events.NoteDelete || eventKey == util.Events.NoteWrite {
		if eventKey == util.Events.NoteWrite && !fw.hasFileChanged(notePath) {
			return
		}
		if eventKey == util.Events.NoteDelete {
			fw.clearFileState(notePath)
		}

		eventData := map[string]string{
			"notePath": fw.pathFromNotes(notePath),
		}

		// For markdown file writes, include the content so frontend can compare and update if different
		if eventKey == util.Events.NoteWrite && filepath.Ext(note) == ".md" {
			content, err := os.ReadFile(notePath)
			if err == nil {
				eventData["markdown"] = string(content)
			}
		}

		fw.debounceEvents[eventKey] = append(
			fw.debounceEvents[eventKey],
			eventData,
		)
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

// shouldIgnoreFile checks if a file name should be ignored by the watcher
func shouldIgnoreFile(fileName string) bool {
	// Ignore macOS system files
	if fileName == ".DS_Store" {
		return true
	}
	// Ignore files starting with . (hidden files) except for markdown files
	if strings.HasPrefix(fileName, ".") && !strings.HasSuffix(fileName, ".md") {
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

// processEvent handles a single filesystem event
func (fw *FileWatcher) processEvent(event fsnotify.Event) {
	// log.Println("event:", event, filepath.Ext(event.Name))

	// Might need a better way of determining if something is a folder in the future
	isDir := filepath.Ext(event.Name) == ""

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
	var pendingRenames, recentCreates []MostRecentCreatedEvent
	var deleteEventKey, renameEventKey, deletePathPayload, renameOldPathPayload, renameNewPathPayload string

	if isFolder {
		pendingRenames, recentCreates = fw.pendingFolderRenameEvents, fw.mostRecentFolderCreatedEvents
		deleteEventKey, renameEventKey = util.Events.FolderDelete, util.Events.FolderRename
		deletePathPayload, renameOldPathPayload, renameNewPathPayload = "folderPath", "oldFolderPath", "newFolderPath"
	} else {
		pendingRenames, recentCreates = fw.pendingFileRenameEvents, fw.mostRecentFileCreatedEvents
		deleteEventKey, renameEventKey = util.Events.NoteDelete, util.Events.NoteRename
		deletePathPayload, renameOldPathPayload, renameNewPathPayload = "notePath", "oldNotePath", "newNotePath"
	}

	for _, pending := range pendingRenames {
		matched, index, found := findRelatedRecentEvent(
			pending.state,
			pending.hasState,
			pending.time,
			recentCreates,
		)
		if !found {
			fw.debounceEvents[deleteEventKey] = append(
				fw.debounceEvents[deleteEventKey],
				map[string]string{
					deletePathPayload: fw.pathFromNotes(pending.event.Name),
				},
			)
			if !isFolder {
				fw.clearFileState(pending.event.Name)
			}
			continue
		}

		recentCreates = removeRecentEvent(recentCreates, index)

		oldPath := fw.pathFromNotes(pending.event.Name)
		newPath := fw.pathFromNotes(matched.event.Name)
		if oldPath == newPath {
			fw.debounceEvents[deleteEventKey] = append(
				fw.debounceEvents[deleteEventKey],
				map[string]string{
					deletePathPayload: oldPath,
				},
			)
			if !isFolder {
				fw.clearFileState(pending.event.Name)
			}
			continue
		}

		fw.renameFileState(pending.event.Name, matched.event.Name)
		if !isFolder {
			fw.hasFileChanged(matched.event.Name)
		}
		fw.debounceEvents[renameEventKey] = append(
			fw.debounceEvents[renameEventKey],
			map[string]string{
				renameOldPathPayload: oldPath,
				renameNewPathPayload: newPath,
			},
		)
	}

	if isFolder {
		fw.mostRecentFolderCreatedEvents = recentCreates
	} else {
		fw.mostRecentFileCreatedEvents = recentCreates
	}
}

// emitRemainingCreates emits create events for queued creates not consumed by rename matching.
func (fw *FileWatcher) emitRemainingCreates() {
	for _, pending := range fw.mostRecentFileCreatedEvents {
		notePath := pending.event.Name
		fw.hasFileChanged(notePath)
		fw.debounceEvents[util.Events.NoteCreate] = append(
			fw.debounceEvents[util.Events.NoteCreate],
			map[string]string{
				"notePath": fw.pathFromNotes(notePath),
			},
		)
	}
	for _, pending := range fw.mostRecentFolderCreatedEvents {
		fw.debounceEvents[util.Events.FolderCreate] = append(
			fw.debounceEvents[util.Events.FolderCreate],
			map[string]string{
				"folderPath": fw.pathFromNotes(pending.event.Name),
			},
		)
	}
}

// emitDebouncedEvents sends all accumulated events to the application
func (fw *FileWatcher) emitDebouncedEvents() {
	fw.resolvePendingRenames(false) // files first
	fw.resolvePendingRenames(true)  // then folders
	fw.emitRemainingCreates()

	fw.mostRecentFileCreatedEvents = []MostRecentCreatedEvent{}
	fw.mostRecentFolderCreatedEvents = []MostRecentCreatedEvent{}
	fw.pendingFileRenameEvents = []MostRecentCreatedEvent{}
	fw.pendingFolderRenameEvents = []MostRecentCreatedEvent{}

	filteredEvents := filterUnneededDebouncedEvents(fw.debounceEvents)
	for eventKey, data := range filteredEvents {
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
func LaunchFileWatcher(app *application.App, projectPath string, watcher *fsnotify.Watcher) {
	fw := newFileWatcher(app, projectPath, watcher)
	fw.start()
}

// AddProjectFoldersToWatcher sets up watchers for the essential project folders.
// Individual note folders are added lazily when the user expands them in the UI.
func AddProjectFoldersToWatcher(projectPath string, watcher *fsnotify.Watcher) {
	// Set up paths
	settingsPath := filepath.Join(projectPath, "settings")
	notesFolderPath := filepath.Join(projectPath, "notes")

	// The search path contains the index which we don't want to watch
	savedSearchesPath := filepath.Join(projectPath, "search", "saved-searches.json")

	// Add main folders to watcher
	watcher.Add(settingsPath)
	watcher.Add(notesFolderPath)
	watcher.Add(savedSearchesPath)
}
