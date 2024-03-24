package main

import (
	"embed"
	_ "embed"
	"log"
	"os"
	"path/filepath"

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

	// TODO: Provide prompt for user to set a diretory
	if err != nil {
		log.Fatal(err)
	}

	// Creaing notes dir
	notesPath := filepath.Join(projectPath, "notes")
	if err := os.MkdirAll(notesPath, os.ModePerm); err != nil {
		log.Fatalf("Failed to create notes directory: %v", err)
	}

	// Creating git repo if not already exists
	git_helpers.InitalizeGitRepo(projectPath)
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

	// Create a new window with the necessary options.
	// 'Title' is the title of the window.
	// 'Mac' options tailor the window when running on macOS.
	// 'BackgroundColour' is the background colour of the window.
	// 'URL' is the URL that will be loaded into the webview.
	window := app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
		Title:     "Bytebook",
		MinWidth:  800,
		MinHeight: 600,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 35,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		EnableDragAndDrop: true,
		BackgroundColour:  application.NewRGB(27, 38, 54),
		URL:               "/",
	})

	// Create a goroutine that emits an event containing the current time every second.
	// The frontend can listen to this event and update the UI accordingly.
	// go func() {
	// 	for {
	// 		now := time.Now().Format(time.RFC1123)
	// 		app.Events.Emit(&application.WailsEvent{
	// 			Name: "time",
	// 			Data: now,
	// 		})
	// 		time.Sleep(time.Second)
	// 	}
	// }()

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
