// Package trash moves notes, attachments, and their sidecars into system trash.
package trash

import (
	"errors"
	"fmt"
	"os"
	"os/user"
	"path/filepath"
	"time"

	"github.com/etesam913/bytebook/internal/notes/sidecar"
	"github.com/etesam913/bytebook/internal/util"
)

type TrashRestoreInfo struct {
	OriginalPath string             `json:"originalPath"`
	TrashedPath  string             `json:"trashedPath"`
	IsFolder     bool               `json:"isFolder"`
	RelatedItems []TrashRestoreInfo `json:"relatedItems,omitempty"`
}

// MoveToTrash moves the file or directory at src to the user's home trash directory.
// On macOS it first tries FSPathMoveObjectToTrashSync to preserve Finder metadata;
// on failure it falls back to a rename. Other platforms use the XDG Trash layout.
// The returned metadata is used to support app-level undo.
func MoveToTrash(src string) (TrashRestoreInfo, error) {
	fileInfo, err := os.Stat(src)
	if err != nil {
		return TrashRestoreInfo{}, fmt.Errorf("could not stat source before moving to trash: %w", err)
	}

	usr, err := user.Current()
	if err != nil {
		return TrashRestoreInfo{}, fmt.Errorf("could not get current user: %w", err)
	}

	// Ensure absolute path for metadata accuracy
	srcAbs, err := filepath.Abs(src)
	if err == nil {
		src = srcAbs
	}

	restoreInfo := TrashRestoreInfo{
		OriginalPath: src,
		IsFolder:     fileInfo.IsDir(),
	}

	restoreInfo.TrashedPath, err = moveToTrash(src, usr.HomeDir)
	if err != nil {
		return TrashRestoreInfo{}, err
	}
	return restoreInfo, nil
}

// uniqueTrashName chooses a timestamp-prefixed path without replacing existing items.
func uniqueTrashName(trashDir, src string) (string, error) {
	name := time.Now().Format("20060102T150405") + "_" + filepath.Base(src)
	for suffix := 0; ; suffix++ {
		candidate := name
		if suffix > 0 {
			candidate = fmt.Sprintf("%d_%s", suffix, name)
		}
		path := filepath.Join(trashDir, candidate)
		if _, err := os.Lstat(path); errors.Is(err, os.ErrNotExist) {
			return path, nil
		} else if err != nil {
			return "", fmt.Errorf("check trash destination: %w", err)
		}
	}
}

// MoveNotesToTrash moves the given notes (and folders) into the system trash.
// It returns restore metadata for successful moves, even when other moves fail.
func MoveNotesToTrash(projectPath string, folderAndNotes []string) ([]TrashRestoreInfo, error) {
	var failed []error
	normalizedPaths := util.DedupeDescendantPaths(folderAndNotes)
	restoreItems := make([]TrashRestoreInfo, 0, len(normalizedPaths))

	// Attempt to move each note/folder to trash
	for _, relPath := range normalizedPaths {
		fileName := filepath.Base(relPath)
		fullPath, err := util.SafeJoin(filepath.Join(projectPath, "notes"), relPath)
		if err != nil {
			failed = append(failed, fmt.Errorf("%s: %w", fileName, err))
			continue
		}

		var relatedItems []TrashRestoreInfo
		fileInfo, err := os.Stat(fullPath)
		if err != nil {
			failed = append(failed, fmt.Errorf("%s: %w", fileName, err))
			continue
		}
		if !fileInfo.IsDir() {
			sidecarPath := sidecar.PathFor(fullPath)
			if sidecarExists, err := util.FileOrFolderExists(sidecarPath); err != nil {
				failed = append(failed, fmt.Errorf("%s: %w", fileName, err))
				continue
			} else if sidecarExists {
				sidecarRestoreInfo, err := MoveToTrash(sidecarPath)
				if err != nil {
					failed = append(failed, fmt.Errorf("%s: %w", fileName, err))
					continue
				}
				relatedItems = append(relatedItems, sidecarRestoreInfo)
			}
		}

		restoreInfo, err := MoveToTrash(fullPath)
		if err != nil {
			for _, relatedItem := range relatedItems {
				_ = restoreFromTrash(relatedItem.TrashedPath, relatedItem.OriginalPath)
			}
			failed = append(failed, fmt.Errorf("%s: %w", fileName, err))
			continue
		}
		restoreInfo.RelatedItems = relatedItems
		restoreItems = append(restoreItems, restoreInfo)
	}

	return restoreItems, errors.Join(failed...)
}

func restoreFromTrash(trashedPath, originalPath string) error {
	exists, err := util.FileOrFolderExists(trashedPath)
	if err != nil {
		return fmt.Errorf("could not check trashed item: %w", err)
	}
	if !exists {
		return fmt.Errorf("trashed item no longer exists")
	}
	destinationExists, err := util.FileOrFolderExists(originalPath)
	if err != nil {
		return fmt.Errorf("could not check restore destination: %w", err)
	}
	if destinationExists {
		return fmt.Errorf("an item already exists at the restore destination")
	}
	if err := os.MkdirAll(filepath.Dir(originalPath), 0755); err != nil {
		return fmt.Errorf("could not create restore directory: %w", err)
	}
	if err := os.Rename(trashedPath, originalPath); err != nil {
		return fmt.Errorf("could not restore item from trash: %w", err)
	}
	return removeTrashInfo(trashedPath)
}
