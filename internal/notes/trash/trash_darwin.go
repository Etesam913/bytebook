//go:build darwin

package trash

/*
#cgo darwin LDFLAGS: -framework CoreServices
#include <CoreServices/CoreServices.h>
#include <stdlib.h>
*/
import "C"
import (
	"fmt"
	"os"
	"path/filepath"
	"unsafe"

	"github.com/etesam913/bytebook/internal/util"
)

// moveToTrashNative attempts to move a file to trash using macOS CoreServices API.
// It returns the final path used inside Trash when successful.
func moveToTrashNative(src string) (string, bool) {
	cpath := C.CString(src)
	defer C.free(unsafe.Pointer(cpath))
	var ctarget *C.char
	status := C.FSPathMoveObjectToTrashSync(cpath, &ctarget, C.kFSFileOperationDefaultOptions)
	if status != 0 {
		return "", false
	}
	if ctarget == nil {
		return "", false
	}

	trashedPath := C.GoString(ctarget)
	C.free(unsafe.Pointer(ctarget))
	return trashedPath, true
}

func moveToTrash(src, homeDir string) (string, error) {
	trashDir := os.Getenv("BYTEBOOK_TRASH_DIR")
	if trashDir == "" {
		if path, ok := moveToTrashNative(src); ok {
			return path, nil
		}
		trashDir = filepath.Join(homeDir, ".Trash")
	}
	if err := os.MkdirAll(trashDir, 0755); err != nil {
		return "", fmt.Errorf("could not create macOS trash directory: %w", err)
	}
	dest, err := uniqueTrashName(trashDir, src)
	if err != nil {
		return "", err
	}
	if err := os.Rename(src, dest); err != nil {
		return "", fmt.Errorf("could not move file to macOS trash fallback: %w", err)
	}
	return dest, nil
}

func removeTrashInfo(string) error { return nil }

// RestoreNotesFromTrash restores trashed note and folder paths back into the current project's notes directory.
func RestoreNotesFromTrash(projectPath string, restoreItems []TrashRestoreInfo) error {
	notesPath := filepath.Join(projectPath, "notes")
	for _, restoreItem := range restoreItems {
		if err := validatePathInsideNotes(notesPath, restoreItem.OriginalPath); err != nil {
			return err
		}

		if err := restoreFromTrash(restoreItem.TrashedPath, restoreItem.OriginalPath); err != nil {
			return err
		}
		for _, relatedItem := range restoreItem.RelatedItems {
			if err := validatePathInsideNotes(notesPath, relatedItem.OriginalPath); err != nil {
				return err
			}
			if err := restoreFromTrash(relatedItem.TrashedPath, relatedItem.OriginalPath); err != nil {
				return err
			}
		}
	}

	return nil
}

func validatePathInsideNotes(notesPath, path string) error {
	relativePath, err := filepath.Rel(notesPath, path)
	if err != nil {
		return fmt.Errorf("could not validate restore path: %w", err)
	}
	if _, err := util.SafeJoin(notesPath, relativePath); err != nil {
		return fmt.Errorf("restore path must stay inside the notes directory: %w", err)
	}
	return nil
}
