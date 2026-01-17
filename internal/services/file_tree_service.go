package services

import (
	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes"
)

type FileTreeService struct {
	ProjectPath string
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
