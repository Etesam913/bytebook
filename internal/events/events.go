package events

import (
	"log"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/ingest"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type EventParams struct {
	App         *application.App
	ProjectPath string
	Index       *search.IndexHolder
	// Required: folder-create events are always handed to the import coordinator.
	ImportCoordinator *ingest.BulkImportCoordinator
}

func ListenToEvents(params EventParams) {
	// File Events
	on(params, util.EventFileCreate, addCreatedNotesToIndex)
	on(params, util.EventFileRename, handleFileRenameEvent)
	on(params, util.EventFileDelete, handleFileDeleteEvent)
	on(params, util.EventFileWrite, updateNotesInIndex)

	// Folder Events
	on(params, util.EventFolderRename, handleFolderRenameEvent)
	on(params, util.EventFolderDelete, handleFolderDeleteEvent)
	on(params, util.EventFolderCreate, handleFolderCreateEvent)

	// Tag Events
	on(params, util.EventTagsUpdate, handleTagsUpdateEvent)
}

// on registers handle for eventName and only invokes it when the payload has type T.
func on[T any](params EventParams, eventName string, handle func(EventParams, T)) {
	params.App.Event.On(eventName, func(event *application.CustomEvent) {
		log.Printf("%s: %+v", eventName, event.Data)
		data, ok := event.Data.(T)
		if !ok {
			var want T
			log.Printf("%s: event data is not %T", eventName, want)
			return
		}
		handle(params, data)
	})
}

// withBatch runs fn against the current index under the read lock and commits
// whatever fn left in the batch.
func (params EventParams) withBatch(fn func(idx bleve.Index, batch *bleve.Batch)) {
	idx := params.Index.RLock()
	defer params.Index.RUnlock()
	batch := idx.NewBatch()
	fn(idx, batch)
	if batch.Size() == 0 {
		return
	}
	if err := idx.Batch(batch); err != nil {
		log.Println("Error indexing batch", err)
	}
}
