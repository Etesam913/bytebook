package services

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/config"
)

type FolderService struct {
	ProjectPath string
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
				Data: []string{},
			}
		}
	}

	// Ensure the directory exists
	if err := os.MkdirAll(pathToFolder, os.ModePerm); err != nil {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: err.Error(),
			Data:    []string{},
		}
	}

	return config.BackendResponseWithData[[]string]{
		Success: true,
		Message: "",
		Data:    []string{},
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
			Data: []string{},
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
			Data:    []string{},
		}
	}

	return config.BackendResponseWithData[[]string]{
		Success: true,
		Message: "",
		Data:    []string{},
	}
}
