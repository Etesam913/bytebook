package main

import (
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

func (t *TagsService) AddTag(tagName string, notePath string) TagResponse{
	// This should be a folder that exists
	pathToTag := filepath.Join(t.ProjectPath, "tags", tagName, "notes.json")

	doesTagExist, _ := io_helpers.FileOrFolderExists(pathToTag)
	if !doesTagExist {
		// If a folder has not been created for this tag, create the folder and initialize notes.json with the notePath
		err := createTagFiles(t.ProjectPath, tagName, []string{notePath})
		if err != nil{
			return TagResponse{
				Success: false,
				Message: "Something went wrong when adding the tag. Please try again later",
			}
		}
	} else {
		// If the folder is already created then just add notePatht to the json
		var tagJson tagJson
		err := io_helpers.ReadJsonFromPath(pathToTag, &tagJson)
		if err != nil {
			return TagResponse{
				Success: false,
				Message: "Something went wrong when adding the tag. Please try again later",
			}
		}

		tagJson.Notes = append(tagJson.Notes, notePath)
		err = io_helpers.WriteJsonToPath(pathToTag, tagJson)
		if err != nil {
			return TagResponse{
				Success: false,
				Message: "Something went wrong when writing the tag to file. Please try again later",
			}
		}
	}

	return TagResponse{
		Success: true,
		Message: "Successfully Added Tag",
	}
}
