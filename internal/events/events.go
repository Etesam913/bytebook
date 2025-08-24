package events

import (
	"log"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type EventParams struct {
	App         *application.App
	ProjectPath string
	Index       bleve.Index
}

func ListenToEvents(params EventParams) {
	// Note Events
	params.App.Event.On(util.Events.NoteCreate, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.Events.NoteCreate, event.Data)
		handleNoteCreateEvent(params, event)
	})

	params.App.Event.On(util.Events.NoteRename, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.Events.NoteRename, event.Data)
		handleNoteRenameEvent(params, event)
	})

	params.App.Event.On(util.Events.NoteDelete, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.Events.NoteDelete, event.Data)
		handleNoteDeleteEvent(params, event)
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

	// Tag Events
	params.App.Event.On(util.Events.TagsUpdate, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", util.Events.TagsUpdate, event.Data)
		handleTagsUpdateEvent(params, event)
	})
}
