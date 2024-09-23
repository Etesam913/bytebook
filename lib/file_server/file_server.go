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
	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v3/pkg/application"
)

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
	port := ":5890"
	log.Printf("Serving files on http://localhost%s/", port)

	// Start the HTTP server
	err := http.ListenAndServe(port, mux)
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
Handles folder:create, folder:delete, and folder:rename events
*/
func handleFolderEvents(
	event fsnotify.Event,
	watcher *fsnotify.Watcher,
	debounceTimer *time.Timer,
	debounceEvents map[string][]map[string]string,
) {

	folderName := filepath.Base(event.Name)
	eventKey := ""
	if event.Has(fsnotify.Create) {
		eventKey = "folder:create"
		watcher.Add(event.Name)
	}
	if event.Has(fsnotify.Remove) || event.Has(fsnotify.Rename) {
		eventKey = "folder:delete"
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
Handles trash:create and trash:delete events
*/

/*
Handles note:create, note:delete, trash:create, and trash:delete events
There is a debounce timer to prevent multiple events from being emitted
*/
func handleFileEvents(
	segments []string,
	event fsnotify.Event,
	oneFolderBack string,
	debounceTimer *time.Timer,
	debounceEvents map[string][]map[string]string,
	eventKeyPrefix string,
) {

	note := segments[len(segments)-1]
	lastIndexOfDot := strings.LastIndex(note, ".")
	noteName := note[:lastIndexOfDot]
	extension := note[lastIndexOfDot+1:]

	eventKey := ""

	// This works for MACOS need to test on other platforms
	if event.Has(fsnotify.Rename) || event.Has(fsnotify.Remove) {
		eventKey = eventKeyPrefix + ":delete"
	} else if event.Has(fsnotify.Create) {
		eventKey = eventKeyPrefix + ":create"
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
			// We can ignore chmod events unless it is a settings folder as it can run instead of just a write event
			if event.Has(fsnotify.Chmod) && oneFolderBack != "settings" {
				continue
			}

			// If is a directory
			if isDir {
				// We do not care about folders inside of folders
				// TODO: A user could create a folder called notes inside of notes and this would be problematic
				if oneFolderBack == "notes" {
					handleFolderEvents(event, watcher, debounceTimer, debounceEvents)
				}
				continue
			}

			if oneFolderBack == "trash" {
				handleFileEvents(segments, event, oneFolderBack, debounceTimer, debounceEvents, "trash")
			} else if oneFolderBack == "settings" {
				// The settings got updated
				var projectSettings project_types.ProjectSettingsJson
				err := io_helpers.ReadJsonFromPath(filepath.Join(projectPath, "settings", "settings.json"), &projectSettings)
				if err == nil {
					app.EmitEvent("settings:update", projectSettings)
				}
			} else {
				handleFileEvents(segments, event, oneFolderBack, debounceTimer, debounceEvents, "note")
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
				app.EmitEvent(eventKey, data)
			}
			// Clear the debounced events
			debounceEvents = make(map[string][]map[string]string)
		}
	}
}

/** Watches each folder in the notes directory */
func ListenToFolders(projectPath string, watcher *fsnotify.Watcher) {
	watcher.Add(filepath.Join(projectPath, "trash"))
	watcher.Add(filepath.Join(projectPath, "settings"))
	notesFolderPath := filepath.Join(projectPath, "notes")
	watcher.Add(notesFolderPath)
	entries, err := os.ReadDir(notesFolderPath)
	if err != nil {
		log.Fatalf("Failed to read notes directory: %v", err)
	}
	for _, entry := range entries {
		if entry.IsDir() {
			folderPath := filepath.Join(notesFolderPath, entry.Name())
			watcher.Add(folderPath)
		}
	}
}
