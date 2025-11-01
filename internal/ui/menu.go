package ui

import (
	"log"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// InitializeApplicationMenu initializes the application menu with hotkeys
func InitializeApplicationMenu(backgroundColor application.RGBA) {
	app := config.GetApp()
	menu := application.DefaultApplicationMenu()

	configureSettingsMenu(app, menu)
	configureFileMenu(app, menu, backgroundColor)
	configureToggleFullscreen(menu)
	configureViewMenu(app, menu)
	app.Menu.SetApplicationMenu(menu)
	// menu.Update()
}

// configureSettingsMenu sets up the "Settings" submenu item and its accelerator and click handler.
func configureSettingsMenu(app *application.App, menu *application.Menu) {
	item := menu.ItemAt(0)
	if !item.IsSubmenu() {
		return
	}
	sub := item.GetSubmenu()

	settings := sub.Add("Settings")
	settings.SetAccelerator("cmdorctrl+,")
	settings.OnClick(func(ctx *application.Context) {
		win := app.Window.Current()
		if win != nil {
			win.EmitEvent(util.Events.SettingsOpen)
		} else {
			log.Println(
				"Current window could not be found: settings:open event could not be emitted",
			)
		}
	})
}

// configureFileMenu sets up the "New Window" submenu item and its accelerator and click handler.
func configureFileMenu(app *application.App, menu *application.Menu, bg application.RGBA) {
	item := menu.ItemAt(1)
	if !item.IsSubmenu() {
		return
	}
	sub := item.GetSubmenu()
	newWin := sub.Add("New Window")
	newWin.SetAccelerator("shift+cmdorctrl+n")
	newWin.OnClick(func(ctx *application.Context) {
		CreateWindow(app, "/", bg)
	})

	newFolder := sub.Add("New Folder")
	newFolder.SetAccelerator("cmdorctrl+g")
	newFolder.OnClick(func(ctx *application.Context) {
		win := app.Window.Current()
		if win != nil {
			win.EmitEvent(util.Events.FolderCreateMenu, map[string]any{})
		} else {
			log.Println(
				"Current window could not be found: folder:create-dialog event could not be emitted",
			)
		}
	})

	newNote := sub.Add("New Note")
	newNote.SetAccelerator("cmdorctrl+n")
	newNote.OnClick(func(ctx *application.Context) {
		win := app.Window.Current()
		if win != nil {
			win.EmitEvent(util.Events.NewNoteMenu, map[string]any{})
		} else {
			log.Println(
				"Current window could not be found: note:create-dialog event could not be emitted",
			)
		}
	})

}

// configureToggleFullscreen updates the accelerator for the "Toggle Full Screen" menu item.
func configureToggleFullscreen(menu *application.Menu) {
	item := menu.FindByLabel("Toggle Full Screen")
	if item == nil {
		return
	}
	item.RemoveAccelerator()
	item.SetAccelerator("shift+cmd+f")
}

// configureViewMenu sets up the "Command Palette" submenu item and its accelerator and click handler.
func configureViewMenu(app *application.App, menu *application.Menu) {
	item := menu.ItemAt(3)
	if !item.IsSubmenu() {
		return
	}
	sub := item.GetSubmenu()

	search := sub.Add("Command Palette")
	search.SetAccelerator("cmdorctrl+p")
	search.OnClick(func(ctx *application.Context) {
		win := app.Window.Current()
		if win != nil {
			win.EmitEvent(util.Events.SearchOpenPanel, map[string]any{})
		} else {
			log.Println(
				"Current window could not be found: search:open-panel event could not be emitted",
			)
		}
	})

	searchPage := sub.Add("Search Through Notes")
	searchPage.SetAccelerator("cmdorctrl+k")
	searchPage.OnClick(func(ctx *application.Context) {
		win := app.Window.Current()
		if win != nil {
			win.EmitEvent(util.Events.SearchOpen, map[string]any{})
		} else {
			log.Println(
				"Current window could not be found: search:open event could not be emitted",
			)
		}
	})

	searchNote := sub.Add("Search in Note")
	searchNote.SetAccelerator("cmdorctrl+f")
	searchNote.OnClick(func(ctx *application.Context) {
		win := app.Window.Current()
		if win != nil {
			win.EmitEvent(util.Events.SearchNote, map[string]any{})
		} else {
			log.Println(
				"Current window could not be found: search:note event could not be emitted",
			)
		}
	})

	// Remove the default zoom in and out as it uses magnification instead of document.style.zoom
	zoomIn := sub.FindByLabel("Zoom In")
	if zoomIn != nil {
		sub.RemoveMenuItem(zoomIn)

	}
	zoomOut := sub.FindByLabel("Zoom Out")
	if zoomOut != nil {
		sub.RemoveMenuItem(zoomOut)
	}

	// Adds the new zoom in and out which will use document.style.zoom
	zoomIn = sub.Add("Zoom In")
	zoomIn.SetAccelerator("cmdorctrl+plus")
	zoomIn.OnClick(func(ctx *application.Context) {
		app.Event.Emit(util.Events.ZoomIn)
	})

	zoomOut = sub.Add("Zoom Out")
	zoomOut.SetAccelerator("cmdorctrl+-")
	zoomOut.OnClick(func(ctx *application.Context) {
		app.Event.Emit(util.Events.ZoomOut)
	})
}
