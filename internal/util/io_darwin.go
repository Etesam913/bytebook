//go:build darwin

package util

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
)

// moveToTrashDarwin attempts to move a file to trash using macOS CoreServices API.
// It returns the final path used inside Trash when successful.
func moveToTrashDarwin(src string) (string, bool) {
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

// restoreToTrashDarwin moves a trashed item back to its original path.
func restoreToTrashDarwin(trashedPath string, originalPath string) error {
	exists, err := FileOrFolderExists(trashedPath)
	if err != nil {
		return fmt.Errorf("could not check trashed item: %w", err)
	}
	if !exists {
		return fmt.Errorf("trashed item no longer exists")
	}

	destinationExists, err := FileOrFolderExists(originalPath)
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

	return nil
}
