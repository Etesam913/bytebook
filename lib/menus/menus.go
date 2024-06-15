package menus

import (
	"github.com/wailsapp/wails/v3/pkg/application"
)

// InitializeApplicationMenu initializes the application menu with hotkeys
func InitializeApplicationMenu(app *application.App) {
	menu := application.DefaultApplicationMenu()
	fileMenuItem := menu.ItemAt(1)

	if fileMenuItem.IsSubmenu() {
		fileMenu := fileMenuItem.GetSubmenu()
		// Configure shift+cmd+n to open a new window
		newWindowMenuItem := fileMenu.Add("New Window")
		newWindowMenuItem.SetAccelerator("shift+cmdorctrl+n")
		newWindowMenuItem.OnClick(func(data *application.Context) {
			app.Events.Emit(&application.WailsEvent{
				Name: "open-note-in-new-window-backend",
				Data: map[string]interface{}{
					"url": "/",
				},
			})
		})
	}

	// Change the hotkey for the toggle fullscreen menu option
	menuItem := menu.FindByLabel("Toggle Full Screen")
	menuItem.RemoveAccelerator()
	menuItem.SetAccelerator("shift+cmd+f")

	// Add new window option
	menu.ItemAt(1)
	app.SetMenu(menu)
	menu.Update()
}
