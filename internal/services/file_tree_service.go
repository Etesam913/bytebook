package services

import (
	"fmt"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/fsnotify/fsnotify"
)

type FileTreeService struct {
	ProjectPath string
	FileWatcher *fsnotify.Watcher
}

func (f *FileTreeService) GetChildrenOfFolderBasedOnLimit(pathToFolder string, parentId string, cursor string, limit int) config.BackendResponseWithData[notes.FileOrFolderPage] {
	childrenFileOrFolders, err := notes.GetChildrenOfFolderBasedOnLimit(f.ProjectPath, pathToFolder, parentId, cursor, limit)

	if err != nil {
		return config.BackendResponseWithData[notes.FileOrFolderPage]{
			Success: false,
			Message: err.Error(),
		}
	}

	return config.BackendResponseWithData[notes.FileOrFolderPage]{
		Success: true,
		Message: "Successfully retrieved children",
		Data:    childrenFileOrFolders,
	}
}

func (f *FileTreeService) GetChildrenOfFolderBasedOnPath(
	pathToFolder, parentId, cursor, endCursor string,
) config.BackendResponseWithData[notes.FileOrFolderPage] {
	childrenFileOrFolders, err := notes.GetChildrenOfFolderBasedOnPath(f.ProjectPath, pathToFolder, parentId, cursor, endCursor)

	if err != nil {
		return config.BackendResponseWithData[notes.FileOrFolderPage]{
			Success: false,
			Message: err.Error(),
		}
	}

	return config.BackendResponseWithData[notes.FileOrFolderPage]{
		Success: true,
		Message: "Successfully retrieved children",
		Data:    childrenFileOrFolders,
	}
}

func (f *FileTreeService) GetTopLevelItems() config.BackendResponseWithData[[]notes.FileOrFolder] {
	fileOrFolders, err := notes.GetTopLevelItems(f.ProjectPath)
	if err != nil {
		return config.BackendResponseWithData[[]notes.FileOrFolder]{
			Success: false,
			Message: err.Error(),
		}
	}

	return config.BackendResponseWithData[[]notes.FileOrFolder]{
		Success: true,
		Message: "Sucessfully retrieved top level items",
		Data:    fileOrFolders,
	}
}

// OpenFolderAndAddToFileWatcher adds a folder to the file watcher.
// Watching a folder automatically provides events for files inside it.
func (f *FileTreeService) OpenFolderAndAddToFileWatcher(folderPath string) config.BackendResponseWithoutData {
	fullPath := filepath.Join(f.ProjectPath, "notes", folderPath)
	err := f.FileWatcher.Add(fullPath)

	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: err.Error(),
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully opened folder",
	}
}

// CloseFolderAndRemoveFromFileWatcher removes a folder from the file watcher.
func (f *FileTreeService) CloseFolderAndRemoveFromFileWatcher(folderPath string) config.BackendResponseWithoutData {
	fullPath := filepath.Join(f.ProjectPath, "notes", folderPath)
	err := f.FileWatcher.Remove(fullPath)

	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: err.Error(),
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully closed folder",
	}
}

// MoveItemsToFolder moves one or more items to a new folder within the notes directory.
// It takes a slice of item paths relative to the notes directory and the name of the destination folder.
// If any items fail to move, their names will be included in an error message.
// Returns a BackendResponseWithoutData indicating success or failure of the operation.
func (f *FileTreeService) MoveItemsToFolder(itemPaths []string, newFolder string) config.BackendResponseWithoutData {
	failedItemNames := []string{}
	for _, pathToItem := range itemPaths {
		fullPathToItem := filepath.Join(f.ProjectPath, "notes", pathToItem)
		fullPathWithNewFolder := filepath.Join(f.ProjectPath, "notes", newFolder, filepath.Base(pathToItem))
		err := util.MoveFile(fullPathToItem, fullPathWithNewFolder)

		if err != nil {
			failedItemNames = append(failedItemNames, pathToItem)
		}
	}

	if len(failedItemNames) > 0 {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf(
				"Failed to move %s into %s", util.FormatStringListForErrorMessage(failedItemNames, 3), newFolder,
			),
		}
	}

	return config.BackendResponseWithoutData{Success: true, Message: ""}
}
