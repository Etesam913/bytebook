package util

import (
	"strings"
)

var FILE_SERVER_URL = "http://localhost:5890"
var INTERNAL_LINK_PREFIX = "wails://localhost:5173"

// FormatStringListForErrorMessage formats a list of strings for error messages.
// If the list exceeds the specified capacity, it appends "etc..." to the end of the formatted string.
// Parameters:
//   - stringList: The list of strings to format.
//   - capacity: The maximum number of strings to include in the formatted string.
func FormatStringListForErrorMessage(stringList []string, capacity int) string {
	if len(stringList) == 0 {
		return ""
	}

	if capacity <= 0 {
		capacity = 1
	}

	isLargerThanCapacity := len(stringList) > capacity

	// Determine how many items to include
	itemsToInclude := min(len(stringList), capacity)

	joinedString := strings.Join(stringList[:itemsToInclude], ", ")
	if isLargerThanCapacity {
		joinedString += "etc..."
	}
	return joinedString
}

// ConstructFileServerPath constructs a file server URL path by joining the server URL, "notes" directory,
// file folder, and file name.
// Parameters:
//   - fileFolder: The folder path where the file is located.
//   - fileName: The name of the file.
//
// Returns:
//   - The complete file server path as a string.
func ConstructFileServerPath(fileFolder, fileName string) string {
	// Use strings.Join with "/" to properly construct URLs instead of filepath.Join
	// which treats URLs as file paths and can corrupt the protocol
	parts := []string{FILE_SERVER_URL, "notes"}
	if fileFolder != "" {
		parts = append(parts, fileFolder)
	}
	if fileName != "" {
		parts = append(parts, fileName)
	}
	return strings.Join(parts, "/")
}

// ConstructInternalLink constructs an internal link URL path by joining the internal link prefix, "notes" directory,
// file folder, and file name.
// Parameters:
//   - fileFolder: The folder path where the file is located.
//   - fileName: The name of the file.
//
// Returns:
//   - The complete internal link path as a string.
func ConstructInternalLink(fileFolder, fileName string) string {
	// Use strings.Join with "/" to properly construct URLs instead of filepath.Join
	// which treats URLs as file paths and can corrupt the protocol
	parts := []string{INTERNAL_LINK_PREFIX, "notes"}
	if fileFolder != "" {
		parts = append(parts, fileFolder)
	}
	if fileName != "" {
		parts = append(parts, fileName)
	}
	return strings.Join(parts, "/")
}
