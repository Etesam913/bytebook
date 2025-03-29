package main

import (
	"embed"
	"log"

	"github.com/etesam913/bytebook/lib/auth_server"
	"github.com/etesam913/bytebook/lib/custom_events"
	"github.com/etesam913/bytebook/lib/file_server"
	"github.com/etesam913/bytebook/lib/git_helpers"
	"github.com/etesam913/bytebook/lib/menus"
	"github.com/etesam913/bytebook/lib/project_helpers"
	"github.com/etesam913/bytebook/services"
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
	if err != nil {
		log.Fatalf("Failed to get project path: %v", err)
	}

	// Creating project directories
	project_helpers.CreateProjectDirectories(projectPath)
	projectFiles := project_helpers.CreateProjectFiles(projectPath)

	// Creating git repo if it does not already exist
	git_helpers.InitializeGitRepo(projectPath)
	git_helpers.SetRepoOrigin(projectFiles.ProjectSettings.RepositoryToSyncTo)

	// Launching file server for images/videos
	go file_server.LaunchFileServer(projectPath)

	app := application.New(application.Options{
		Name:        "bytebook",
		Description: "A simple note taking app.",
		Services: []application.Service{
			application.NewService(
				&services.FolderService{ProjectPath: projectPath},
			),
			application.NewService(
				&services.NoteService{ProjectPath: projectPath},
			),
			application.NewService(
				&services.NodeService{ProjectPath: projectPath},
			),
			application.NewService(
				&services.SearchService{ProjectPath: projectPath},
			),
			application.NewService(
				&services.SettingsService{ProjectPath: projectPath},
			),
			application.NewService(
				&services.TagsService{ProjectPath: projectPath},
			),
			application.NewService(
				&services.CodeService{
					ProjectPath:           projectPath,
					ShellSocketDealer:     nil,
					IOPubSocketSubscriber: nil,
					ConnectionInfo:        projectFiles.ConnectionInfo,
					AllKernels:            projectFiles.AllKernels,
				},
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
		backgroundColor = application.NewRGB(39, 39, 43)
	}
	custom_events.CreateWindow(app, "/", backgroundColor)

	menus.InitializeApplicationMenu(app, backgroundColor)

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal("Failed to setup file watcher " + err.Error())
	}
	defer watcher.Close()
	go file_server.LaunchFileWatcher(app, projectPath, watcher)
	go auth_server.LaunchAuthServer()
	file_server.ListenToFolders(projectPath, watcher)

	// Run the application. This blocks until the application has been exited.
	err = app.Run()

	// If an error occurred while running the application, log it and exit.
	if err != nil {
		log.Fatal(err)
	}

}
