package file_server

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/note_helpers"
	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/etesam913/bytebook/lib/tags_helper"
	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v3/pkg/application"
)

var PORT = ":5890"

var IMAGE_FILE_EXTENSIONS = []string{"png", "jpg", "jpeg", "webp", "gif"}

var VIDEO_FILE_EXTENSIONS = []string{"mov", "mp4", "m4v"}

// CORSResponseWriter wraps http.ResponseWriter to modify headers after the handler writes them
type CORSResponseWriter struct {
	http.ResponseWriter
}

func (w *CORSResponseWriter) WriteHeader(statusCode int) {
	// Set CORS headers before writing the status code and headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Range, X-Playback-Session-Id")
	w.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Range")
	w.Header().Set("Accept-Ranges", "bytes") // Ensure Accept-Ranges is set
	w.ResponseWriter.WriteHeader(statusCode)
}

func corsMiddleware(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Handle preflight OPTIONS request
		if r.Method == "OPTIONS" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Range, X-Playback-Session-Id")
			w.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Range")
			w.WriteHeader(http.StatusOK)
			return
		}

		// Wrap the ResponseWriter
		cw := &CORSResponseWriter{ResponseWriter: w}
		handler.ServeHTTP(cw, r)
	})
}

func LaunchFileServer(projectPath string) {
	mux := http.NewServeMux()
	// Create a file server handler
	fileServer := http.FileServer(http.Dir(projectPath))
	wrappedFileServer := corsMiddleware(fileServer)
	// Serve files from the root URL
	mux.Handle("/", wrappedFileServer)

	// Specify the port to listen on

	log.Printf("Serving files on http://localhost%s/", PORT)

	// Start the HTTP server
	err := http.ListenAndServe(PORT, mux)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

// handleDebounceReset stops the given debounce timer, drains its channel if necessary, and resets it to 200 milliseconds.
//
// This function is useful for implementing debouncing logic, where you want to reset a timer each time an event occurs,
// so that the event handler is only triggered after a specified period of inactivity.
//
// Behavior:
// - Stops the timer to prevent it from firing.
// - If the timer had already fired, it drains the timer's channel to consume the expired event.
// - Resets the timer to start counting down from 75 milliseconds.
func handleDebounceReset(debounceTimer *time.Timer) {
	// Stop the timer, but don't drain the channel if it's already empty.
	if !debounceTimer.Stop() {
		// Try to drain the channel. This ensures that any pending trigger is consumed.
		// If the channel is already empty, the default case ensures we don't block.
		select {
		case <-debounceTimer.C:
		default:
		}
	}

	// Reset the timer 75 milliseconds.
	// This means the timer will start counting down from 75s again.
	debounceTimer.Reset(75 * time.Millisecond)
}

/*
Handles notes-folder:create, notes-folder:delete, and notes-folder:rename events
*/
func handleFolderEvents(
	prefix string,
	event fsnotify.Event,
	watcher *fsnotify.Watcher,
	debounceTimer *time.Timer,
	debounceEvents map[string][]map[string]string,
	mostRecentFolderCreated *string,
) {

	folderName := filepath.Base(event.Name)
	eventKey := ""
	if event.Has(fsnotify.Create) {
		eventKey = fmt.Sprintf("%s:create", prefix)
		*mostRecentFolderCreated = event.Name
		watcher.Add(event.Name)
	}
	if event.Has(fsnotify.Remove) || event.Has(fsnotify.Rename) {
		// We only care about rename events for note folders.
		if prefix == "notes-folder" && event.Has(fsnotify.Rename) {
			newFolderPath := *mostRecentFolderCreated

			// When the note folder is renamed, all the notes in the folder need to have their paths updated to be in the new folder
			files, err := os.ReadDir(newFolderPath)
			if err == nil {
				for _, file := range files {
					indexOfDot := strings.LastIndex(file.Name(), ".")
					extension := file.Name()[indexOfDot+1:]
					if extension == "md" {
						pathToFile := filepath.Join(newFolderPath, file.Name())
						noteContent, err := os.ReadFile(pathToFile)
						if err != nil {
							fmt.Println(err)
							continue
						}
						noteMarkdownWithNewFolderName := note_helpers.ReplaceMarkdownURLs(
							string(noteContent), filepath.Base(newFolderPath),
						)
						err = os.WriteFile(pathToFile, []byte(noteMarkdownWithNewFolderName), 0644)
						if err != nil {
							fmt.Println(err)
							continue
						}
					}
				}
			}

		}
		eventKey = fmt.Sprintf("%s:delete", prefix)
		watcher.Remove(event.Name)
	}

	if eventKey != "" {
		debounceEvents[eventKey] = append(
			debounceEvents[eventKey],
			map[string]string{
				"folder": folderName,
			},
		)
	}
	handleDebounceReset(debounceTimer)
}

/*
Handles note:create and note:delete events
There is a debounce timer to prevent multiple events from being emitted
*/
func handleFileEvents(
	segments []string,
	event fsnotify.Event,
	oneFolderBack string,
	debounceTimer *time.Timer,
	debounceEvents map[string][]map[string]string,
) {
	note := segments[len(segments)-1]
	lastIndexOfDot := strings.LastIndex(note, ".")
	noteName := note[:lastIndexOfDot]
	extension := note[lastIndexOfDot+1:]

	eventKey := ""

	// This works for MACOS need to test on other platforms
	if event.Has(fsnotify.Rename) || event.Has(fsnotify.Remove) {
		eventKey = "note:delete"
	} else if event.Has(fsnotify.Create) {
		eventKey = "note:create"
	}

	if eventKey != "" {
		debounceEvents[eventKey] = append(
			debounceEvents[eventKey],
			map[string]string{
				"folder": oneFolderBack,
				"note":   fmt.Sprintf("%s?ext=%s", noteName, extension),
			},
		)
	}
	handleDebounceReset(debounceTimer)
}

func LaunchFileWatcher(app *application.App, projectPath string, watcher *fsnotify.Watcher) {
	debounceTimer := time.NewTimer(0)
	debounceEvents := make(map[string][]map[string]string)
	mostRecentFolderCreated := ""

	for {
		select {
		// Whenever a watcher events occurs
		case event, ok := <-watcher.Events:
			// Closed
			if !ok {
				return
			}

			log.Println("event:", event, filepath.Ext(event.Name))

			// Might need a better way of determining if something is a folder in the future
			isDir := filepath.Ext(event.Name) == ""

			// Only dealing with files at this point
			segments := strings.Split(event.Name, "/")
			oneFolderBack := segments[len(segments)-2]
			twoFolderBack := segments[len(segments)-3]
			// We can ignore chmod events unless it is a settings folder as it can run instead of just a write event
			if event.Has(fsnotify.Chmod) && oneFolderBack != "settings" {
				continue
			}

			// If is a directory
			if isDir {
				// We do not care about folders inside of folders
				// TODO: A user could create a folder called notes inside of notes and this would be problematic
				if oneFolderBack == "notes" {
					handleFolderEvents(
						"notes-folder",
						event,
						watcher,
						debounceTimer,
						debounceEvents,
						&mostRecentFolderCreated,
					)
				}
				if oneFolderBack == "tags" {
					handleFolderEvents(
						"tags-folder",
						event,
						watcher,
						debounceTimer,
						debounceEvents,
						&mostRecentFolderCreated,
					)
				}
				continue
			}
			if oneFolderBack == "settings" {
				// If settings.json is updated
				var projectSettings project_types.ProjectSettingsJson
				err := io_helpers.ReadJsonFromPath(filepath.Join(projectPath, "settings", "settings.json"), &projectSettings)
				if err == nil {
					app.EmitEvent("settings:update", projectSettings)
				}
			} else if twoFolderBack == "tags" {
				// If a notes.json file in a tag folder is updated
				tagName := oneFolderBack
				tagNotesArray := tags_helper.TagsToNotesArray{}
				err := io_helpers.ReadJsonFromPath(event.Name, &tagNotesArray)
				// Create a new object that holds everything from tagPaths plus your new NoteName field.
				eventData := struct {
					tags_helper.TagsToNotesArray
					TagName string `json:"tagName"`
				}{
					TagsToNotesArray: tagNotesArray,
					TagName:          tagName,
				}
				if err == nil {
					app.EmitEvent("tags:update", eventData)
				}
			} else {
				handleFileEvents(segments, event, oneFolderBack, debounceTimer, debounceEvents)
			}
		// Whenever the file watcher gives an error
		case err, ok := <-watcher.Errors:
			if !ok {
				return
			}
			log.Println("error:", err)

			// Whenever the debounce timer expires
		case <-debounceTimer.C:
			// Timer expired, emit debounced events
			for eventKey, data := range debounceEvents {
				fmt.Println(eventKey, data)
				app.EmitEvent(eventKey, data)
			}
			// Clear the debounced events
			debounceEvents = make(map[string][]map[string]string)
		}
	}
}

/** Watches each folder in the notes directory */
func ListenToFolders(projectPath string, watcher *fsnotify.Watcher) {
	watcher.Add(filepath.Join(projectPath, "settings"))
	notesFolderPath := filepath.Join(projectPath, "notes")
	tagsFolderPath := filepath.Join(projectPath, "tags")

	watcher.Add(notesFolderPath)
	watcher.Add(tagsFolderPath)
	noteEntries, err := os.ReadDir(notesFolderPath)

	if err != nil {
		log.Fatalf("Failed to read notes directory: %v", err)
	}

	tagEntries, err := os.ReadDir(tagsFolderPath)
	if err != nil {
		log.Fatalf("Failed to read tags directory: %v", err)
	}

	for _, entry := range noteEntries {
		if entry.IsDir() {
			folderPath := filepath.Join(notesFolderPath, entry.Name())
			watcher.Add(folderPath)
		}
	}

	for _, entry := range tagEntries {
		if entry.IsDir() {
			folderPath := filepath.Join(tagsFolderPath, entry.Name())
			watcher.Add(folderPath)
		}
	}
}
