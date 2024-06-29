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

/*
Handles folder:create, folder:delete, and folder:rename events
*/
func handleFolderEvents(app *application.App, event fsnotify.Event, watcher *fsnotify.Watcher) {
	folderName := filepath.Base(event.Name)
	if event.Has(fsnotify.Create) {

		watcher.Add(event.Name)

		app.Events.Emit(&application.WailsEvent{
			Name: "folder:create",
			Data: map[string]string{"folder": folderName},
		})
	}
	if event.Has(fsnotify.Remove) {
		watcher.Remove(event.Name)
		app.Events.Emit(&application.WailsEvent{
			Name: "folder:delete",
			Data: map[string]string{"folder": folderName},
		})
	}
	if event.Has(fsnotify.Rename) {
		watcher.Remove(event.Name)
		app.Events.Emit(&application.WailsEvent{
			Name: "folder:rename",
			Data: map[string]string{"folder": folderName},
		})
	}
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
	app *application.App,
	segments []string,
	event fsnotify.Event,
	oneFolderBack string,
	debounceTimer *time.Timer,
	debounceEvents map[string][]map[string]string) {

	note := segments[len(segments)-1]
	lastIndexOfDot := strings.LastIndex(note, ".")
	noteName := note[:lastIndexOfDot]
	extension := note[lastIndexOfDot+1:]
	// This works for MACOS need to test on other platforms
	if event.Has(fsnotify.Rename) || event.Has(fsnotify.Remove) {
		eventKey := "note:delete"
		debounceEvents[eventKey] = append(
			debounceEvents[eventKey],
			map[string]string{
				"folder": oneFolderBack,
				"note":   fmt.Sprintf("%s?ext=%s", noteName, extension),
			},
		)
		// fmt.Sprintf("%s?ext=%s", noteName, extension)

		// Stop the timer, but don't drain the channel
		if !debounceTimer.Stop() {
			// Try to drain the channel, but don't block if it's already empty
			select {
			case <-debounceTimer.C:
			default:
			}
		}

		// reset at 200ms
		debounceTimer.Reset(200 * time.Millisecond)
		fmt.Println("debounce", debounceEvents)

	} else if event.Has(fsnotify.Create) {
		app.Events.Emit(&application.WailsEvent{
			Name: "note:create",
			Data: map[string]string{"note": fmt.Sprintf("%s?ext=%s", noteName, extension), "folder": oneFolderBack},
		})
	}

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
				handleFolderEvents(app, event, watcher)
				continue
			}

			// Only dealing with files at this point
			segments := strings.Split(event.Name, "/")
			oneFolderBack := segments[len(segments)-2]
			if oneFolderBack == "trash" {
				handleTrashEvents(app, event)
			} else {
				handleNoteEvents(app, segments, event, oneFolderBack, debounceTimer, debounceEvents)
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
				if eventKey == "note:delete" {
					app.Events.Emit(&application.WailsEvent{
						Name: "note:delete",
						Data: data,
					})
				}
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
