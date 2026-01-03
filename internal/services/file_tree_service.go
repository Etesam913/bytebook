package services

import (
	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes"
)

type FileTreeService struct {
	ProjectPath string
}

func (f *FileTreeService) GetChildrenOfFolder(folderId, pathToFolder, parentId string) config.BackendResponseWithData[notes.FileOrFolder] {
	childrenIds, err := notes.GetChildrenOfFolder(f.ProjectPath, folderId, pathToFolder, parentId)

	if err != nil {
		return config.BackendResponseWithData[notes.FileOrFolder]{
			Success: false,
			Message: err.Error(),
		}
	}

	return config.BackendResponseWithData[notes.FileOrFolder]{
		Success: true,
		Message: "Successfully retrieved children",
		Data: notes.FileOrFolder{
			Id:          folderId,
			Path:        pathToFolder,
			ParentId:    parentId,
			Type:        "folder",
			ChildrenIds: childrenIds,
		},
	}
}
