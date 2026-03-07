//go:build !darwin

package util

import "fmt"

// moveToTrashDarwin is a stub for non-macOS platforms.
// It always returns false since CoreServices API is not available.
func moveToTrashDarwin(src string) (string, bool) {
	return "", false
}

// restoreToTrashDarwin is a stub for non-macOS platforms.
func restoreToTrashDarwin(trashedPath string, originalPath string) error {
	return fmt.Errorf("trash restore is only supported on macOS")
}
