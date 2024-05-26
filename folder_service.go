package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type FolderService struct {
	ProjectPath string
}

type FolderResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	Data    []string `json:"data"`
}

// GetFilesInTrash retrieves the names of all files in the trash directory of the project.
// It ensures that the trash directory exists and returns a response indicating success or failure.
// If successful, the response includes the list of file names found in the trash directory.
func (f *FolderService) GetFilesInTrash() FolderResponse {
	// Construct the path to the trash directory by joining the project path with "trash"
	trashPath := filepath.Join(f.ProjectPath, "trash")

	// Ensure the trash directory exists, create it if it doesn't
	if err := os.MkdirAll(trashPath, os.ModePerm); err != nil {
		// Return a failure response if the directory cannot be created
		return FolderResponse{
			Success: false,
			Message: "Could not get contents from trash",
			Data:    nil,
		}
	}

	// Read the contents of the trash directory
	filesEntries, err := os.ReadDir(trashPath)
	if err != nil {
		// Return a failure response if the contents cannot be read
		return FolderResponse{
			Success: false,
			Message: "Could not get contents from trash",
			Data:    nil,
		}
	}

	// Initialize a slice to hold the names of the files in the trash directory
	files := []string{}
	for _, file := range filesEntries {
		// Append each file name to the slice
		files = append(files, file.Name())
	}

	// Return a success response with the list of file names
	return FolderResponse{
		Success: true,
		Message: "Successfully got contents from trash",
		Data:    files,
	}
}

// ClearTrash deletes all files in the trash directory of the project.
// It constructs the path to the trash directory, reads the contents, and attempts to delete each file.
// It returns a response indicating success or failure, including details of any files that could not be deleted.
func (f *FolderService) ClearTrash() FolderResponse {
	// Construct the path to the trash directory by joining the project path with "trash"
	trashPath := filepath.Join(f.ProjectPath, "trash")

	// Read the contents of the trash directory
	files, err := os.ReadDir(trashPath)
	if err != nil {
		// Return a failure response if the contents cannot be read
		return FolderResponse{
			Success: false,
			Message: "Could not get contents from trash",
			Data:    nil,
		}
	}

	// Initialize a slice to keep track of files that could not be deleted
	errors := []string{}

	// Iterate over each file entry
	for _, file := range files {
		// Attempt to delete the file
		err := os.Remove(filepath.Join(trashPath, file.Name()))
		if err != nil {
			// If deletion fails, add the file name to the errors slice
			errors = append(errors, file.Name())
		}
	}

	// Check if there were any errors during deletion
	if len(errors) > 0 {
		// Return a failure response with the list of files that could not be deleted
		return FolderResponse{
			Success: false,
			Message: fmt.Sprintf("Could not clear trash for %s", strings.Join(errors, ", ")),
			Data:    nil,
		}
	}

	// Return a success response indicating all files were successfully deleted
	return FolderResponse{
		Success: true,
		Message: "Successfully cleared trash",
		Data:    nil,
	}
}

func (f *FolderService) GetFolders() FolderResponse {
	notesPath := filepath.Join(f.ProjectPath, "notes")
	// Ensure the directory exists
	if err := os.MkdirAll(notesPath, os.ModePerm); err != nil {
		return FolderResponse{
			Success: false,
			Message: "Could not create the notes directory",
			Data:    nil,
		}
	}

	// Get the folders present in the notes directory
	files, err := os.ReadDir(notesPath)
	if err != nil {
		return FolderResponse{
			Success: false,
			Message: "Could not read the notes directory",
			Data:    nil,
		}
	}
	folders := make([]string, 0)
	for _, file := range files {
		if file.IsDir() {
			folders = append(folders, file.Name())
		}
	}

	return FolderResponse{
		Success: true,
		Message: "Folders retrieved successfully",
		Data:    folders,
	}
}

func (f *FolderService) AddFolder(folderName string) FolderResponse {
	pathToFolder := filepath.Join(f.ProjectPath, "notes", folderName)

	info, err := os.Stat(pathToFolder)
	if err == nil {
		if info.IsDir() {
			return FolderResponse{Success: false, Message: fmt.Sprintf("Folder name, \"%s\", already exists, please choose a different name", folderName)}
		}
	}

	// Ensure the directory exists
	if err := os.MkdirAll(pathToFolder, os.ModePerm); err != nil {
		return FolderResponse{Success: false, Message: err.Error()}
	}

	// Create an attachments folder inside the folder
	// attachmentsPath := filepath.Join(pathToFolder, "attachments")
	// if err := os.MkdirAll(attachmentsPath, os.ModePerm); err != nil {
	// 	return FolderResponse{Success: false, Message: err.Error()}
	// }

	return FolderResponse{Success: true, Message: ""}
}

func (f *FolderService) DeleteFolder(folderName string) FolderResponse {
	folderPath := filepath.Join(f.ProjectPath, "notes", folderName)
	err := os.RemoveAll(folderPath)
	if err != nil {
		return FolderResponse{Success: false, Message: err.Error()}
	}
	return FolderResponse{Success: true, Message: ""}
}

// Updates the folder name
func (f *FolderService) RenameFolder(oldFolderName string, newFolderName string) FolderResponse {
	folderBase := filepath.Join(f.ProjectPath, "notes")
	err := os.Rename(filepath.Join(folderBase, oldFolderName), filepath.Join(folderBase, newFolderName))
	if err != nil {
		return FolderResponse{Success: false, Message: err.Error()}
	}
	return FolderResponse{Success: true, Message: ""}
}
