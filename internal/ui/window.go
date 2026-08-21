package ui

import (
	"log"
	"math/rand"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

/* Creates a new Bytebook window. */
func CreateWindow(app *application.App, url string, backgroundColor application.RGBA) application.Window {
	window := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:     "Bytebook",
		Width:     1400,
		Height:    900,
		MinWidth:  800,
		MinHeight: 600,
		X:         rand.Intn(1000),
		Y:         rand.Intn(800),
		URL:       url,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 35,
			TitleBar:                application.MacTitleBarHiddenInsetUnified,
			CornerType:              application.MacWindowCornerTypeRounded,
			WebviewPreferences: application.MacWebviewPreferences{
				FullscreenEnabled: application.Enabled,
			},
		},
		BackgroundColour:   backgroundColor,
		ZoomControlEnabled: false,
		EnableFileDrop:     true,
	})

	// Listen for fullscreen events
	window.OnWindowEvent(events.Common.WindowFullscreen, func(e *application.WindowEvent) {
		log.Println("Window entered fullscreen mode!")
		app.Event.EmitEvent(&application.CustomEvent{
			Name: util.EventFullscreen,
			Data: true,
		})
	})

	window.OnWindowEvent(events.Common.WindowUnFullscreen, func(e *application.WindowEvent) {
		log.Println("Window exited fullscreen mode!")
		app.Event.EmitEvent(&application.CustomEvent{
			Name: util.EventFullscreen,
			Data: false,
		})
	})

	return window.Show()
}
