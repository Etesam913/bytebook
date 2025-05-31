package services

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/util"
)

type TagsService struct {
	ProjectPath string
}

// DeleteTags removes the specified tags from the project.
// It deletes the folders associated with each tag name provided in the tagNames slice.
// If any tag fails to be deleted, it returns a response indicating the failure.
// Parameters:
//
//	tagNames: A slice of tag names to be deleted.
//
// Returns:
//
//	A BackendResponseWithoutData indicating the success or failure of the operation.
func (t *TagsService) DeleteTags(tagNames []string) config.BackendResponseWithoutData {
	failedTagsToDelete := []string{}
	for _, tagName := range tagNames {
		pathToTagFolder := filepath.Join(t.ProjectPath, "tags", tagName)
		err := os.RemoveAll(pathToTagFolder)
		if err != nil {
			failedTagsToDelete = append(failedTagsToDelete, tagName)
		}
	}

	err := notes.DeleteStaleTagsFromNotesToTagsMap(
		t.ProjectPath,
		util.SliceToSet(tagNames),
	)

	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Failed to delete the tags:",
		}
	}

	if len(failedTagsToDelete) > 0 {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to delete the following tags: %v", failedTagsToDelete),
		}
	}
	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully deleted the tags",
	}
}

/*
AddTagsToNotes adds multiple note paths to multiple tags.
For each tag in tagNames, it adds all folderAndNotePaths to its notes.json.
If a tag does not exist, it creates the tag and associates the note paths with it.
*/
func (t *TagsService) AddTagsToNotes(tagNames []string, folderAndNotePathsWithoutQueryParam []string) config.BackendResponseWithoutData {
	err := notes.AddTags(t.ProjectPath, tagNames, folderAndNotePathsWithoutQueryParam)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Failed to tag notes",
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully Added Paths To Tags",
	}
}

// DeleteTagsFromNotes removes specified note paths from the given tags.
// For each tag in tagNames, it removes all folderAndNotePathsWithoutQueryParams from its notes.json.
// If any operation fails, it returns a response indicating the failure.
func (t *TagsService) DeleteTagsFromNotes(tagNames []string, folderAndNotePathsWithoutQueryParams []string) config.BackendResponseWithoutData {
	err := notes.DeleteTags(t.ProjectPath, tagNames, folderAndNotePathsWithoutQueryParams)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Failed to untag notes",
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "All specified paths have been successfully deleted from tag",
	}
}

func (t *TagsService) GetTagsForNotes(folderAndNotePaths []string) config.BackendResponseWithData[map[string][]string] {
	// Initialize a map to store tags for each folder and note path
	noteToTagsMap, err := notes.GetTagsForNotes(t.ProjectPath, folderAndNotePaths)
	if err != nil {
		return config.BackendResponseWithData[map[string][]string]{
			Success: false,
			Message: "Failed to get tags for notes",
			Data:    nil,
		}
	}

	return config.BackendResponseWithData[map[string][]string]{
		Success: true,
		Message: "Successfully retrieved tags for all specified paths.",
		Data:    noteToTagsMap,
	}
}

/*
GetTags retrieves a list of all tag names in the project.
It scans the "tags" directory within the project path and returns the names of all subdirectories.
*/
func (t *TagsService) GetTags() config.BackendResponseWithData[[]string] {
	tags, err := notes.GetAllTags(t.ProjectPath)
	if err != nil {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: "Something went wrong when retrieving tags. Please try again later",
			Data:    nil,
		}
	}

	return config.BackendResponseWithData[[]string]{
		Success: true,
		Message: "Successfully retrieved tags.",
		Data:    tags,
	}
}

/*
GetNotesFromTag retrieves the note paths associated with a given tag name.
It reads the "notes.json" file within the tag's directory and returns the note paths with query params.
*/
func (t *TagsService) GetNotesFromTag(tagName string, sortOption string) config.BackendResponseWithData[[]string] {
	sortOptionPtr := &sortOption
	sortedNotes, err := notes.GetNotesFromTag(t.ProjectPath, tagName, sortOptionPtr)
	if err != nil {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: "Something went wrong when retrieving the tagged notes. Please try again later",
			Data:    []string{},
		}
	}

	return config.BackendResponseWithData[[]string]{
		Success: true,
		Message: "Successfully retrieved tag.",
		Data:    sortedNotes,
	}
}

// GetPreviewForTag retrieves a preview of a tag, which includes the count of notes associated with it.
// It calls GetTagPreview to get the list of notes and returns the count.
func (t *TagsService) GetPreviewForTag(tag string) config.BackendResponseWithData[notes.TagPreview] {
	notePreview, err := notes.GetTagPreview(t.ProjectPath, tag)

	if err != nil {
		return config.BackendResponseWithData[notes.TagPreview]{
			Success: false,
			Message: fmt.Sprintf("Failed to get preview for tag: %s", tag),
			Data:    notePreview,
		}
	}
	return config.BackendResponseWithData[notes.TagPreview]{
		Success: true,
		Message: fmt.Sprintf("Successfully got preview for tag: %s", tag),
		Data:    notePreview,
	}
}

func (t *TagsService) EditTagsForNotes(tagNamesToAdd []string, tagNamesToRemove []string, folderAndNotePathsWithExtension []string) config.BackendResponseWithoutData {
	err := notes.DeleteTags(t.ProjectPath, tagNamesToRemove, folderAndNotePathsWithExtension)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Failed to set tags for notes",
		}
	}

	err = notes.AddTags(t.ProjectPath, tagNamesToAdd, folderAndNotePathsWithExtension)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Failed to set tags for notes",
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully set tags for notes",
	}
}