package events

import (
	"log"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// Re-indexes all the notes that have updated tags.
// The tags are added to the index as a new document with the same id.
func handleTagsUpdateEvent(params EventParams, data util.TagsUpdateEventData) {
	var folderAndNoteNames []string
	for folderAndNoteName := range data {
		folderAndNoteNames = append(folderAndNoteNames, folderAndNoteName)
	}

	reIndexNotesWithUpdatedTags(params, folderAndNoteNames)
}

// reIndexNotesWithUpdatedTags re-indexes multiple notes with updated tags.
func reIndexNotesWithUpdatedTags(
	params EventParams,
	folderAndNoteNames []string,
) {
	params.withBatch(func(idx bleve.Index, batch *bleve.Batch) {
		for _, folderAndNoteName := range folderAndNoteNames {
			folder, fileName := util.SplitFolderAndFile(folderAndNoteName)
			if err := search.IndexFile(batch, params.ProjectPath, folder, fileName, nil); err != nil {
				log.Printf("Error adding %s to batch: %v", folderAndNoteName, err)
			}
		}
	})

	app := application.Get()
	if app != nil {
		app.Event.EmitEvent(&application.CustomEvent{
			Name: util.EventTagsIndexUpdate,
		})
	}
}
