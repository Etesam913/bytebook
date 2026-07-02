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

func (f *FolderService) AddFolder(folderName string) config.BackendResponseWithData[[]string] {
	pathToFolder, err := util.SafeJoin(filepath.Join(f.ProjectPath, "notes"), folderName)
	if err != nil {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: fmt.Sprintf("Invalid folder name: %s", folderName),
			Data:    []string{},
		}
	}

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
	pathToOldFolder, err := util.SafeJoin(folderBase, oldFolderName)
	if err != nil {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: fmt.Sprintf("Invalid folder name: %s", oldFolderName),
			Data:    []string{},
		}
	}
	pathToNewFolder, err := util.SafeJoin(folderBase, newFolderName)
	if err != nil {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: fmt.Sprintf("Invalid folder name: %s", newFolderName),
			Data:    []string{},
		}
	}

	info, err := os.Stat(pathToNewFolder)

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

	err = os.Rename(pathToOldFolder, pathToNewFolder)
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
