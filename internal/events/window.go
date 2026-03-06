package events

import (
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
	wailsEvents "github.com/wailsapp/wails/v3/pkg/events"
)

// ListenToWindowEvents registers window-level event listeners that emit app events.
func ListenToWindowEvents(app *application.App, window application.Window) {
	window.OnWindowEvent(wailsEvents.Common.WindowFilesDropped, func(event *application.WindowEvent) {
		files := event.Context().DroppedFiles()
		if len(files) == 0 {
			return
		}

		details := event.Context().DropTargetDetails()
		dropPayload := util.FileTreeContentDropEventData{
			DroppedFiles: files,
		}

		if details != nil {
			dropPayload.TargetElementID = details.ElementID
		}

		app.Event.EmitEvent(&application.CustomEvent{
			Name: util.Events.FileTreeContentDrop,
			Data: dropPayload,
		})
	})
}
