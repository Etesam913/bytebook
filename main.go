package main

import (
	"embed"
	_ "embed"
	"log"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/lib/custom_events"
	"github.com/etesam913/bytebook/lib/file_server"
	"github.com/etesam913/bytebook/lib/git_helpers"
	"github.com/etesam913/bytebook/lib/project_helpers"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
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

	// Launching file server for images/videos
	go file_server.LaunchFileServer(projectPath)

	// Create a new Wails application by providing the necessary options.
	// Variables 'Name' and 'Description' are for application metadata.
	// 'Assets' configures the asset server with the 'FS' variable pointing to the frontend files.
	// 'Bind' is a list of Go struct instances. The frontend has access to the methods of these instances.
	// 'Mac' options tailor the application when running an macOS.
	app := application.New(application.Options{
		Name:        "bytebook",
		Description: "A simple note taking app.",
		Bind: []any{
			&FolderService{ProjectPath: projectPath},
			&NoteService{ProjectPath: projectPath},
			&NodeService{ProjectPath: projectPath},
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

	window := app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
		Title:     "Bytebook",
		MinWidth:  800,
		MinHeight: 600,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 35,
			Backdrop:                application.MacBackdropNormal,
			TitleBar:                application.MacTitleBarHiddenInsetUnified,
		},
		EnableDragAndDrop: true,
		BackgroundColour:  backgroundColor,
		URL:               "/",
	})

	folderContextMenu := app.NewMenu()
	noteContextMenu := app.NewMenu()

	project_helpers.SetupFolderContextMenu(app, folderContextMenu, []project_helpers.MenuItem{
		{Label: "Rename Folder", EventName: "rename-folder"},
		{Label: "Add Note", EventName: "add-note"},
		{Label: "Delete Folder", EventName: "delete-folder"},
	})

	project_helpers.SetupFolderContextMenu(app, noteContextMenu, []project_helpers.MenuItem{
		{Label: "Open In New Window", EventName: "open-note-in-new-window-frontend"},
		{Label: "Delete Note", EventName: "delete-note"},
	})

	app.RegisterContextMenu("folder-context-menu", folderContextMenu)
	app.RegisterContextMenu("note-context-menu", noteContextMenu)

	custom_events.OpenNoteInNewWindowEvent(app, backgroundColor)

	window.On(events.Common.WindowFilesDropped, func(event *application.WindowEvent) {
		files := event.Context().DroppedFiles()
		app.Events.Emit(&application.WailsEvent{
			Name: "files",
			Data: files,
		})
		app.Logger.Info("Files Dropped!", "files", files)
	})

	// Run the application. This blocks until the application has been exited.
	err = app.Run()

	// If an error occurred while running the application, log it and exit.
	if err != nil {
		log.Fatal(err)
	}
}
