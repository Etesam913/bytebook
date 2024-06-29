package file_server

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// corsMiddleware wraps an http.Handler and sets CORS headers
func corsMiddleware(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*") // Adjust this to allow specific domains
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		// Handle preflight OPTIONS request
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Serve the next handler
		handler.ServeHTTP(w, r)
	})
}

func LaunchFileServer(projectPath string) {
	// Create a file server handler
	fileServer := http.FileServer(http.Dir(projectPath))
	wrappedFileServer := corsMiddleware(fileServer)
	// Serve files from the root URL
	http.Handle("/", wrappedFileServer)

	// Specify the port to listen on
	port := ":5890"
	log.Printf("Serving files on http://localhost%s/", port)

	// Start the HTTP server
	err := http.ListenAndServe(port, nil)
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
// - Resets the timer to start counting down from 200 milliseconds.
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

	// Reset the timer to 200 milliseconds.
	// This means the timer will start counting down from 200ms again.
	debounceTimer.Reset(200 * time.Millisecond)
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
	if event.Has(fsnotify.Remove) {
		eventKey = "folder:delete"
		watcher.Remove(event.Name)

	}
	if event.Has(fsnotify.Rename) {
		eventKey = "folder:rename"
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
func handleTrashEvents(app *application.App, event fsnotify.Event) {
	if event.Has(fsnotify.Rename) || event.Has(fsnotify.Remove) {
		app.Events.Emit(&application.WailsEvent{
			Name: "trash:delete",
			Data: map[string]string{"name": filepath.Base(event.Name)},
		})
	} else if event.Has(fsnotify.Create) {
		app.Events.Emit(&application.WailsEvent{
			Name: "trash:create",
			Data: map[string]string{"name": filepath.Base(event.Name)},
		})
	}
}

/*
Handles note:create and note:delete events
There is a debounce timer to prevent multiple events from being emitted
*/
func handleNoteEvents(
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

func LaunchFileWatcher(app *application.App, watcher *fsnotify.Watcher) {
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

			// We can ignore chmod events
			if event.Has(fsnotify.Chmod) {
				continue
			}

			// If is a directory
			if isDir {
				handleFolderEvents(event, watcher, debounceTimer, debounceEvents)
				continue
			}

			// Only dealing with files at this point
			segments := strings.Split(event.Name, "/")
			oneFolderBack := segments[len(segments)-2]
			if oneFolderBack == "trash" {
				handleTrashEvents(app, event)
			} else {
				handleNoteEvents(segments, event, oneFolderBack, debounceTimer, debounceEvents)
			}
		// Whenever the file watcher gives an error
		case err, ok := <-watcher.Errors:
			if !ok {
				return
			}
			log.Println("error:", err)

		// Whenever the debounce timer expires
		case <-debounceTimer.C:
			fmt.Println("debounce", debounceEvents)
			// Timer expired, emit debounced events
			for eventKey, data := range debounceEvents {
				app.Events.Emit(&application.WailsEvent{
					Name: eventKey,
					Data: data,
				})
			}
			// Clear the debounced events
			debounceEvents = make(map[string][]map[string]string)
		}
	}
}

/** Watches each folder in the notes directory */
func ListenToFolders(projectPath string, watcher *fsnotify.Watcher) {
	watcher.Add(filepath.Join(projectPath, "trash"))
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
