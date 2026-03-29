package menus

import (
	"log"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// WindowCreator is a function type for creating windows
type WindowCreator func(app *application.App, url string, backgroundColor application.RGBA) application.Window

// CreateApplicationMenus initializes the application menu with hotkeys
func CreateApplicationMenus(backgroundColor application.RGBA, createWindow WindowCreator) {
	app := config.GetApp()
	if app == nil {
		log.Fatalf("GetApp() Error: could not get application")
		return
	}
	menu := application.DefaultApplicationMenu()

	configureSettingsMenu(app, menu)
	configureFileMenu(app, menu, backgroundColor, createWindow)
	configureToggleFullscreen(menu)
	configureViewMenu(app, menu)
	app.Menu.SetApplicationMenu(menu)
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
func configureFileMenu(app *application.App, menu *application.Menu, bg application.RGBA, createWindow WindowCreator) {
	item := menu.ItemAt(1)
	if !item.IsSubmenu() {
		return
	}
	sub := item.GetSubmenu()
	newWin := sub.Add("New Window")
	newWin.SetAccelerator("shift+cmdorctrl+n")
	newWin.OnClick(func(ctx *application.Context) {
		createWindow(app, "/", bg)
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

// configureViewMenu sets up the "Search Through Notes" submenu item and its accelerator and click handler.
func configureViewMenu(app *application.App, menu *application.Menu) {
	item := menu.ItemAt(3)
	if !item.IsSubmenu() {
		return
	}
	sub := item.GetSubmenu()

	toggleSidebar := sub.Add("Toggle Sidebar")
	toggleSidebar.SetAccelerator("cmdorctrl+s")
	toggleSidebar.OnClick(func(ctx *application.Context) {
		win := app.Window.Current()
		if win != nil {
			win.EmitEvent(util.Events.ToggleSidebar, map[string]any{})
		} else {
			log.Println(
				"Current window could not be found: sidebar:toggle event could not be emitted",
			)
		}
	})

	searchPage := sub.Add("Search Through Notes")
	searchPage.SetAccelerator("cmdorctrl+p")
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

	// Replace the default zoom items so zoom is handled by the frontend UI scale instead of native magnification.
	zoomIn := sub.FindByLabel("Zoom In")
	if zoomIn != nil {
		sub.RemoveMenuItem(zoomIn)
	}
	zoomOut := sub.FindByLabel("Zoom Out")
	if zoomOut != nil {
		sub.RemoveMenuItem(zoomOut)
	}
	actualSize := sub.FindByLabel("Actual Size")
	if actualSize != nil {
		sub.RemoveMenuItem(actualSize)
	}

	actualSize = sub.Add("Actual Size")
	actualSize.SetAccelerator("cmdorctrl+0")
	actualSize.OnClick(func(ctx *application.Context) {
		app.Event.Emit(util.Events.ZoomReset)
	})

	// Adds custom zoom items that drive the frontend UI scale.
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
