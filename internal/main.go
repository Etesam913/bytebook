package main

import (
	"context"
	"log"
	"log/slog"
	"os"
	"sync"

	bytebook "github.com/etesam913/bytebook"
	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/events"
	"github.com/etesam913/bytebook/internal/jupyter_protocol"
	"github.com/etesam913/bytebook/internal/jupyter_protocol/sockets"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/services"
	"github.com/etesam913/bytebook/internal/ui"
	"github.com/etesam913/bytebook/internal/ui/menus"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v3/pkg/application"
	wailsEvents "github.com/wailsapp/wails/v3/pkg/events"
)

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

	searchIndex, err := search.OpenOrCreateIndex(projectPath)

	if err != nil {
		log.Fatal(err.Error())
	}
	defer searchIndex.Close()

	// Create separate contexts for Python and Go kernels
	pythonCtx, pythonCtxCancel := context.WithCancel(context.Background())
	goCtx, goCtxCancel := context.WithCancel(context.Background())
	javascriptCtx, javascriptCtxCancel := context.WithCancel(context.Background())
	javaCtx, javaCtxCancel := context.WithCancel(context.Background())
	defer pythonCtxCancel()
	defer goCtxCancel()
	defer javascriptCtxCancel()
	defer javaCtxCancel()

	logLevel := slog.LevelError
	handler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
	})

	app := application.New(application.Options{
		Name:        "bytebook",
		Description: "A simple note taking app.",
		Services: []application.Service{
			application.NewService(
				&services.FolderService{ProjectPath: projectPath},
			),
			application.NewService(
				&services.NoteService{
					ProjectPath: projectPath,
					SearchIndex: &searchIndex,
				},
			),
			application.NewService(
				&services.FileTreeService{
					ProjectPath: projectPath,
				},
			),
			application.NewService(
				&services.NodeService{ProjectPath: projectPath},
			),
			application.NewService(
				&services.SearchService{ProjectPath: projectPath, SearchIndex: &searchIndex},
			),
			application.NewService(
				&services.SettingsService{ProjectPath: projectPath},
			),
			application.NewService(
				&services.TagsService{ProjectPath: projectPath, SearchIndex: &searchIndex},
			),
			application.NewService(
				&services.CodeService{
					ProjectPath: projectPath,
					PythonSockets: sockets.LanguageSockets{
						ShellSocketDealer:     nil,
						ControlSocketDealer:   nil,
						IOPubSocketSubscriber: nil,
						HeartbeatSocketReq:    nil,
						StdinSocketDealer:     nil,
						HeartbeatState: jupyter_protocol.KernelHeartbeatState{
							Mutex:  sync.RWMutex{},
							Status: false,
						},
						Context: pythonCtx,
						Cancel:  pythonCtxCancel,
					},
					GoSockets: sockets.LanguageSockets{
						ShellSocketDealer:     nil,
						ControlSocketDealer:   nil,
						IOPubSocketSubscriber: nil,
						HeartbeatSocketReq:    nil,
						StdinSocketDealer:     nil,
						HeartbeatState: jupyter_protocol.KernelHeartbeatState{
							Mutex:  sync.RWMutex{},
							Status: false,
						},
						Context: goCtx,
						Cancel:  goCtxCancel,
					},
					JavascriptSockets: sockets.LanguageSockets{
						ShellSocketDealer:     nil,
						ControlSocketDealer:   nil,
						IOPubSocketSubscriber: nil,
						HeartbeatSocketReq:    nil,
						StdinSocketDealer:     nil,
						HeartbeatState: jupyter_protocol.KernelHeartbeatState{
							Mutex:  sync.RWMutex{},
							Status: false,
						},
						Context: javascriptCtx,
						Cancel:  javascriptCtxCancel,
					},
					JavaSockets: sockets.LanguageSockets{
						ShellSocketDealer:     nil,
						ControlSocketDealer:   nil,
						IOPubSocketSubscriber: nil,
						HeartbeatSocketReq:    nil,
						StdinSocketDealer:     nil,
						HeartbeatState: jupyter_protocol.KernelHeartbeatState{
							Mutex:  sync.RWMutex{},
							Status: false,
						},
						Context: javaCtx,
						Cancel:  javaCtxCancel,
					},
					LanguageToKernelConnectionInfo: projectFiles.ConnectionInfo,
					AllKernels:                     projectFiles.AllKernels,
				},
			),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(bytebook.Frontend),
			Middleware: application.ChainMiddleware(
				util.SPAFallbackMiddleware(),
				notes.LocalFileMiddleware(projectPath),
			),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
		Logger: slog.New(handler),
	})

	backgroundColor := application.NewRGB(27, 38, 54)

	if app.Env.IsDarkMode() {
		backgroundColor = application.NewRGB(39, 39, 43)
	}
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal("failed to setup file watcher " + err.Error())
	}
	defer watcher.Close()

	// Creates the default window
	window := ui.CreateWindow(app, "/", backgroundColor)
	// TODO: Fix bug with menus.InitializeApplicationMenu breaking the app
	// lsp.CreateLanguageServerProtocol()
	events.ListenToEvents(events.EventParams{
		App:         app,
		ProjectPath: projectPath,
		Index:       &searchIndex,
	})

	go menus.CreateApplicationMenus(backgroundColor, ui.CreateWindow)
	go menus.CreateContextMenus()

	// Start file watcher and search indexing once the window runtime is ready,
	// preventing "too many open files" errors from concurrent file descriptor usage
	// by bleve index, fsnotify watchers, and Metal/WebView during initialization
	var runtimeReadyOnce sync.Once
	window.OnWindowEvent(wailsEvents.Common.WindowRuntimeReady, func(e *application.WindowEvent) {
		runtimeReadyOnce.Do(func() {
			notes.AddProjectFoldersToWatcher(projectPath, watcher)
			go notes.LaunchFileWatcher(app, projectPath, watcher)
			go func() {
				if err := search.IndexAllFiles(projectPath, searchIndex); err != nil {
					log.Printf("Error indexing files: %v", err)
				}
			}()
		})
	})

	// Run the application. This blocks until the application has been exited.
	err = app.Run()

	// If an error occurred while running the application, log it and exit.
	if err != nil {
		log.Fatal(err)
	}
}
