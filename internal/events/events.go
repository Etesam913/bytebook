package events

import (
	"log"

	"github.com/etesam913/bytebook/internal/ingest"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type EventParams struct {
	App               *application.App
	ProjectPath       string
	Index             *search.IndexHolder
	ImportCoordinator *ingest.BulkImportCoordinator
}

func ListenToEvents(params EventParams) {
	// File Events
	params.App.Event.On(util.EventFileCreate, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.EventFileCreate, event.Data)
		handleFileCreateEvent(params, event)
	})

	params.App.Event.On(util.EventFileRename, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.EventFileRename, event.Data)
		handleFileRenameEvent(params, event)
	})

	params.App.Event.On(util.EventFileDelete, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.EventFileDelete, event.Data)
		handleFileDeleteEvent(params, event)
	})

	params.App.Event.On(util.EventFileWrite, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.EventFileWrite, event.Data)
		handleFileWriteEvent(params, event)
	})

	// Folder Events
	params.App.Event.On(util.EventFolderRename, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.EventFolderRename, event.Data)
		handleFolderRenameEvent(params, event)
	})

	params.App.Event.On(util.EventFolderDelete, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.EventFolderDelete, event.Data)
		handleFolderDeleteEvent(params, event)
	})

	params.App.Event.On(util.EventFolderCreate, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.EventFolderCreate, event.Data)
		handleFolderCreateEvent(params, event)
	})

	// Tag Events
	params.App.Event.On(util.EventTagsUpdate, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.EventTagsUpdate, event.Data)
		handleTagsUpdateEvent(params, event)
	})
}
