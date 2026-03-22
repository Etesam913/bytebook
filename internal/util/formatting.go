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
