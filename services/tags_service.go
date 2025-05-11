package services

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/etesam913/bytebook/lib/note_helpers"
	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/etesam913/bytebook/lib/tags_helper"
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
func (t *TagsService) DeleteTags(tagNames []string) project_types.BackendResponseWithoutData {
	failedTagsToDelete := []string{}
	for _, tagName := range tagNames {
		pathToTagFolder := filepath.Join(t.ProjectPath, "tags", tagName)
		err := os.RemoveAll(pathToTagFolder)
		if err != nil {
			failedTagsToDelete = append(failedTagsToDelete, tagName)
		}
	}

	err := tags_helper.DeleteStaleTagsFromNotesToTagsMap(
		t.ProjectPath,
		util.SliceToSet(tagNames),
	)

	if err != nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: "Failed to delete the tags:",
		}
	}

	if len(failedTagsToDelete) > 0 {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to delete the following tags: %v", failedTagsToDelete),
		}
	}
	return project_types.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully deleted the tags",
	}
}

/*
AddTagsToNotes adds multiple note paths to multiple tags.
For each tag in tagNames, it adds all folderAndNotePaths to its notes.json.
If a tag does not exist, it creates the tag and associates the note paths with it.
*/
func (t *TagsService) AddTagsToNotes(tagNames []string, folderAndNotePathsWithoutQueryParam []string) project_types.BackendResponseWithoutData {
	didError := false
	// Adds the notes to the notes.json file for each tag
	for _, tagName := range tagNames {
		err := tags_helper.AddNotesToTagToNotesArray(t.ProjectPath, tagName, folderAndNotePathsWithoutQueryParam)
		if err != nil {
			didError = true
		}
	}

	// Updates the map in the notes_to_tags.json file
	err := tags_helper.AddTagsToNotesToTagsMap(t.ProjectPath, folderAndNotePathsWithoutQueryParam, tagNames)
	if err != nil {
		didError = true
	}

	if didError {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to tag notes"),
		}
	}

	return project_types.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully Added Paths To Tags",
	}
}

// DeleteTagsFromNotes removes specified note paths from the given tags.
// For each tag in tagNames, it removes all folderAndNotePathsWithoutQueryParams from its notes.json.
// If any operation fails, it returns a response indicating the failure.
func (t *TagsService) DeleteTagsFromNotes(tagNames []string, folderAndNotePathsWithoutQueryParams []string) project_types.BackendResponseWithoutData {
	didError := false
	for _, tagName := range tagNames {
		// Removes the notes from the notes.json file for each tag
		err := tags_helper.DeleteNotesFromTagToNotesArray(
			t.ProjectPath,
			tagName,
			folderAndNotePathsWithoutQueryParams,
		)

		if err != nil {
			didError = true
		}
	}

	err := tags_helper.DeleteTagsFromNotesToTagsMap(
		t.ProjectPath,
		folderAndNotePathsWithoutQueryParams,
		tagNames,
	)

	if err != nil {
		didError = true
	}

	if didError {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to untag notes"),
		}
	}

	return project_types.BackendResponseWithoutData{
		Success: true,
		Message: "All specified paths have been successfully deleted from tag",
	}
}

func (t *TagsService) GetTagsForNotes(folderAndNotePathsWithQueryParams []string) project_types.BackendResponseWithData[map[string][]string] {
	// Initialize a map to store tags for each folder and note path
	noteToTagsMap, err := tags_helper.GetTagsForNotes(t.ProjectPath, folderAndNotePathsWithQueryParams)
	if err != nil {
		return project_types.BackendResponseWithData[map[string][]string]{
			Success: false,
			Message: "Failed to get tags for notes",
			Data:    nil,
		}
	}

	return project_types.BackendResponseWithData[map[string][]string]{
		Success: true,
		Message: "Successfully retrieved tags for all specified paths.",
		Data:    noteToTagsMap,
	}
}

/*
GetTags retrieves a list of all tag names in the project.
It scans the "tags" directory within the project path and returns the names of all subdirectories.
*/
func (t *TagsService) GetTags() project_types.BackendResponseWithData[[]string] {
	tags, err := tags_helper.GetAllTags(t.ProjectPath)
	if err != nil {
		return project_types.BackendResponseWithData[[]string]{
			Success: false,
			Message: "Something went wrong when retrieving tags. Please try again later",
			Data:    nil,
		}
	}

	return project_types.BackendResponseWithData[[]string]{
		Success: true,
		Message: "Successfully retrieved tags.",
		Data:    tags,
	}
}

/*
GetNotesFromTag retrieves the note paths associated with a given tag name.
It reads the "notes.json" file within the tag's directory and returns the note paths with query params.
*/
func (t *TagsService) GetNotesFromTag(tagName string, sortOption string) project_types.BackendResponseWithData[[]string] {
	// Make sure the notes.json file exists
	err := tags_helper.CreateTagToNotesArrayIfNotExists(t.ProjectPath, tagName)
	if err != nil {
		return project_types.BackendResponseWithData[[]string]{
			Success: false,
			Message: "Something went wrong when retrieving the tagged notes. Please try again later",
			Data:    []string{},
		}
	}

	pathToTagFile := filepath.Join(t.ProjectPath, "tags", tagName, "notes.json")
	notesForGivenTagData := tags_helper.TagsToNotesArray{}

	// Gets the JSON notes data
	if err := util.ReadJsonFromPath(pathToTagFile, &notesForGivenTagData); err != nil {
		return project_types.BackendResponseWithData[[]string]{
			Success: false,
			Message: "Something went wrong when fetching the tag. Please try again later",
			Data:    []string{},
		}
	}

	notesFileInfo := []util.NoteWithFolder{}
	pathsToDelete := []string{}
	for _, notePath := range notesForGivenTagData.Notes {
		fullNotePath := filepath.Join(t.ProjectPath, "notes", notePath)
		fileInfo, err := os.Stat(fullNotePath)
		if err != nil || fileInfo.IsDir() {
			pathsToDelete = append(pathsToDelete, notePath)
			continue
		}
		frontendFileInfo, err := note_helpers.ConvertFileNameForFrontendUrl(notePath)
		if err != nil {
			continue
		}

		notesFileInfo = append(
			notesFileInfo,
			util.NoteWithFolder{
				Folder:  frontendFileInfo.Directory,
				Name:    frontendFileInfo.FileName,
				ModTime: fileInfo.ModTime(),
				Size:    fileInfo.Size(),
				Ext:     frontendFileInfo.Extension,
			},
		)
	}
	// Clean up stale tags in the notes.json file
	tags_helper.DeleteNotesFromTagToNotesArray(t.ProjectPath, tagName, pathsToDelete)

	// Sort the folders appropriately
	util.SortNotesWithFolders(notesFileInfo, sortOption)
	sortedNotes := util.Map(notesFileInfo, func(noteInfo util.NoteWithFolder) string {
		return noteInfo.Folder + noteInfo.Name + "?ext=" + noteInfo.Ext
	})

	return project_types.BackendResponseWithData[[]string]{
		Success: true,
		Message: "Successfully retrieved tag.",
		Data:    sortedNotes,
	}
}
