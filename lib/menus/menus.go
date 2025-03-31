package menus

import (
	"github.com/etesam913/bytebook/lib/custom_events"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// InitializeApplicationMenu initializes the application menu with hotkeys
func InitializeApplicationMenu(app *application.App, backgroundColor application.RGBA) {
	menu := application.DefaultApplicationMenu()
	appMenuItem := menu.ItemAt(0)

	if appMenuItem.IsSubmenu() {
		appMenu := appMenuItem.GetSubmenu()
		settingsMenuItem := appMenu.Add("Settings")
		settingsMenuItem.SetAccelerator("cmdorctrl+,")
		settingsMenuItem.OnClick(func(data *application.Context) {
			currentWindow := app.CurrentWindow()
			if currentWindow != nil {
				app.CurrentWindow().EmitEvent("settings:open")
			}
		})
	}

	fileMenuItem := menu.ItemAt(1)

	if fileMenuItem.IsSubmenu() {
		fileMenu := fileMenuItem.GetSubmenu()
		// Configure shift+cmd+n to open a new window
		newWindowMenuItem := fileMenu.Add("New Window")
		newWindowMenuItem.SetAccelerator("shift+cmdorctrl+n")
		newWindowMenuItem.OnClick(func(data *application.Context) {
			custom_events.CreateWindow(app, "/", backgroundColor)
		})
	}

	// Change the hotkey for the toggle fullscreen menu option
	menuItem := menu.FindByLabel("Toggle Full Screen")
	menuItem.RemoveAccelerator()
	menuItem.SetAccelerator("shift+cmd+f")

	viewMenuItem := menu.ItemAt(3)
	if viewMenuItem.IsSubmenu() {
		viewSubmenu := viewMenuItem.GetSubmenu()
		viewSubmenuItem := viewSubmenu.Add("Search")
		viewSubmenuItem.SetAccelerator("cmdorctrl+p")
		viewSubmenuItem.OnClick(func(data *application.Context) {
			currentWindow := app.CurrentWindow()
			if currentWindow != nil {
				currentWindow.EmitEvent("search:open-panel", map[string]any{})
			}
		})
	}

	// Add new window option
	app.SetMenu(menu)
	menu.Update()
}
