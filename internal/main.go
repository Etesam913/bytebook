package main

import (
	"log"
	"log/slog"
	"os"
	"sync"

	bytebook "github.com/etesam913/bytebook"
	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/events"
	"github.com/etesam913/bytebook/internal/ingest"
	"github.com/etesam913/bytebook/internal/kernel_manager"
	"github.com/etesam913/bytebook/internal/lsp"
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

// main function serves as the application's entry point.
func main() {
	appLogger := newAppLogger()

	projectPath, err := config.GetProjectPath()
	if err != nil {
		log.Fatal(err.Error())
	}

	if err := config.CreateProjectDirectories(projectPath); err != nil {
		log.Fatal(err.Error())
	}

	projectFiles, err := config.CreateProjectFiles(projectPath)
	if err != nil {
		log.Fatal(err.Error())
	}

	// Wipe stale per-instance connection files from a previous run.
	if err := kernel_manager.SetupKernelsDir(projectPath); err != nil {
		log.Fatal(err.Error())
	}

	searchIndex, err := search.OpenOrCreateIndex(projectPath)
	if err != nil {
		log.Fatal(err.Error())
	}
	indexHolder := search.NewIndexHolder(searchIndex)
	defer indexHolder.Close()

	kernelManager := kernel_manager.New(projectPath, projectFiles.AllKernels)
	defer kernelManager.ShutdownAll()

	lspManager := lsp.New(appLogger.With("component", "lsp"))
	defer lspManager.ShutdownAll()

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal("failed to setup file watcher " + err.Error())
	}
	defer watcher.Close()

	watchRegistry := notes.NewDirectoryWatchRegistry()
	importCoordinator := ingest.NewBulkImportCoordinator(projectPath, indexHolder, watcher, watchRegistry)
	defer importCoordinator.Shutdown()

	app := application.New(application.Options{
		Name:        "bytebook",
		Description: "A simple note taking app.",
		Services: []application.Service{
			application.NewService(&services.FolderService{ProjectPath: projectPath}),
			application.NewService(&services.NoteService{ProjectPath: projectPath}),
			application.NewService(&services.FileTreeService{ProjectPath: projectPath}),
			application.NewService(&services.NodeService{ProjectPath: projectPath}),
			application.NewService(&services.SearchService{ProjectPath: projectPath, Index: indexHolder}),
			application.NewService(&services.SettingsService{ProjectPath: projectPath}),
			application.NewService(&services.TagsService{ProjectPath: projectPath, Index: indexHolder}),
			application.NewService(&services.CodeService{
				ProjectPath: projectPath,
				Manager:     kernelManager,
			}),
			application.NewService(&services.LSPService{
				ProjectPath: projectPath,
				Manager:     lspManager,
			}),
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
		Logger: appLogger,
	})

	backgroundColor := application.NewRGB(27, 38, 54)
	if app.Env.IsDarkMode() {
		backgroundColor = application.NewRGB(39, 39, 43)
	}

	window := ui.CreateWindow(app, "/?restore", backgroundColor)
	events.ListenToEvents(events.EventParams{
		App:               app,
		ProjectPath:       projectPath,
		Index:             indexHolder,
		ImportCoordinator: importCoordinator,
	})

	go menus.CreateApplicationMenus(backgroundColor, ui.CreateWindow)

	var runtimeReadyOnce sync.Once
	window.OnWindowEvent(wailsEvents.Common.WindowRuntimeReady, func(e *application.WindowEvent) {
		runtimeReadyOnce.Do(func() {
			notes.AddProjectFoldersToWatcher(projectPath, watcher)
			watchRegistry.SyncFromWatcher(watcher)
			go notes.LaunchFileWatcher(app, projectPath, watcher, watchRegistry)
			importCoordinator.EnqueueInitialScan()
		})
	})
	events.ListenToWindowEvents(app, window)

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}

func newAppLogger() *slog.Logger {
	handler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	logger := slog.New(handler)

	slog.SetDefault(logger)
	log.SetFlags(0)
	log.SetOutput(slog.NewLogLogger(handler, slog.LevelInfo).Writer())

	return logger
}
