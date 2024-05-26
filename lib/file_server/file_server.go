package file_server

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

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

func LaunchFileWatcher(app *application.App, watcher *fsnotify.Watcher) {
	for {
		select {
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
				folderName := filepath.Base(event.Name)
				if event.Has(fsnotify.Create) {

					watcher.Add(event.Name)
					// This is to prevent an infinite loop as creating a folder also creates an attachments folder
					if folderName == "attachments" {
						continue
					}
					// Add an attachments folder as well
					attachmentsPath := filepath.Join(event.Name, "attachments")
					if err := os.MkdirAll(attachmentsPath, os.ModePerm); err != nil {
						log.Fatalf("Failed to create attachments folder: %v", err)
					}
					watcher.Add(attachmentsPath)

					app.Events.Emit(&application.WailsEvent{
						Name: "folder:create",
						Data: map[string]string{"folder": folderName},
					})
				}
				if event.Has(fsnotify.Remove) || event.Has(fsnotify.Rename) {
					watcher.Remove(event.Name)
					app.Events.Emit(&application.WailsEvent{
						Name: "folder:delete",
						Data: map[string]string{"folder": folderName},
					})
				}
				continue
			}

			// Only dealing with files at this point
			segments := strings.Split(event.Name, "/")
			oneFolderBack := segments[len(segments)-2]
			twoFoldersBack := segments[len(segments)-3]
			fmt.Println(oneFolderBack, twoFoldersBack)
			// If it is not a note
			if oneFolderBack == "attachments" {
				log.Println(("attachment folder"))
				if event.Has(fsnotify.Rename) || event.Has(fsnotify.Remove) {
					app.Events.Emit(&application.WailsEvent{
						Name: "attachment:delete",
						Data: map[string]string{"name": filepath.Base(event.Name), "folder": twoFoldersBack},
					})
				} else if event.Has(fsnotify.Create) {
					app.Events.Emit(&application.WailsEvent{
						Name: "attachment:create",
						Data: map[string]string{"name": filepath.Base(event.Name), "folder": twoFoldersBack},
					})
				}
			} else if oneFolderBack == "trash" {
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
			} else {
				// Listen for changes only to markdown files when in note folder
				if filepath.Ext(event.Name) != ".md" {
					continue
				}
				noteName := strings.Replace(segments[len(segments)-1], ".md", "", 1)
				// This works for MACOS need to test on other platforms
				if event.Has(fsnotify.Rename) || event.Has(fsnotify.Remove) {
					app.Events.Emit(&application.WailsEvent{
						Name: "note:delete",
						Data: map[string]string{"note": noteName, "folder": oneFolderBack},
					})
				} else if event.Has(fsnotify.Create) {
					app.Events.Emit(&application.WailsEvent{
						Name: "note:create",
						Data: map[string]string{"note": noteName, "folder": oneFolderBack},
					})
				}
			}

		case err, ok := <-watcher.Errors:
			if !ok {
				return
			}
			log.Println("error:", err)
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
			attachmentsPath := filepath.Join(folderPath, "attachments")
			watcher.Add(attachmentsPath)
		}
	}
}
