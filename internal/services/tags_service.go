package services

import (
	"path/filepath"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/labstack/gommon/log"
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
		extension := filepath.Ext(folderAndNoteName)
		if extension == ".md" {
			err := notes.AddTagsToNote(t.ProjectPath, folderAndNoteName, tagsToAdd)
			if err != nil {
				return config.BackendResponseWithoutData{
					Success: false,
					Message: "Failed to fully update tags",
				}
			}

			// Get the final tags after both add and delete operations
			tags, err := notes.DeleteTagsFromNote(t.ProjectPath, folderAndNoteName, tagsToRemove)
			if err != nil {
				return config.BackendResponseWithoutData{
					Success: false,
					Message: "Failed to fully update tags",
				}
			}
			eventData[folderAndNoteName] = tags
		} else {
			_, err := notes.AddTagsToAttachment(t.ProjectPath, folderAndNoteName, tagsToAdd)
			if err != nil {
				return config.BackendResponseWithoutData{
					Success: false,
					Message: "Failed to fully update tags",
				}
			}

			tags, err := notes.DeleteTagsFromAttachment(t.ProjectPath, folderAndNoteName, tagsToRemove)
			if err != nil {
				return config.BackendResponseWithoutData{
					Success: false,
					Message: "Failed to fully update tags",
				}
			}
			eventData[folderAndNoteName] = tags
		}
	}

	app := application.Get()
	if app != nil {
		// Will handle bleve indexing and frontend updates
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
		extension := filepath.Ext(folderAndNoteName)
		if extension == ".md" {
			tags, _, err := notes.GetTagsFromNote(t.ProjectPath, folderAndNoteName)
			if err != nil {
				return config.BackendResponseWithData[map[string][]string]{
					Success: false,
					Message: "Failed to get tags for notes",
					Data:    nil,
				}
			}
			tagsMap[folderAndNoteName] = tags
		} else {
			tags, _, err := notes.GetTagsFromAttachment(t.ProjectPath, folderAndNoteName)
			if err != nil {
				return config.BackendResponseWithData[map[string][]string]{
					Success: false,
					Message: "Failed to get tags for notes",
					Data:    nil,
				}
			}
			tagsMap[folderAndNoteName] = tags
		}
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

// DeleteTags removes the specified tags from all notes that have them.
// It queries the search index for all notes with any of the specified tags,
// updates the search index to remove the tags, and removes the tags from
// the frontmatter of each affected note.
func (t *TagsService) DeleteTags(tagsToDelete []string) config.BackendResponseWithoutData {
	if len(tagsToDelete) == 0 {
		return config.BackendResponseWithoutData{
			Success: true,
			Message: "No tags to delete",
		}
	}

	// Create a disjunction query to find all notes with any of the tags
	disjunctionQuery := bleve.NewDisjunctionQuery()
	for _, tag := range tagsToDelete {
		termQuery := bleve.NewTermQuery(tag)
		termQuery.SetField(search.FieldTags)
		disjunctionQuery.AddQuery(termQuery)
	}

	// Search for all notes with any of the tags
	searchRequest := bleve.NewSearchRequest(disjunctionQuery)
	searchRequest.Size = TAGS_SEARCH_LIMIT
	searchRequest.Fields = []string{search.FieldFolder, search.FieldFileName}

	searchResult, err := t.SearchIndex.Search(searchRequest)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Failed to search for notes with tags",
		}
	}

	// Process each note found
	eventData := util.TagsUpdateEventData{}

	for _, hit := range searchResult.Hits {
		folder := ""
		fileName := ""

		if folderField, ok := hit.Fields[search.FieldFolder]; ok {
			if folderStr, ok := folderField.(string); ok {
				folder = folderStr
			}
		}

		if fileNameField, ok := hit.Fields[search.FieldFileName]; ok {
			if fileNameStr, ok := fileNameField.(string); ok {
				fileName = fileNameStr
			}
		}

		if fileName == "" {
			continue
		}

		// Construct the folder/note path
		folderAndNoteName := fileName
		if folder != "" {
			folderAndNoteName = filepath.Join(folder, fileName)
		}

		// Remove tags from the note's frontmatter
		if filepath.Ext(folderAndNoteName) == ".md" {
			updatedTags, err := notes.DeleteTagsFromNote(t.ProjectPath, folderAndNoteName, tagsToDelete)
			if err != nil {
				// Log the error but continue processing other notes
				log.Error(err)
				continue
			}
			eventData[folderAndNoteName] = updatedTags
		} else {
			updatedTags, err := notes.DeleteTagsFromAttachment(t.ProjectPath, folderAndNoteName, tagsToDelete)
			if err != nil {
				log.Error(err)
				continue
			}
			eventData[folderAndNoteName] = updatedTags
		}
	}

	// Emit event for frontend updates & bleve indexing
	app := application.Get()
	if app != nil && len(eventData) > 0 {
		app.Event.EmitEvent(&application.CustomEvent{
			Name: util.Events.TagsUpdate,
			Data: eventData,
		})
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully deleted tags from all notes",
	}
}
