package services

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/util"
)

type FolderService struct {
	ProjectPath string
}

// GetFolders returns a list of folders in the notes directory
func (f *FolderService) GetFolders() config.BackendResponseWithData[[]string] {
	notesPath := filepath.Join(f.ProjectPath, "notes")
	// Ensure the directory exists
	if err := os.MkdirAll(notesPath, os.ModePerm); err != nil {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: "Could not create the notes directory",
			Data:    nil,
		}
	}

	// Get the folders present in the notes directory
	files, err := os.ReadDir(notesPath)
	if err != nil {
		return config.BackendResponseWithData[[]string]{
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

	return config.BackendResponseWithData[[]string]{
		Success: true,
		Message: "Folders retrieved successfully",
		Data:    folders,
	}
}

func (f *FolderService) DoesFolderExist(folderName string) config.BackendResponseWithData[[]string] {
	folderPath := filepath.Join(f.ProjectPath, "notes", folderName)
	exists, err := util.FileOrFolderExists(folderPath)
	if err != nil {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: err.Error(),
		}
	}
	if !exists {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: "Folder does not exist",
		}
	}
	return config.BackendResponseWithData[[]string]{
		Success: true,
		Message: "",
	}
}

func (f *FolderService) AddFolder(folderName string) config.BackendResponseWithData[[]string] {
	pathToFolder := filepath.Join(f.ProjectPath, "notes", folderName)

	info, err := os.Stat(pathToFolder)
	if err == nil {
		if info.IsDir() {
			return config.BackendResponseWithData[[]string]{
				Success: false,
				Message: fmt.Sprintf(
					"Folder name, \"%s\", already exists, please choose a different name",
					folderName,
				),
			}
		}
	}

	// Ensure the directory exists
	if err := os.MkdirAll(pathToFolder, os.ModePerm); err != nil {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: err.Error(),
		}
	}

	return config.BackendResponseWithData[[]string]{
		Success: true,
		Message: "",
	}
}

func (f *FolderService) DeleteFolder(folderName string) config.BackendResponseWithData[[]string] {
	folderPath := filepath.Join(f.ProjectPath, "notes", folderName)

	if _, err := os.Stat(folderPath); os.IsNotExist(err) {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: fmt.Sprintf("Folder does not exist: %s", folderName),
		}
	}

	err := util.MoveToTrash(folderPath)
	if err != nil {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: err.Error(),
		}
	}
	return config.BackendResponseWithData[[]string]{
		Success: true,
		Message: "",
	}
}

// Updates the folder name
func (f *FolderService) RenameFolder(oldFolderName string, newFolderName string) config.BackendResponseWithData[[]string] {
	folderBase := filepath.Join(f.ProjectPath, "notes")
	info, err := os.Stat(filepath.Join(folderBase, newFolderName))

	if err == nil && info.IsDir() {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: fmt.Sprintf(
				"Folder name, \"%s\", already exists, please choose a different name",
				newFolderName,
			),
		}
	}

	err = os.Rename(
		filepath.Join(folderBase, oldFolderName),
		filepath.Join(folderBase, newFolderName),
	)
	if err != nil {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: err.Error(),
		}
	}

	return config.BackendResponseWithData[[]string]{
		Success: true,
		Message: "",
	}
}
