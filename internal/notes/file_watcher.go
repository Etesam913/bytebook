package notes

import (
	"fmt"
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
func (fw *FileWatcher) handleFolderEvents(prefix string, event fsnotify.Event) {
	folderName := filepath.Base(event.Name)
	eventKey := ""

	if event.Has(fsnotify.Create) {
		eventKey = fmt.Sprintf("%s:create", prefix)
		fw.mostRecentFolderCreatedEvent = MostRecentCreatedEvent{
			event: event,
			time:  time.Now(),
		}
		fw.watcher.Add(event.Name)
	}

	if event.Has(fsnotify.Remove) || event.Has(fsnotify.Rename) {
		// Handle rename events for note folders
		timeDiff := time.Since(fw.mostRecentFolderCreatedEvent.time)
		if prefix == "notes-folder" && event.Has(fsnotify.Rename) && timeDiff < TIME_FOR_TWO_EVENTS_TO_BE_RELATED {
			fw.handleNoteFolderRename(folderName)
		}
		eventKey = fmt.Sprintf("%s:delete", prefix)
		fw.watcher.Remove(event.Name)
	}

	if eventKey != "" {
		fw.debounceEvents[eventKey] = append(
			fw.debounceEvents[eventKey],
			map[string]string{
				"folder": folderName,
			},
		)
	}
	fw.handleDebounceReset()
}

// handleNoteFolderRename processes a folder rename event by updating all markdown files within the folder
// and their associated tags. It updates internal markdown URLs to reflect the new folder name and updates
// any references to the folder in the tags system. The function takes the old folder name as input and uses
// the most recent folder created event to determine the new folder path and name.
func (fw *FileWatcher) handleNoteFolderRename(oldFolderName string) {
	newFolderPath := fw.mostRecentFolderCreatedEvent.event.Name
	newFolderName := filepath.Base(newFolderPath)
	// When the note folder is renamed, all notes need path updates
	files, err := os.ReadDir(newFolderPath)
	if err != nil {
		return
	}

	for _, file := range files {
		indexOfDot := strings.LastIndex(file.Name(), ".")
		if indexOfDot == -1 {
			continue
		}

		extension := file.Name()[indexOfDot+1:]
		if extension != "md" {
			continue
		}

		pathToFile := filepath.Join(newFolderPath, file.Name())
		noteContent, err := os.ReadFile(pathToFile)
		if err != nil {
			fmt.Println(err)
			continue
		}
		// Updates the urls inside the note markdown
		noteMarkdownWithNewFolderName := ReplaceMarkdownURLs(
			string(noteContent), filepath.Base(newFolderPath),
		)

		err = os.WriteFile(pathToFile, []byte(noteMarkdownWithNewFolderName), 0644)
		if err != nil {
			fmt.Println(err)
			continue
		}

		err = UpdateFolderNameInTags(fw.projectPath, oldFolderName, newFolderName)
		if err != nil {
			fmt.Println(err)
			continue
		}
	}
}

// handleFileEvents processes file-related events (create, delete)
func (fw *FileWatcher) handleFileEvents(segments []string, event fsnotify.Event, oneFolderBack string) {
	note := segments[len(segments)-1]
	lastIndexOfDot := strings.LastIndex(note, ".")
	if lastIndexOfDot == -1 {
		return // Skip files without extensions
	}

	noteName := note[:lastIndexOfDot]
	extension := note[lastIndexOfDot+1:]
	eventKey := ""

	if event.Has(fsnotify.Create) {
		eventKey = "note:create"
		fw.mostRecentFileCreatedEvent = MostRecentCreatedEvent{
			event: event,
			time:  time.Now(),
		}
	}

	// A RENAME gets triggered when a file is deleted on macOS
	if event.Has(fsnotify.Rename) || event.Has(fsnotify.Remove) {
		timeDiff := time.Since(fw.mostRecentFileCreatedEvent.time)
		if event.Has(fsnotify.Rename) && timeDiff < TIME_FOR_TWO_EVENTS_TO_BE_RELATED {
			oldFileFolder := filepath.Base(filepath.Dir(event.Name))
			oldFileName := filepath.Base(event.Name)
			oldFolderAndNote := filepath.Join(oldFileFolder, oldFileName)
			fw.handleFileRename(oldFolderAndNote)
		}

		eventKey = "note:delete"
	}
	if eventKey != "" {
		fw.debounceEvents[eventKey] = append(
			fw.debounceEvents[eventKey],
			map[string]string{
				"folder": oneFolderBack,
				"note":   fmt.Sprintf("%s?ext=%s", noteName, extension),
			},
		)
	}
	fw.handleDebounceReset()
}

// handleFileRename updates the tag paths associated with the old file name to the new file name
func (fw *FileWatcher) handleFileRename(oldFolderAndNote string) {
	newFilePath := fw.mostRecentFileCreatedEvent.event.Name
	newFileFolder := filepath.Base(filepath.Dir(newFilePath))
	newFile := filepath.Base(newFilePath)
	newFolderAndNote := filepath.Join(newFileFolder, newFile)
	fmt.Println(oldFolderAndNote, "->", newFolderAndNote)
	err := UpdateNoteNameInTags(fw.projectPath, oldFolderAndNote, newFolderAndNote)
	if err != nil {
		fmt.Println(err.Error())
	}
}

// handleSettingsUpdate processes updates to settings files
func (fw *FileWatcher) handleSettingsUpdate() {
	var projectSettings config.ProjectSettingsJson
	err := util.ReadJsonFromPath(filepath.Join(fw.projectPath, "settings", "settings.json"), &projectSettings)
	if err == nil {
		fw.app.Event.EmitEvent(&application.CustomEvent{
			Name: "settings:update",
			Data: projectSettings,
		})
	}
}

// handleTagsUpdate processes updates to tag files
func (fw *FileWatcher) handleTagsUpdate(event fsnotify.Event, tagName string) {
	tagNotesArray := TagsToNotesArray{}
	err := util.ReadJsonFromPath(event.Name, &tagNotesArray)

	if err != nil {
		return
	}

	// Create a new object that holds everything from tagPaths plus the TagName field
	eventData := struct {
		TagsToNotesArray
		TagName string `json:"tagName"`
	}{
		TagsToNotesArray: tagNotesArray,
		TagName:          tagName,
	}

	fw.app.Event.EmitEvent(&application.CustomEvent{
		Name: "tags:update",
		Data: eventData,
	})
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
	twoFolderBack := ""
	if len(segments) >= 4 {
		twoFolderBack = segments[len(segments)-3]
	}

	// We can ignore chmod events unless it is a settings folder
	if event.Has(fsnotify.Chmod) && oneFolderBack != "settings" {
		return
	}

	// Handle directory events
	if isDir {
		switch oneFolderBack {
		case "notes":
			fw.handleFolderEvents("notes-folder", event)
		case "tags":
			fw.handleFolderEvents("tags-folder", event)
		}
		return
	}

	// Handle file events
	if oneFolderBack == "settings" {
		fw.handleSettingsUpdate()
	} else if twoFolderBack == "tags" {
		fw.handleTagsUpdate(event, oneFolderBack)
	} else {
		fw.handleFileEvents(segments, event, oneFolderBack)
	}
}

// emitDebouncedEvents sends all accumulated events to the application
func (fw *FileWatcher) emitDebouncedEvents() {
	for eventKey, data := range fw.debounceEvents {
		fmt.Println(eventKey, data)
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
	tagsFolderPath := filepath.Join(projectPath, "tags")

	// Add main folders to watcher
	watcher.Add(settingsPath)
	watcher.Add(notesFolderPath)
	watcher.Add(tagsFolderPath)

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

	// Add all tag subfolders
	tagEntries, err := os.ReadDir(tagsFolderPath)
	if err != nil {
		log.Fatalf("Failed to read tags directory: %v", err)
	}
	for _, entry := range tagEntries {
		if entry.IsDir() {
			watcher.Add(filepath.Join(tagsFolderPath, entry.Name()))
		}
	}
}
