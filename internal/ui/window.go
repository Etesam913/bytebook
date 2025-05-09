package ui

import (
	"math/rand"

	"github.com/wailsapp/wails/v3/pkg/application"
)

/* Creates a new Bytebook window. */
func CreateWindow(app *application.App, url string, backgroundColor application.RGBA) application.Window {
	return app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
		Title:     "Bytebook",
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
