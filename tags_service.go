package main

import (
	"fmt"
	"os"
	"path/filepath"

	slices0 "slices"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/list_helpers"
	"github.com/etesam913/bytebook/lib/note_helpers"
	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/etesam913/bytebook/lib/tags_helper"
)

type TagsService struct {
	ProjectPath string
}

/*
AddPathToTag adds a specific note path to a given tag.
If the tag does not exist, it creates the tag and associates the note path with it.
*/
func addPathToTag(projectPath, tagName, folderAndNotePathWithoutQueryParam string) project_types.BackendResponseWithoutData {
	pathToTagFolder := filepath.Join(projectPath, "tags", tagName)
	pathToTagFile := filepath.Join(pathToTagFolder, "notes.json")
	tags_helper.CreateTagToNotesArrayIfNotExists(projectPath, tagName)

	tagJson := project_types.TagJson{}
	if err := io_helpers.ReadJsonFromPath(pathToTagFile, &tagJson); err != nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: "Something went wrong when adding the tag. Please try again later",
		}
	}

	// Check if notePath already exists in tagJson.Notes
	if slices0.Contains(tagJson.Notes, folderAndNotePathWithoutQueryParam) {
		return project_types.BackendResponseWithoutData{Success: true, Message: "Successfully Added Path To Tag"}
	}

	tagJson.Notes = append(tagJson.Notes, folderAndNotePathWithoutQueryParam)
	if err := io_helpers.WriteJsonToPath(pathToTagFile, tagJson); err != nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: "Something went wrong when writing the tag to file. Please try again later",
		}
	}

	return project_types.BackendResponseWithoutData{Success: true, Message: "Successfully Added Path To Tag"}
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
AddPathsToTags adds multiple note paths to multiple tags.
For each tag in tagNames, it adds all folderAndNotePaths to its notes.json.
If a tag does not exist, it creates the tag and associates the note paths with it.
*/
func (t *TagsService) AddPathsToTags(tagNames []string, folderAndNotePathsWithoutQueryParam []string) project_types.BackendResponseWithoutData {
	for _, tagName := range tagNames {
		for _, folderAndNotePath := range folderAndNotePathsWithoutQueryParam {
			response := addPathToTag(t.ProjectPath, tagName, folderAndNotePath)
			if !response.Success {
				return project_types.BackendResponseWithoutData{
					Success: false,
					Message: fmt.Sprintf("Failed to add path %s to tag %s: %s", folderAndNotePath, tagName, response.Message),
				}
			}
		}
	}
	return project_types.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully Added Paths To Tags",
	}
}
func (t *TagsService) GetTagsForFolderAndNotesPaths(folderAndNotePathsWithQueryParams []string) project_types.BackendResponseWithData[map[string][]string] {
	// Initialize a map to store tags for each folder and note path
	tagsForNotes := make(map[string][]string)

	// Iterate through each folder and note path
	for _, folderAndNotePathWithQueryParam := range folderAndNotePathsWithQueryParams {
		// Use the existing GetTagsForFolderAndNotePath function to get tags for the current path
		singlePathTagsResponse := t.GetTagsForFolderAndNotePath(folderAndNotePathWithQueryParam)

		// Check if the response was successful
		if !singlePathTagsResponse.Success {
			return project_types.BackendResponseWithData[map[string][]string]{
				Success: false,
				Message: singlePathTagsResponse.Message,
				Data:    nil,
			}
		}

		// Store the tags for the current path in the map
		tagsForNotes[folderAndNotePathWithQueryParam] = singlePathTagsResponse.Data
	}

	return project_types.BackendResponseWithData[map[string][]string]{
		Success: true,
		Message: "Successfully retrieved tags for all specified paths.",
		Data:    tagsForNotes,
	}
}

func (t *TagsService) GetTagsForFolderAndNotePath(folderAndNotePathWithQueryParam string) project_types.BackendResponseWithData[[]string] {
	getTagsResponse := t.GetTags()
	if !getTagsResponse.Success {
		return getTagsResponse
	}
	tagsForNote := []string{}
	allTags := getTagsResponse.Data
	for _, tag := range allTags {
		notesEntriesResponse := t.GetNotesFromTag(tag, "file-name-a-z")
		notesResponse := []string{}
		notesResponse = append(notesResponse, notesEntriesResponse.Data...)
		notesWithQueryParamExtension := notesResponse
		for _, folderAndNoteStringWithQueryParamFromFile := range notesWithQueryParamExtension {
			if folderAndNotePathWithQueryParam == folderAndNoteStringWithQueryParamFromFile {
				tagsForNote = append(tagsForNote, tag)
			}
		}
	}

	return project_types.BackendResponseWithData[[]string]{
		Success: true,
		Message: "Successfully retrieved tags.",
		Data:    tagsForNote,
	}
}

// DeletePathsFromTag uses the old DeletePathFromTag function to delete
// multiple note paths from the specified tag in a single call.
func (t *TagsService) DeletePathsFromTag(tagName string, folderAndNotePathsWithoutQueryParams []string) project_types.BackendResponseWithoutData {
	deleteNotePathsResponse := tags_helper.DeleteNotesFromTagToNotesArray(
		t.ProjectPath,
		tagName,
		folderAndNotePathsWithoutQueryParams,
	)

	if deleteNotePathsResponse.Err != nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to delete paths notes from %s", tagName),
		}
	}

	return project_types.BackendResponseWithoutData{
		Success: true,
		Message: "All specified paths have been successfully deleted from tag",
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
func (t *TagsService) GetNotesFromTag(tagName string, sortOption string) project_types.NoteResponse {
	// Make sure the notes.json file exists
	err := tags_helper.CreateTagToNotesArrayIfNotExists(t.ProjectPath, tagName)
	if err != nil {
		return project_types.NoteResponse{
			Success: false,
			Message: "Something went wrong when retrieving the tagged notes. Please try again later",
			Data:    []string{},
		}
	}

	pathToTagFile := filepath.Join(t.ProjectPath, "tags", tagName, "notes.json")
	notesForGivenTagData := tags_helper.TagsToNotesArray{}

	// Gets the JSON notes data
	if err := io_helpers.ReadJsonFromPath(pathToTagFile, &notesForGivenTagData); err != nil {
		return project_types.NoteResponse{
			Success: false,
			Message: "Something went wrong when fetching the tag. Please try again later",
			Data:    []string{},
		}
	}

	notesFileInfo := []list_helpers.NoteWithFolder{}
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
			list_helpers.NoteWithFolder{
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
	list_helpers.SortNotesWithFolders(notesFileInfo, sortOption)
	sortedNotes := list_helpers.Map(notesFileInfo, func(noteInfo list_helpers.NoteWithFolder) string {
		return noteInfo.Folder + noteInfo.Name + "?ext=" + noteInfo.Ext
	})

	return project_types.NoteResponse{
		Success: true,
		Message: "Successfully retrieved tag.",
		Data:    sortedNotes,
	}
}
