package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/etesam913/bytebook/lib/io_helpers"
)

type TagsService struct {
	ProjectPath string
}

type TagResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
}

type TagResponseWithData struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	Data []string    `json:"data"`
}

type tagJson struct{
	Notes []string `json:"notes"`
}


/*
createTagFiles creates the necessary folder and JSON file for a given tag.
It initializes the JSON file with the provided note paths.
*/
func createTagFiles(projectPath string, tagName string, notePaths []string) error{
	pathToTag := filepath.Join(projectPath, "tags", tagName)
	err := io_helpers.CreateFolderIfNotExist(pathToTag)
	if err != nil {
		return err
	}

	pathToTagJson := filepath.Join(pathToTag, "notes.json")
	err = io_helpers.WriteJsonToPath(pathToTagJson, tagJson{
		Notes: notePaths,
	})
	if err != nil{
		return err
	}

	return nil
}

/*
AddPathToTag adds a specific note path to a given tag.
If the tag does not exist, it creates the tag and associates the note path with it.
*/
func (t *TagsService) AddPathToTag(tagName string, notePath string) TagResponse {
	pathToTagFolder := filepath.Join(t.ProjectPath, "tags", tagName)
	pathToTagFile := filepath.Join(pathToTagFolder, "notes.json")

	if exists, _ := io_helpers.FileOrFolderExists(pathToTagFile); !exists {
		if err := createTagFiles(t.ProjectPath, tagName, []string{notePath}); err != nil {
			return TagResponse{
				Success: false,
				Message: "Something went wrong when adding the tag. Please try again later",
			}
		}
	} else {
		var tagJson tagJson
		if err := io_helpers.ReadJsonFromPath(pathToTagFile, &tagJson); err != nil {
			return TagResponse{
				Success: false,
				Message: "Something went wrong when adding the tag. Please try again later",
			}
		}

		// Check if notePath already exists in tagJson.Notes
		for _, existingNotePath := range tagJson.Notes {
			if existingNotePath == notePath {
				return TagResponse{Success: true, Message: "Successfully Added Path To Tag"}
			}
		}

		tagJson.Notes = append(tagJson.Notes, notePath)
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
DeletePathFromTag removes a specific note path from a given tag.
If the tag no longer has any note paths associated with it, the tag folder is deleted.
*/
func (t *TagsService) DeletePathFromTag(tagName string, notePath string) TagResponse{
	pathToTagFolder := filepath.Join(t.ProjectPath, "tags", tagName)
	pathToTagFile := filepath.Join(pathToTagFolder, "notes.json")

	if doesExist, _ := io_helpers.FileOrFolderExists(pathToTagFile); !doesExist {
		return TagResponse{
			Success: true,
			Message: "Tag is already deleted",
		}
	}

	var tagJson tagJson
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
		if addedNotePath == notePath && !didFindNotePath {
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
/*
GetTags retrieves a list of all tag names in the project.
It scans the "tags" directory within the project path and returns the names of all subdirectories.
*/
func (t *TagsService) GetTags() TagResponseWithData{
	tagsPath := filepath.Join(t.ProjectPath, "tags")
	files, err := os.ReadDir(tagsPath)
	if err != nil {
		return TagResponseWithData{
			Success: false,
			Message: "Something went wrong when fetching tags. Please try again later",
			Data: nil,
		}
	}

	var tags []string
	for _, file := range files {
		if file.IsDir() {
			tags = append(tags, file.Name())
		}
	}

	return TagResponseWithData{
		Success: true,
		Message: "Successfully retrieved tags.",
		Data: tags,
	}
}

/*
GetNotesFromTag retrieves the note paths associated with a given tag name.
It reads the "notes.json" file within the tag's directory and returns the note paths.
*/
func (t *TagsService) GetNotesFromTag(tagName string) TagResponseWithData {
	pathToTagFile := filepath.Join(t.ProjectPath, "tags", tagName, "notes.json")

	if exists, _ := io_helpers.FileOrFolderExists(pathToTagFile); !exists {
		return TagResponseWithData{
			Success: false,
			Message: "Tag does not exist",
			Data: nil,
		}
	}

	var tagJson tagJson
	if err := io_helpers.ReadJsonFromPath(pathToTagFile, &tagJson); err != nil {
		return TagResponseWithData{
			Success: false,
			Message: "Something went wrong when fetching the tag. Please try again later",
			Data: nil,
		}
	}

	notesWithQueryParamExtension := []string{}

	// Using the query param syntax that the app supports
	for _, file := range tagJson.Notes {
		indexOfDot := strings.LastIndex(file, ".")
		name := file[:indexOfDot]
		extension := file[indexOfDot+1:]
		notesWithQueryParamExtension = append(
			notesWithQueryParamExtension,
			fmt.Sprintf("%s?ext=%s", name, extension),
		)
	}


	return TagResponseWithData{
		Success: true,
		Message: "Successfully retrieved tag.",
		Data: notesWithQueryParamExtension,
	}
}
