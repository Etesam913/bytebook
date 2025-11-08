//go:build darwin

package util

/*
#cgo darwin LDFLAGS: -framework CoreServices
#include <CoreServices/CoreServices.h>
*/
import "C"
import (
	"unsafe"
)

// moveToTrashDarwin attempts to move a file to trash using macOS CoreServices API.
// Returns true if successful, false otherwise.
func moveToTrashDarwin(src string) bool {
	cpath := C.CString(src)
	defer C.free(unsafe.Pointer(cpath))
	var ctarget *C.char
	status := C.FSPathMoveObjectToTrashSync(cpath, &ctarget, C.kFSFileOperationDefaultOptions)
	return status == 0
}
