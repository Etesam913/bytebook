package main

import (
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/lib/io_helpers"
)

type TagsService struct {
	ProjectPath string
}

type TagResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
}

type tagJson struct{
	Notes []string `json:"notes"`
}


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
