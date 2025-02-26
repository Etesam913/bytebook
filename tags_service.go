package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	slices0 "slices"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/list_helpers"
	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/etesam913/bytebook/lib/tags_helper"
	"golang.org/x/exp/slices"
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
	var tagJson project_types.TagJson
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
	for _, singlePath := range folderAndNotePathsWithoutQueryParams {
		resp := t.DeletePathFromTag(tagName, singlePath)
		if !resp.Success {
			// If any deletion fails, return immediately with the error.
			return resp
		}
	}
	return project_types.BackendResponseWithoutData{
		Success: true,
		Message: "All specified paths have been successfully deleted from tag",
	}
}

/*
DeletePathFromTag removes a specific note path from a given tag.
If the tag no longer has any note paths associated with it, the tag folder is deleted.
*/
func (t *TagsService) DeletePathFromTag(tagName string, folderAndNotePathWithoutQueryParam string) project_types.BackendResponseWithoutData {
	pathToTagFolder := filepath.Join(t.ProjectPath, "tags", tagName)
	pathToTagFile := filepath.Join(pathToTagFolder, "notes.json")

	if doesExist, _ := io_helpers.FileOrFolderExists(pathToTagFile); !doesExist {
		return project_types.BackendResponseWithoutData{
			Success: true,
			Message: "Tag is already deleted",
		}
	}

	var tagJson project_types.TagJson
	if err := io_helpers.ReadJsonFromPath(pathToTagFile, &tagJson); err != nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: "Something went wrong when removing the tag. Please try again later",
		}
	}

	notesWithoutDeletedPath := []string{}
	didFindNotePath := false

	// Removes the first occurence of `notePath` from `tagJson.Notes`
	for _, addedNotePath := range tagJson.Notes {
		if addedNotePath == folderAndNotePathWithoutQueryParam && !didFindNotePath {
			didFindNotePath = true
			continue
		}
		notesWithoutDeletedPath = append(notesWithoutDeletedPath, addedNotePath)
	}

	// If there are no note paths where this tag is being used, remove the folder for the tag
	if len(notesWithoutDeletedPath) == 0 {
		if err := os.RemoveAll(pathToTagFolder); err != nil {
			return project_types.BackendResponseWithoutData{
				Success: false, // Change this to false to reflect the failure
				Message: "Failed to remove tag folder. Please try again later.",
			}
		} else {
			return project_types.BackendResponseWithoutData{
				Success: true,
				Message: "Successfully Deleted Path From Tag",
			}
		}
	}

	tagJson.Notes = notesWithoutDeletedPath

	if err := io_helpers.WriteJsonToPath(pathToTagFile, tagJson); err != nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: "Something went wrong when writing the tag to file. Please try again later",
		}
	}

	return project_types.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully Deleted Path From Tag",
	}
}

// doesFolderAndNoteExist checks if a given folder and note exists
// Parameters:
//
//	projectPath: The root path of the project.
//	folderAndNote: The folder and note path in the format "folder/note".
//	tagName: The tag name to check for in the note.
//
// Returns:
//
//	A boolean indicating whether the note exists
func doesFolderAndNoteExist(projectPath, folderAndNote string) bool {
	folderAndNoteArr := strings.Split(folderAndNote, "/")
	folder := folderAndNoteArr[0]
	note := folderAndNoteArr[1]

	pathToNote := filepath.Join(projectPath, "notes", folder, note)
	if exists, _ := io_helpers.FileOrFolderExists(pathToNote); !exists {
		return false
	}
	return true
}

/*
GetTags retrieves a list of all tag names in the project.
It scans the "tags" directory within the project path and returns the names of all subdirectories.
*/
func (t *TagsService) GetTags() project_types.BackendResponseWithData[[]string] {
	tagsPath := filepath.Join(t.ProjectPath, "tags")
	tagFolders, err := os.ReadDir(tagsPath)
	if err != nil {
		return project_types.BackendResponseWithData[[]string]{
			Success: false,
			Message: "Something went wrong when fetching tags. Please try again later",
			Data:    nil,
		}
	}

	var tags []string

	for _, tagFolder := range tagFolders {
		if !tagFolder.IsDir() {
			continue
		}

		pathToTagNotes := filepath.Join(tagsPath, tagFolder.Name(), "notes.json")
		var tagJson project_types.TagJson
		if err := io_helpers.ReadJsonFromPath(pathToTagNotes, &tagJson); err != nil {
			continue
		}
		validatedFolderAndNotes := []string{}

		/*
			Goes through each path in a notes.json and checks if the
			note at the given path exists
		*/
		for _, folderAndNoteString := range tagJson.Notes {
			if doesContainTag := doesFolderAndNoteExist(t.ProjectPath, folderAndNoteString); !doesContainTag {
				continue
			}

			validatedFolderAndNotes = append(validatedFolderAndNotes, folderAndNoteString)
		}

		// Only write to JSON if validatedFolderAndNotes is different from tagJson.Notes
		if !slices.Equal(tagJson.Notes, validatedFolderAndNotes) {
			tagJson.Notes = validatedFolderAndNotes
			io_helpers.WriteJsonToPath(pathToTagNotes, tagJson)
		}

		tags = append(tags, tagFolder.Name())
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
	pathToTagFile := filepath.Join(t.ProjectPath, "tags", tagName, "notes.json")

	if exists, _ := io_helpers.FileOrFolderExists(pathToTagFile); !exists {
		return project_types.NoteResponse{
			Success: false,
			Message: "Tag does not exist",
			Data:    []string{},
		}
	}

	var tagJson project_types.TagJson
	if err := io_helpers.ReadJsonFromPath(pathToTagFile, &tagJson); err != nil {
		return project_types.NoteResponse{
			Success: false,
			Message: "Something went wrong when fetching the tag. Please try again later",
			Data:    []string{},
		}
	}

	notes := []list_helpers.NoteWithFolder{}

	// Using the query param syntax that the app supports
	for _, folderAndNoteString := range tagJson.Notes {
		// Check if the note exists
		if doesContainTag := doesFolderAndNoteExist(t.ProjectPath, folderAndNoteString); !doesContainTag {
			continue
		}

		folderAndNoteArr := strings.Split(folderAndNoteString, "/")
		if len(folderAndNoteArr) < 2 {
			continue // Invalid format
		}
		folder := folderAndNoteArr[0]
		note := folderAndNoteArr[1]

		fullPath := filepath.Join(t.ProjectPath, "notes", folder, note)
		fileInfo, err := os.Stat(fullPath)
		if err != nil {
			// File does not exist or other error, skip
			continue
		}
		if fileInfo.IsDir() {
			// It's a directory, skip
			continue
		}

		// Extract extension
		ext := filepath.Ext(note)
		name := strings.TrimSuffix(note, ext)
		ext = strings.TrimPrefix(ext, ".")

		notes = append(notes, list_helpers.NoteWithFolder{
			Folder:  folder,
			Name:    name,
			ModTime: fileInfo.ModTime(),
			Size:    fileInfo.Size(),
			Ext:     ext,
		})
	}

	// Sort the notes
	list_helpers.SortNotesWithFolders(notes, sortOption)

	// Prepare the sorted notes
	sortedNotes := []string{}
	for _, note := range notes {
		sortedNotes = append(
			sortedNotes,
			fmt.Sprintf("%s/%s?ext=%s", note.Folder, note.Name, note.Ext))
	}

	return project_types.NoteResponse{
		Success: true,
		Message: "Successfully retrieved tag.",
		Data:    sortedNotes,
	}
}
