package main

import (
	"context"
	"embed"
	"log"
	"sync"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/git"
	"github.com/etesam913/bytebook/internal/jupyter_protocol"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/services"
	"github.com/etesam913/bytebook/internal/ui"
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
	projectPath, err := config.GetProjectPath()
	if err != nil {
		log.Fatal(err.Error())
	}

	err = config.CreateProjectDirectories(projectPath)
	if err != nil {
		log.Fatal(err.Error())
	}

	projectFiles, err := config.CreateProjectFiles(projectPath)
	if err != nil {
		log.Fatal(err.Error())
	}

	// Creating git repo if it does not already exist
	err = git.InitializeGitRepo(projectPath)
	if err != nil {
		log.Fatal(err.Error())
	}

	err = git.SetRepoOrigin(projectFiles.ProjectSettings.RepositoryToSyncTo)
	if err != nil {
		log.Fatal(err.Error())
	}

	kernelCtx, kernelCtxCancel := context.WithCancel(context.Background())
	defer kernelCtxCancel()

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
					Context:               kernelCtx,
					Cancel:                kernelCtxCancel,
					ShellSocketDealer:     nil,
					ControlSocketDealer:   nil,
					IOPubSocketSubscriber: nil,
					HeartbeatSocketReq:    nil,
					HeartbeatState: jupyter_protocol.KernelHeartbeatState{
						Mutex:  sync.RWMutex{},
						Status: false,
					},
					LanguageToKernelConnectionInfo: projectFiles.ConnectionInfo,
					AllKernels:                     projectFiles.AllKernels,
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
	// Creates the default window
	ui.CreateWindow(app, "/", backgroundColor)
	ui.InitializeApplicationMenu(backgroundColor)

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal("failed to setup file watcher " + err.Error())
	}
	defer watcher.Close()
	go notes.LaunchFileWatcher(app, projectPath, watcher)
	notes.AddProjectFoldersToWatcher(projectPath, watcher)

	go git.LaunchAuthServer()
	// Run the application. This blocks until the application has been exited.
	err = app.Run()

	// If an error occurred while running the application, log it and exit.
	if err != nil {
		log.Fatal(err)
	}

}
