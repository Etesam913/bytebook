package list_helpers

import (
	"fmt"
	"io/fs"
	"path/filepath"
	"slices"
	"strings"
	"time"
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

// Map applies the function fn to each element in the slice and returns a new slice of type U.
func Map[T any, U any](slice []T, fn func(T) U) []U {
	result := make([]U, len(slice))
	for i, v := range slice {
		result[i] = fn(v)
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

// SortNotes sorts a slice of fs.DirEntry objects based on the specified sort option.
func SortNotes(notes []fs.DirEntry, sortOption string) {
	slices.SortFunc(notes, func(a, b fs.DirEntry) int {
		infoA, _ := a.Info()
		infoB, _ := b.Info()

		switch sortOption {
		case DateUpdatedDesc:
			if infoA.ModTime().After(infoB.ModTime()) {
				return -1
			} else if infoA.ModTime().Before(infoB.ModTime()) {
				return 1
			}
			return 0
		case DateUpdatedAsc:
			if infoA.ModTime().Before(infoB.ModTime()) {
				return -1
			} else if infoA.ModTime().After(infoB.ModTime()) {
				return 1
			}
			return 0
		case FileNameAZ:
			return strings.Compare(strings.ToLower(a.Name()), strings.ToLower(b.Name()))
		case FileNameZA:
			return -strings.Compare(strings.ToLower(a.Name()), strings.ToLower(b.Name()))
		case SizeDesc:
			if infoA.Size() > infoB.Size() {
				return -1
			} else if infoA.Size() < infoB.Size() {
				return 1
			}
			return 0
		case SizeAsc:
			if infoA.Size() < infoB.Size() {
				return -1
			} else if infoA.Size() > infoB.Size() {
				return 1
			}
			return 0
		case FileType:
			extA := filepath.Ext(a.Name())
			extB := filepath.Ext(b.Name())
			if extA == extB {
				return strings.Compare(strings.ToLower(a.Name()), strings.ToLower(b.Name()))
			}
			return strings.Compare(extA, extB)
		default:
			return 0
		}
	})
}

// NoteWithFolder holds the folder name and file information
type NoteWithFolder struct {
	Folder  string
	Name    string
	ModTime time.Time
	Size    int64
	Ext     string
}

func SortNotesWithFolders(notes []NoteWithFolder, sortOption string) {
	slices.SortFunc(notes, func(a, b NoteWithFolder) int {
		switch sortOption {
		case DateUpdatedDesc:
			if a.ModTime.After(b.ModTime) {
				return -1
			} else if a.ModTime.Before(b.ModTime) {
				return 1
			}
			return 0
		case DateUpdatedAsc:
			if a.ModTime.Before(b.ModTime) {
				return -1
			} else if a.ModTime.After(b.ModTime) {
				return 1
			}
			return 0
		case FileNameAZ:
			return strings.Compare(strings.ToLower(a.Name), strings.ToLower(b.Name))
		case FileNameZA:
			return -strings.Compare(strings.ToLower(a.Name), strings.ToLower(b.Name))
		case SizeDesc:
			if a.Size > b.Size {
				return -1
			} else if a.Size < b.Size {
				return 1
			}
			return 0
		case SizeAsc:
			if a.Size < b.Size {
				return -1
			} else if a.Size > b.Size {
				return 1
			}
			return 0
		case FileType:
			if a.Ext == b.Ext {
				return strings.Compare(strings.ToLower(a.Name), strings.ToLower(b.Name))
			}
			return strings.Compare(a.Ext, b.Ext)
		default:
			return 0
		}
	})
}
