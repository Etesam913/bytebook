package events

import (
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
	params.App.Event.On(util.Events.NoteCreate, func(event *application.CustomEvent) {
		handleNoteCreateEvent(params, event)
	})
}
