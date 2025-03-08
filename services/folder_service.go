package services

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/Kei-K23/trashbox"
	"github.com/etesam913/bytebook/lib/io_helpers"
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

func (f *FolderService) DoesFolderExist(folderName string) FolderResponse {
	folderPath := filepath.Join(f.ProjectPath, "notes", folderName)
	exists, err := io_helpers.FileOrFolderExists(folderPath)
	if err != nil {
		return FolderResponse{Success: false, Message: err.Error()}
	}
	if !exists {
		return FolderResponse{Success: false, Message: "Folder does not exist"}
	}
	return FolderResponse{Success: true, Message: ""}
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

	if _, err := os.Stat(folderPath); os.IsNotExist(err) {
		return FolderResponse{Success: false, Message: fmt.Sprintf("Folder does not exist: %s", folderName)}
	}

	err := trashbox.MoveToTrash(folderPath)
	if err != nil {
		return FolderResponse{Success: false, Message: err.Error()}
	}
	return FolderResponse{Success: true, Message: ""}
}

// Updates the folder name
func (f *FolderService) RenameFolder(oldFolderName string, newFolderName string) FolderResponse {
	folderBase := filepath.Join(f.ProjectPath, "notes")
	info, err := os.Stat(filepath.Join(folderBase, newFolderName))

	if err == nil && info.IsDir() {
		return FolderResponse{Success: false, Message: fmt.Sprintf("Folder name, \"%s\", already exists, please choose a different name", newFolderName)}
	}

	err = os.Rename(filepath.Join(folderBase, oldFolderName), filepath.Join(folderBase, newFolderName))
	if err != nil {
		return FolderResponse{Success: false, Message: err.Error()}
	}
	return FolderResponse{Success: true, Message: ""}
}

func (f *FolderService) RevealFolderInFinder(folderName string) FolderResponse {
	folderPath := filepath.Join(f.ProjectPath, "notes", folderName)
	err := io_helpers.RevealInFinder(folderPath)
	if err != nil {
		return FolderResponse{Success: false, Message: "Could not reveal folder in finder"}
	}
	return FolderResponse{Success: true, Message: ""}
}
