package main

import (
	"embed"
	"log"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/lib/auth_server"
	"github.com/etesam913/bytebook/lib/custom_events"
	"github.com/etesam913/bytebook/lib/file_server"
	"github.com/etesam913/bytebook/lib/git_helpers"
	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/menus"
	"github.com/etesam913/bytebook/lib/project_helpers"
	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// Wails uses Go's `embed` package to embed the frontend files into the binary.
// Any files in the frontend/dist folder will be embedded into the binary and
// made available to the frontend.
// See https://pkg.go.dev/embed for more information.

//go:embed frontend/dist
var assets embed.FS

// main function serves as the application's entry point. It initializes the application, creates a window,
// and starts a goroutine that emits a time-based event every second. It subsequently runs the application and
// logs any error that might occur.
func main() {
	projectPath, err := project_helpers.GetProjectPath()
	// TODO: Provide prompt for user to set a directory
	if err != nil {
		log.Fatal(err)
	}

	// Creating notes dir
	notesPath := filepath.Join(projectPath, "notes")
	if err := os.MkdirAll(notesPath, os.ModePerm); err != nil {
		log.Fatalf("Failed to create notes directory: %v", err)
	}

	// Creating git repo if it does not already exist
	git_helpers.InitializeGitRepo(projectPath)
	git_helpers.SetRepoOrigin("https://github.com/Etesam913/bytebook-test.git")

	io_helpers.CreateFolderIfNotExist(filepath.Join(projectPath, "trash"))

	// Launching file server for images/videos
	go file_server.LaunchFileServer(projectPath)

	app := application.New(application.Options{
		Name:        "bytebook",
		Description: "A simple note taking app.",
		Services: []application.Service{
			application.NewService(
				&FolderService{ProjectPath: projectPath},
			),
			application.NewService(
				&NoteService{ProjectPath: projectPath},
			),
			application.NewService(
				&NodeService{ProjectPath: projectPath},
			),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	backgroundColor := application.NewRGB(27, 38, 54)
	if app.IsDarkMode() {
		backgroundColor = application.NewRGB(0, 0, 0)
	}

	custom_events.CreateWindow(app, "/", backgroundColor)

	menus.InitializeApplicationMenu(app)

	folderContextMenu := app.NewMenu()
	noteContextMenu := app.NewMenu()

	project_helpers.CreateContextMenu(app, folderContextMenu, []project_helpers.MenuItem{
		{Label: "Rename Folder", EventName: "folder:context-menu:rename"},
		{Label: "Delete Folder", EventName: "folder:context-menu:delete"},
		{Label: "Open Folder In New Window", EventName: "folder:open-in-new-window"},
		{Label: "Reveal In Finder", EventName: "folder:reveal-in-finder"},
	})

	project_helpers.CreateContextMenu(app, noteContextMenu, []project_helpers.MenuItem{
		{Label: "Open Note In New Window", EventName: "note:open-in-new-window"},
		{Label: "Send To Trash", EventName: "note:context-menu:delete"},
	})

	app.RegisterContextMenu("folder-context-menu", folderContextMenu)
	app.RegisterContextMenu("note-context-menu", noteContextMenu)

	custom_events.OpenNoteInNewWindowEvent(app, backgroundColor)

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal("Failed to setup file watcher " + err.Error())
	}
	defer watcher.Close()
	go file_server.LaunchFileWatcher(app, watcher)
	go auth_server.LaunchAuthServer()
	file_server.ListenToFolders(projectPath, watcher)

	// Run the application. This blocks until the application has been exited.
	err = app.Run()

	// If an error occurred while running the application, log it and exit.
	if err != nil {
		log.Fatal(err)
	}

}
