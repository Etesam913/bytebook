package list_helpers

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Filter is a generic function that filters elements of a slice based on a condition.
func Filter[T any](slice []T, condition func(T) bool) []T {
	var result []T
	for _, item := range slice {
		if condition(item) {
			result = append(result, item)
		}
	}
	return result
}

// Pop removes and returns the last element of the slice.
func Pop[T any](slice []T) ([]T, T, error) {
	if len(slice) == 0 {
		var zeroValue T
		return nil, zeroValue, fmt.Errorf("cannot pop from an empty slice")
	}
	lastIndex := len(slice) - 1
	element := slice[lastIndex]
	slice = slice[:lastIndex]
	return slice, element, nil
}

// Constants representing each possible sort option.
const (
	DateUpdatedDesc string = "date-updated-desc"
	DateUpdatedAsc  string = "date-updated-asc"
	DateCreatedDesc string = "date-created-desc"
	DateCreatedAsc  string = "date-created-asc"
	FileNameAZ      string = "file-name-a-z"
	FileNameZA      string = "file-name-z-a"
	SizeDesc        string = "size-desc"
	SizeAsc         string = "size-asc"
	FileType        string = "file-type"
)

// sortNotes sorts a slice of os.DirEntry objects representing notes based on the specified sort option.
// The sorting can be done by date updated (ascending/descending), date created (ascending/descending),
// file name (A-Z/Z-A), file size (ascending/descending), or file type. For date created sorting,
// modification time is currently used as a fallback since creation time is not available.
func SortNotes(notes []os.DirEntry, sortOption string) {
	sort.Slice(notes, func(i, j int) bool {
		switch sortOption {
		case DateUpdatedDesc:
			infoI, _ := notes[i].Info()
			infoJ, _ := notes[j].Info()
			return infoI.ModTime().After(infoJ.ModTime())
		case DateUpdatedAsc:
			infoI, _ := notes[i].Info()
			infoJ, _ := notes[j].Info()
			return infoI.ModTime().Before(infoJ.ModTime())
		// TODO: CreatedDate is not correct as the file info does not have this information. Will need to do some frontmatter parsing
		case DateCreatedDesc:
			infoI, _ := notes[i].Info()
			infoJ, _ := notes[j].Info()
			return infoI.ModTime().After(infoJ.ModTime()) // Note: Creation time might not be available, use ModTime as fallback
		case DateCreatedAsc:
			infoI, _ := notes[i].Info()
			infoJ, _ := notes[j].Info()
			return infoI.ModTime().Before(infoJ.ModTime()) // Note: Creation time might not be available, use ModTime as fallback
		case FileNameAZ:
			return strings.ToLower(notes[i].Name()) < strings.ToLower(notes[j].Name())
		case FileNameZA:
			return strings.ToLower(notes[i].Name()) > strings.ToLower(notes[j].Name())
		case SizeDesc:
			infoI, _ := notes[i].Info()
			infoJ, _ := notes[j].Info()
			return infoI.Size() > infoJ.Size()
		case SizeAsc:
			infoI, _ := notes[i].Info()
			infoJ, _ := notes[j].Info()
			return infoI.Size() < infoJ.Size()
		case FileType:
			extI := filepath.Ext(notes[i].Name())
			extJ := filepath.Ext(notes[j].Name())
			if extI == extJ {
				return strings.ToLower(notes[i].Name()) < strings.ToLower(notes[j].Name())
			}
			return extI < extJ
		default:
			return false
		}
	})
}
