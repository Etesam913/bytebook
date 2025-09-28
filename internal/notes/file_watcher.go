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
	debounceTimeout = 75 * time.Millisecond
)

var IMAGE_FILE_EXTENSIONS = []string{"png", "jpg", "jpeg", "webp", "gif"}
var VIDEO_FILE_EXTENSIONS = []string{"mov", "mp4", "m4v"}
var TIME_FOR_TWO_EVENTS_TO_BE_RELATED = time.Second * 2

type MostRecentCreatedEvent struct {
	event fsnotify.Event
	time  time.Time
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
}

// newFileWatcher creates and initializes a new FileWatcher
func newFileWatcher(app *application.App, projectPath string, watcher *fsnotify.Watcher) *FileWatcher {
	return &FileWatcher{
		app:            app,
		projectPath:    projectPath,
		watcher:        watcher,
		debounceTimer:  time.NewTimer(0),
		debounceEvents: make(map[string][]map[string]string),
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
	folderName := filepath.Base(event.Name)
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
				"folder": folderName,
			},
		)

		fw.watcher.Add(event.Name)
	}

	if event.Has(fsnotify.Remove) || event.Has(fsnotify.Rename) {
		timeDiff := time.Since(fw.mostRecentFolderCreatedEvent.time)
		if event.Has(fsnotify.Rename) && timeDiff < TIME_FOR_TWO_EVENTS_TO_BE_RELATED {
			newFolderPath := fw.mostRecentFolderCreatedEvent.event.Name
			newFolderName := filepath.Base(newFolderPath)
			eventKey = util.Events.FolderRename

			fw.debounceEvents[eventKey] = append(
				fw.debounceEvents[eventKey],
				map[string]string{
					"oldFolder": folderName,
					"newFolder": newFolderName,
				},
			)
		} else {
			eventKey = util.Events.FolderDelete

			fw.debounceEvents[eventKey] = append(
				fw.debounceEvents[eventKey],
				map[string]string{
					"folder": folderName,
				},
			)
		}
		fw.watcher.Remove(event.Name)
	}

	fw.handleDebounceReset()
}

// handleFileEvents processes file-related events (create, delete, write)
func (fw *FileWatcher) handleFileEvents(segments []string, event fsnotify.Event, oneFolderBack string) {
	note := segments[len(segments)-1]

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

		// timeDiff is used to be certain that the rename event is no a delete
		if event.Has(fsnotify.Rename) && timeDiff < TIME_FOR_TWO_EVENTS_TO_BE_RELATED {
			oldFileFolder := filepath.Base(filepath.Dir(event.Name))
			oldFileName := filepath.Base(event.Name)

			newFilePath := fw.mostRecentFileCreatedEvent.event.Name
			newFileFolder := filepath.Base(filepath.Dir(newFilePath))
			newFileName := filepath.Base(newFilePath)

			eventKey = util.Events.NoteRename
			fw.debounceEvents[eventKey] = append(
				fw.debounceEvents[eventKey],
				map[string]string{
					"oldFolder": oldFileFolder,
					"oldNote":   oldFileName,
					"newFolder": newFileFolder,
					"newNote":   newFileName,
				},
			)
		} else if event.Has(fsnotify.Write) {
			eventKey = util.Events.NoteWrite
		} else {
			eventKey = util.Events.NoteDelete
		}

	}
	if eventKey == util.Events.NoteCreate || eventKey == util.Events.NoteDelete || eventKey == util.Events.NoteWrite {
		fw.debounceEvents[eventKey] = append(
			fw.debounceEvents[eventKey],
			map[string]string{
				"folder": oneFolderBack,
				"note":   note,
			},
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

// processEvent handles a single filesystem event
func (fw *FileWatcher) processEvent(event fsnotify.Event) {
	log.Println("event:", event, filepath.Ext(event.Name))

	// Might need a better way of determining if something is a folder in the future
	isDir := filepath.Ext(event.Name) == ""

	// Parse path components
	segments := strings.Split(event.Name, "/")
	if len(segments) < 3 {
		return // Skip if path is too short
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
	searchPath := filepath.Join(projectPath, "search")

	// Add main folders to watcher
	watcher.Add(settingsPath)
	watcher.Add(notesFolderPath)
	watcher.Add(searchPath)

	// Add all note subfolders
	noteEntries, err := os.ReadDir(notesFolderPath)
	if err != nil {
		log.Fatalf("Failed to read notes directory: %v", err)
	}
	for _, entry := range noteEntries {
		if entry.IsDir() {
			watcher.Add(filepath.Join(notesFolderPath, entry.Name()))
		}
	}
}
