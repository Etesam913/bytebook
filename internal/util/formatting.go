package util

import "strings"

// FormatStringListForErrorMessage formats a list of strings for error messages.
// If the list exceeds the specified capacity, it appends "etc..." to the end of the formatted string.
// Parameters:
//   - stringList: The list of strings to format.
//   - capacity: The maximum number of strings to include in the formatted string.
func FormatStringListForErrorMessage(stringList []string, capacity int) string {
	isLargerThanCapacity := len(stringList) > capacity
	joinedString := strings.Join(stringList[:capacity+1], ", ")
	if isLargerThanCapacity {
		joinedString += "etc..."
	}
	return joinedString
}
