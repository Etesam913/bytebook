package services

import (
	"fmt"
	"log"
	"path/filepath"
	"strings"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/util"
)

type FileTreeService struct {
	ProjectPath string
}

// GetAllPaths returns every file and folder path under the notes directory,
// sorted, with directories marked by a trailing slash.
func (f *FileTreeService) GetAllPaths() config.BackendResponseWithData[[]string] {
	paths, err := notes.GetAllPaths(f.ProjectPath)
	if err != nil {
		log.Printf("GetAllPaths: %v", err)
		return config.BackendResponseWithData[[]string]{
			Success: false,
			// The raw error carries the user's absolute home path.
			Message: "Failed to read the notes directory",
			Data:    []string{},
		}
	}

	return config.BackendResponseWithData[[]string]{
		Success: true,
		Message: "Successfully retrieved all paths",
		Data:    paths,
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

	notesBase := filepath.Join(f.ProjectPath, "notes")
	failedItemNames := []string{}
	for _, pathToItem := range normalizedItemPaths {
		fullPathToItem, err := util.SafeJoin(notesBase, pathToItem)
		if err != nil {
			failedItemNames = append(failedItemNames, pathToItem)
			continue
		}
		fullPathWithNewFolder, err := util.SafeJoin(notesBase, filepath.Join(newFolder, filepath.Base(pathToItem)))
		if err != nil {
			failedItemNames = append(failedItemNames, pathToItem)
			continue
		}
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
