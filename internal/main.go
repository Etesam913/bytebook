package main

import (
	"log"
	"sync"

	bytebook "github.com/etesam913/bytebook"
	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/events"
	"github.com/etesam913/bytebook/internal/ingest"
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
	projectPath, err := config.InitProject()
	if err != nil {
		log.Fatal(err.Error())
	}

	searchIndex, err := search.OpenOrCreateIndex(projectPath)
	if err != nil {
		log.Fatal(err.Error())
	}
	indexHolder := search.NewIndexHolder(searchIndex)
	defer indexHolder.Close()

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
	})

	backgroundColor := ui.WindowBackgroundColor(app)

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

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
