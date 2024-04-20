package custom_events

import (
	"fmt"
	"math/rand"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func OpenNoteInNewWindowEvent(app *application.App, backgroundColor application.RGBA) {
	app.Events.On("open-note-in-new-window-backend", func(e *application.WailsEvent) {
		switch data := e.Data.(type) {
		case map[string]interface{}:
			note := data["note"].(string)
			folder := data["folder"].(string)
			fmt.Println(folder, note)
			app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
				Title:     "Note",
				MinWidth:  800,
				MinHeight: 600,
				X:         rand.Intn(1000),
				Y:         rand.Intn(800),
				URL:       fmt.Sprintf("/%s/%s?standalone=true", folder, note),
				Mac: application.MacWindow{
					InvisibleTitleBarHeight: 35,
					Backdrop:                application.MacBackdropNormal,
					TitleBar:                application.MacTitleBarHiddenInsetUnified,
				},
				EnableDragAndDrop: true,
				BackgroundColour:  backgroundColor,
			}).Show()
		}
	})
}
