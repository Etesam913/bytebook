package main

import (
	"fmt"
	"os"
	"path/filepath"
)

type FolderService struct {
	ProjectPath string
}

type FolderResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	Data    []string `json:"data"`
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
