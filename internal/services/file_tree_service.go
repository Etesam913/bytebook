package services

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/util"
)

type FileTreeService struct {
	ProjectPath string
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

// MoveItemsToFolder moves one or more items to a new folder within the notes directory.
// It takes a slice of item paths relative to the notes directory and the name of the destination folder.
// If any items fail to move, their names will be included in an error message.
// Returns a BackendResponseWithoutData indicating success or failure of the operation.
func (f *FileTreeService) MoveItemsToFolder(itemPaths []string, newFolder string) config.BackendResponseWithoutData {
	// A selection can legitimately contain both an ancestor and one of its
	// descendants (e.g. shift-click across an expanded subtree). Moving the
	// ancestor also moves its children atomically, so a follow-up move on the
	// descendant would fail because the source path is gone. Collapse the list
	// to just the top-most entries so we only issue one rename per subtree.
	normalizedItemPaths := util.DedupeDescendantPaths(itemPaths)

	failedItemNames := []string{}
	for _, pathToItem := range normalizedItemPaths {
		fullPathToItem := filepath.Join(f.ProjectPath, "notes", pathToItem)
		fullPathWithNewFolder := filepath.Join(f.ProjectPath, "notes", newFolder, filepath.Base(pathToItem))
		var err error
		if strings.EqualFold(filepath.Ext(pathToItem), ".md") {
			err = moveMarkdownNoteWithSidecar(fullPathToItem, fullPathWithNewFolder)
		} else {
			err = util.MoveFile(fullPathToItem, fullPathWithNewFolder)
		}

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
