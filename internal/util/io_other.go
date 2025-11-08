//go:build !darwin

package util

// moveToTrashDarwin is a stub for non-macOS platforms.
// It always returns false since CoreServices API is not available.
func moveToTrashDarwin(src string) bool {
	return false
}
