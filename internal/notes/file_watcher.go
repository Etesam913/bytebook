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
	debounceTimeout = 350 * time.Millisecond
)

var IMAGE_FILE_EXTENSIONS = []string{"png", "jpg", "jpeg", "webp", "gif"}
var VIDEO_FILE_EXTENSIONS = []string{"mov", "mp4", "m4v"}
var TIME_FOR_TWO_EVENTS_TO_BE_RELATED = time.Second * 2

type MostRecentCreatedEvent struct {
	event fsnotify.Event
	time  time.Time
}

// fileState is used to determine if a file has actually changed. Fsnotify events can be noisy
// saying that there is a write, when nothing was actually modified about the file.
type fileState struct {
	modTime time.Time
	size    int64
}

// FileWatcher manages file system monitoring and event handling
type FileWatcher struct {
	app                          *application.App
	projectPath                  string
	watcher                      *fsnotify.Watcher
	debounceTimer                *time.Timer
	debounceEvents               map[string][]map[string]string
	mostRecentFolderCreatedEvent MostRecentCreatedEvent
	mostRecentFileCreatedEvent   MostRecentCreatedEvent
	lastFileState                map[string]fileState
}

// newFileWatcher creates and initializes a new FileWatcher
func newFileWatcher(app *application.App, projectPath string, watcher *fsnotify.Watcher) *FileWatcher {
	return &FileWatcher{
		app:            app,
		projectPath:    projectPath,
		watcher:        watcher,
		debounceTimer:  time.NewTimer(0),
		debounceEvents: make(map[string][]map[string]string),
		lastFileState:  make(map[string]fileState),
		mostRecentFolderCreatedEvent: MostRecentCreatedEvent{
			event: fsnotify.Event{},
			time:  time.Now(),
		},
		mostRecentFileCreatedEvent: MostRecentCreatedEvent{
			event: fsnotify.Event{},
			time:  time.Now(),
		},
	}
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
		eventKey = util.Events.FolderCreate
		fw.mostRecentFolderCreatedEvent = MostRecentCreatedEvent{
			event: event,
			time:  time.Now(),
		}

		fw.debounceEvents[eventKey] = append(
			fw.debounceEvents[eventKey],
			map[string]string{
				"folderPath": fw.pathFromNotes(event.Name),
			},
		)

		fw.watcher.Add(event.Name)
	}

	if event.Has(fsnotify.Remove) || event.Has(fsnotify.Rename) {
		timeDiff := time.Since(fw.mostRecentFolderCreatedEvent.time)
		if event.Has(fsnotify.Rename) && timeDiff < TIME_FOR_TWO_EVENTS_TO_BE_RELATED {
			newFolderPath := fw.mostRecentFolderCreatedEvent.event.Name
			eventKey = util.Events.FolderRename

			fw.debounceEvents[eventKey] = append(
				fw.debounceEvents[eventKey],
				map[string]string{
					"oldFolderPath": fw.pathFromNotes(event.Name),
					"newFolderPath": fw.pathFromNotes(newFolderPath),
				},
			)
		} else {
			eventKey = util.Events.FolderDelete

			fw.debounceEvents[eventKey] = append(
				fw.debounceEvents[eventKey],
				map[string]string{
					"folderPath": fw.pathFromNotes(event.Name),
				},
			)
		}
		fw.watcher.Remove(event.Name)
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
func (fw *FileWatcher) handleFileEvents(segments []string, event fsnotify.Event, oneFolderBack string) {
	note := segments[len(segments)-1]
	notePath := event.Name

	eventKey := ""

	if event.Has(fsnotify.Create) {
		eventKey = util.Events.NoteCreate
		fw.mostRecentFileCreatedEvent = MostRecentCreatedEvent{
			event: event,
			time:  time.Now(),
		}
	}

	// A RENAME gets triggered when a file is deleted on macOS
	if event.Has(fsnotify.Rename) || event.Has(fsnotify.Remove) || event.Has(fsnotify.Write) {
		timeDiff := time.Since(fw.mostRecentFileCreatedEvent.time)

		// timeDiff is used to be certain that the rename event is not a delete
		if event.Has(fsnotify.Rename) && timeDiff < TIME_FOR_TWO_EVENTS_TO_BE_RELATED {
			newFilePath := fw.mostRecentFileCreatedEvent.event.Name

			eventKey = util.Events.NoteRename
			fw.renameFileState(event.Name, newFilePath)
			fw.debounceEvents[eventKey] = append(
				fw.debounceEvents[eventKey],
				map[string]string{
					"oldNotePath": fw.pathFromNotes(event.Name),
					"newNotePath": fw.pathFromNotes(newFilePath),
				},
			)
		} else if event.Has(fsnotify.Write) {
			eventKey = util.Events.NoteWrite
		} else {
			eventKey = util.Events.NoteDelete
		}

	}
	if eventKey == util.Events.NoteCreate || eventKey == util.Events.NoteDelete || eventKey == util.Events.NoteWrite {
		if eventKey == util.Events.NoteWrite && !fw.hasFileChanged(notePath) {
			return
		}
		if eventKey == util.Events.NoteDelete {
			fw.clearFileState(notePath)
		}
		if eventKey == util.Events.NoteCreate {
			// Record the initial state so we can detect future write noise.
			fw.hasFileChanged(notePath)
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

// shouldIgnoreFile checks if a file should be ignored by the watcher
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

	previous, ok := fw.lastFileState[path]
	fw.lastFileState[path] = current
	if !ok {
		return true
	}

	return previous.modTime != current.modTime || previous.size != current.size
}

func (fw *FileWatcher) clearFileState(path string) {
	delete(fw.lastFileState, path)
}

func (fw *FileWatcher) renameFileState(oldPath, newPath string) {
	if state, ok := fw.lastFileState[oldPath]; ok {
		fw.lastFileState[newPath] = state
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
			fw.handleFileEvents(segments, event, oneFolderBack)
		}
	}

}

// emitDebouncedEvents sends all accumulated events to the application
func (fw *FileWatcher) emitDebouncedEvents() {
	for eventKey, data := range fw.debounceEvents {
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

// AddProjectFoldersToWatcher sets up watchers for all relevant project folders
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

	// Add all note folders and files (including nested)
	err := filepath.WalkDir(notesFolderPath, func(path string, info os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}

		if path == notesFolderPath {
			return nil
		}

		name := info.Name()
		if shouldIgnoreFile(name) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		watcher.Add(path)
		return nil
	})
	if err != nil {
		log.Fatalf("Failed to walk notes directory: %v", err)
	}
}
