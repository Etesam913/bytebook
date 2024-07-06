package custom_events

import (
	"math/rand"

	"github.com/wailsapp/wails/v3/pkg/application"
)

/* Creates a new webview window. Used in the file menu */
func CreateWindow(app *application.App, url string, backgroundColor application.RGBA) application.Window {
	return app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
		Title:     "Note",
		MinWidth:  800,
		MinHeight: 600,
		X:         rand.Intn(1000),
		Y:         rand.Intn(800),
		URL:       url,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 35,
			TitleBar:                application.MacTitleBarHiddenInsetUnified,
		},
		EnableDragAndDrop: true,
		BackgroundColour:  backgroundColor,
	}).Show()
}

func OpenNoteInNewWindowEvent(app *application.App, backgroundColor application.RGBA) {
	app.Events.On("open-note-in-new-window-backend", func(e *application.WailsEvent) {
		switch data := e.Data.(type) {
		case map[string]interface{}:
			CreateWindow(app, data["url"].(string), backgroundColor)
		}
	})
}
