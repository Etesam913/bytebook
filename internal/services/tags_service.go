package services

import (
	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type TagsService struct {
	ProjectPath string
	SearchIndex bleve.Index
}

var TAGS_SEARCH_LIMIT = 1000

func (t *TagsService) SetTagsOnNotes(
	folderAndNoteNames []string,
	tagsToAdd []string,
	tagsToRemove []string,
) config.BackendResponseWithoutData {

	eventData := util.TagsUpdateEventData{}

	for _, folderAndNoteName := range folderAndNoteNames {
		err := notes.AddTagsToNote(t.ProjectPath, folderAndNoteName, tagsToAdd)
		if err != nil {
			return config.BackendResponseWithoutData{
				Success: false,
				Message: "Failed to fully update tags",
			}
		}
		err = notes.DeleteTagsFromNote(t.ProjectPath, folderAndNoteName, tagsToRemove)
		if err != nil {
			return config.BackendResponseWithoutData{
				Success: false,
				Message: "Failed to fully update tags",
			}
		}

		tags, _, err := notes.GetTagsFromNote(t.ProjectPath, folderAndNoteName)
		if err != nil {
			return config.BackendResponseWithoutData{
				Success: false,
				Message: "Failed to get tags for notes",
			}
		}
		eventData[folderAndNoteName] = tags
	}

	app := application.Get()
	if app != nil {
		// Will handle bleve indexing
		app.Event.EmitEvent(&application.CustomEvent{
			Name: util.Events.TagsUpdate,
			Data: eventData,
		})
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully updated tags",
	}
}

func (t *TagsService) GetTagsForNotes(
	folderAndNoteNames []string,
) config.BackendResponseWithData[map[string][]string] {

	tagsMap := make(map[string][]string)

	for _, folderAndNoteName := range folderAndNoteNames {
		tags, _, err := notes.GetTagsFromNote(t.ProjectPath, folderAndNoteName)
		if err != nil {
			return config.BackendResponseWithData[map[string][]string]{
				Success: false,
				Message: "Failed to get tags for notes",
				Data:    nil,
			}
		}
		tagsMap[folderAndNoteName] = tags
	}

	return config.BackendResponseWithData[map[string][]string]{
		Success: true,
		Message: "Successfully got tags for notes",
		Data:    tagsMap,
	}
}

// Calls search.GetTags() to get all tags from the search index.
func (t *TagsService) GetTags() config.BackendResponseWithData[[]string] {
	tags, err := search.GetTags(t.SearchIndex)
	if err != nil {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: "Failed to get tags",
			Data:    nil,
		}
	}

	return config.BackendResponseWithData[[]string]{
		Success: true,
		Message: "Successfully got tags",
		Data:    tags,
	}
}
