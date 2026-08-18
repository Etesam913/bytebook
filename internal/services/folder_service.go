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

func (f *FolderService) AddFolder(folderName string) config.BackendResponseWithoutData {
	pathToFolder, err := util.SafeJoin(filepath.Join(f.ProjectPath, "notes"), folderName)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Invalid folder name: %s", folderName),
		}
	}

	info, err := os.Stat(pathToFolder)
	if err == nil {
		if info.IsDir() {
			return config.BackendResponseWithoutData{
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
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Failed to create folder",
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "",
	}
}

// Updates the folder name
func (f *FolderService) RenameFolder(oldFolderName string, newFolderName string) config.BackendResponseWithoutData {
	folderBase := filepath.Join(f.ProjectPath, "notes")
	pathToOldFolder, err := util.SafeJoin(folderBase, oldFolderName)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Invalid folder name: %s", oldFolderName),
		}
	}
	pathToNewFolder, err := util.SafeJoin(folderBase, newFolderName)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Invalid folder name: %s", newFolderName),
		}
	}

	info, err := os.Stat(pathToNewFolder)

	if err == nil && info.IsDir() {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf(
				"Folder name, \"%s\", already exists, please choose a different name",
				newFolderName,
			),
		}
	}

	err = os.Rename(pathToOldFolder, pathToNewFolder)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Failed to rename folder",
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "",
	}
}
