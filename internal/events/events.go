package events

import (
	"log"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/ingest"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type EventParams struct {
	App               *application.App
	ProjectPath       string
	Index             *bleve.Index
	ImportCoordinator *ingest.BulkImportCoordinator
}

func ListenToEvents(params EventParams) {
	// File Events
	params.App.Event.On(util.Events.FileCreate, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.Events.FileCreate, event.Data)
		handleFileCreateEvent(params, event)
	})

	params.App.Event.On(util.Events.FileRename, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.Events.FileRename, event.Data)
		handleFileRenameEvent(params, event)
	})

	params.App.Event.On(util.Events.FileDelete, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.Events.FileDelete, event.Data)
		handleFileDeleteEvent(params, event)
	})

	params.App.Event.On(util.Events.FileWrite, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.Events.FileWrite, event.Data)
		handleFileWriteEvent(params, event)
	})

	// Folder Events
	params.App.Event.On(util.Events.FolderRename, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.Events.FolderRename, event.Data)
		handleFolderRenameEvent(params, event)
	})

	params.App.Event.On(util.Events.FolderDelete, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.Events.FolderDelete, event.Data)
		handleFolderDeleteEvent(params, event)
	})

	params.App.Event.On(util.Events.FolderCreate, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.Events.FolderCreate, event.Data)
		handleFolderCreateEvent(params, event)
	})

	// Tag Events
	params.App.Event.On(util.Events.TagsUpdate, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.Events.TagsUpdate, event.Data)
		handleTagsUpdateEvent(params, event)
	})
}
