package services

import (
	"path/filepath"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/fsnotify/fsnotify"
)

type FileTreeService struct {
	ProjectPath string
	FileWatcher *fsnotify.Watcher
}

func (f *FileTreeService) GetChildrenOfFolder(pathToFolder string, cursor string, limit int) config.BackendResponseWithData[notes.FileOrFolderPage] {
	childrenFileOrFolders, err := notes.GetChildrenOfFolder(f.ProjectPath, pathToFolder, cursor, limit)

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
