package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/project_types"
)

type TagsService struct {
	ProjectPath string
}

type TagResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
}

type TagJson struct{
	Notes []string `json:"notes"`
}

// createTagFiles creates the necessary files and folders for a given tag.
// Parameters:
//
//	projectPath: The root path of the project.
//	tagName: The name of the tag to create.
//	notePaths: A list of note paths to associate with the tag.
//
// Returns:
//
//	An error if the operation fails, otherwise nil.
func createTagFiles(projectPath string, tagName string, folderAndNotePaths []string) error {
	pathToTag := filepath.Join(projectPath, "tags", tagName)
	err := io_helpers.CreateFolderIfNotExist(pathToTag)
	if err != nil {
		return err
	}

	pathToTagJson := filepath.Join(pathToTag, "notes.json")
	err = io_helpers.WriteJsonToPath(pathToTagJson, TagJson{
		Notes: folderAndNotePaths,
	})
	if err != nil {
		return err
	}

	return nil
}

/*
AddPathToTag adds a specific note path to a given tag.
If the tag does not exist, it creates the tag and associates the note path with it.
*/
func addPathToTag(projectPath, tagName, folderAndNotePathWithoutQueryParam string) TagResponse {
	pathToTagFolder := filepath.Join(projectPath, "tags", tagName)
	pathToTagFile := filepath.Join(pathToTagFolder, "notes.json")

	if exists, _ := io_helpers.FileOrFolderExists(pathToTagFile); !exists {
		if err := createTagFiles(projectPath, tagName, []string{folderAndNotePathWithoutQueryParam}); err != nil {
			return TagResponse{
				Success: false,
				Message: "Something went wrong when adding the tag. Please try again later",
			}
		}
	} else {
		var tagJson TagJson
		if err := io_helpers.ReadJsonFromPath(pathToTagFile, &tagJson); err != nil {
			return TagResponse{
				Success: false,
				Message: "Something went wrong when adding the tag. Please try again later",
			}
		}

		// Check if notePath already exists in tagJson.Notes
		for _, existingNotePath := range tagJson.Notes {
			if existingNotePath == folderAndNotePathWithoutQueryParam {
				return TagResponse{Success: true, Message: "Successfully Added Path To Tag"}
			}
		}

		tagJson.Notes = append(tagJson.Notes, folderAndNotePathWithoutQueryParam)
		if err := io_helpers.WriteJsonToPath(pathToTagFile, tagJson); err != nil {
			return TagResponse{
				Success: false,
				Message: "Something went wrong when writing the tag to file. Please try again later",
			}
		}
	}

	return TagResponse{Success: true, Message: "Successfully Added Path To Tag"}
}


/*
AddPathsToTags adds multiple note paths to multiple tags.
For each tag in tagNames, it adds all folderAndNotePaths to its notes.json.
If a tag does not exist, it creates the tag and associates the note paths with it.
*/
func (t *TagsService) AddPathsToTags(tagNames []string, folderAndNotePathsWithoutQueryParam []string) TagResponse {
	for _, tagName := range tagNames {
			for _, folderAndNotePath := range folderAndNotePathsWithoutQueryParam {
				response := addPathToTag(t.ProjectPath, tagName, folderAndNotePath)
				if !response.Success {
					return TagResponse{
						Success: false,
						Message: fmt.Sprintf("Failed to add path %s to tag %s: %s", folderAndNotePath, tagName, response.Message),
					}
				}
			}
		}
		return TagResponse{
			Success: true,
			Message: "Successfully Added Paths To Tags",
		}
}


func (t *TagsService) GetTagsForFolderAndNotePath(folderAndNotePathWithQueryParam string) project_types.BackendResponseWithData {
	getTagsResponse := t.GetTags()
	if !getTagsResponse.Success {
		return getTagsResponse
	}
	tagsForNote := []string{}
	allTags := getTagsResponse.Data
	for _, tag := range allTags {
		notesResponse := t.GetNotesFromTag(tag)
		if !notesResponse.Success {
			return notesResponse
		}

		notesWithQueryParamExtension := notesResponse.Data
		for _, folderAndNoteStringWithQueryParamFromFile := range notesWithQueryParamExtension {
			if folderAndNotePathWithQueryParam == folderAndNoteStringWithQueryParamFromFile {
				tagsForNote = append(tagsForNote, tag)
			}
		}
	}

	return project_types.BackendResponseWithData{
		Success: true,
		Message: "Successfully retrieved tags.",
		Data: tagsForNote,
	}
}

/*
DeletePathFromTag removes a specific note path from a given tag.
If the tag no longer has any note paths associated with it, the tag folder is deleted.
*/
func (t *TagsService) DeletePathFromTag(tagName string, folderAndNotePathWithoutQueryParam string) TagResponse{
	pathToTagFolder := filepath.Join(t.ProjectPath, "tags", tagName)
	pathToTagFile := filepath.Join(pathToTagFolder, "notes.json")

	if doesExist, _ := io_helpers.FileOrFolderExists(pathToTagFile); !doesExist {
		return TagResponse{
			Success: true,
			Message: "Tag is already deleted",
		}
	}

	var tagJson TagJson
	if err := io_helpers.ReadJsonFromPath(pathToTagFile, &tagJson); err != nil {
		return TagResponse{
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
			return TagResponse{
				Success: false,  // Change this to false to reflect the failure
				Message: "Failed to remove tag folder. Please try again later.",
			}
		} else {
			return TagResponse{
				Success: true,
				Message: "Successfully Deleted Path From Tag",
			}
		}
	}

	tagJson.Notes = notesWithoutDeletedPath

	if err := io_helpers.WriteJsonToPath(pathToTagFile, tagJson); err != nil {
		return TagResponse{
			Success: false,
			Message: "Something went wrong when writing the tag to file. Please try again later",
		}
	}


	return TagResponse{
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
func (t *TagsService) GetTags() project_types.BackendResponseWithData{
	tagsPath := filepath.Join(t.ProjectPath, "tags")
	tagFolders, err := os.ReadDir(tagsPath)
	if err != nil {
		return project_types.BackendResponseWithData{
			Success: false,
			Message: "Something went wrong when fetching tags. Please try again later",
			Data: nil,
		}
	}

	var tags []string

	for _, tagFolder := range tagFolders {
		if !tagFolder.IsDir() {
			continue
		}

		pathToTagNotes := filepath.Join(tagsPath, tagFolder.Name(), "notes.json")
		var tagJson TagJson
		if err := io_helpers.ReadJsonFromPath(pathToTagNotes, &tagJson); err != nil{
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
		tagJson.Notes=validatedFolderAndNotes
		io_helpers.WriteJsonToPath(pathToTagNotes, tagJson)

		tags = append(tags, tagFolder.Name())
	}

	return project_types.BackendResponseWithData{
		Success: true,
		Message: "Successfully retrieved tags.",
		Data: tags,
	}
}

/*
GetNotesFromTag retrieves the note paths associated with a given tag name.
It reads the "notes.json" file within the tag's directory and returns the note paths with query params.
*/
func (t *TagsService) GetNotesFromTag(tagName string) project_types.BackendResponseWithData {
	pathToTagFile := filepath.Join(t.ProjectPath, "tags", tagName, "notes.json")

	if exists, _ := io_helpers.FileOrFolderExists(pathToTagFile); !exists {
		return project_types.BackendResponseWithData{
			Success: false,
			Message: "Tag does not exist",
			Data: nil,
		}
	}

	var tagJson TagJson
	if err := io_helpers.ReadJsonFromPath(pathToTagFile, &tagJson); err != nil {
		return project_types.BackendResponseWithData{
			Success: false,
			Message: "Something went wrong when fetching the tag. Please try again later",
			Data: nil,
		}
	}

	notesWithQueryParamExtension := []string{}

	// Using the query param syntax that the app supports
	for _, folderAndNoteString := range tagJson.Notes {
		// if the note does not exist anymore then we need to skip/remove it
		if doesContainTag := doesFolderAndNoteExist(t.ProjectPath, folderAndNoteString); !doesContainTag {
			continue
		}

		indexOfDot := strings.LastIndex(folderAndNoteString, ".")
		name := folderAndNoteString[:indexOfDot]
		extension := folderAndNoteString[indexOfDot+1:]
		notesWithQueryParamExtension = append(
			notesWithQueryParamExtension,
			fmt.Sprintf("%s?ext=%s", name, extension),
		)
	}


	return project_types.BackendResponseWithData{
		Success: true,
		Message: "Successfully retrieved tag.",
		Data: notesWithQueryParamExtension,
	}
}
