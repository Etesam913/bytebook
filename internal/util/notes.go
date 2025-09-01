package util

import (
	"io/fs"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"time"
	"unicode"
)

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

// naturalCompare performs a natural (human-friendly) string comparison
// that treats numbers within strings as numeric values rather than lexicographic.
// This matches macOS Finder sorting behavior.
func naturalCompare(a, b string) int {
	// Convert to lowercase for case-insensitive comparison
	a = strings.ToLower(a)
	b = strings.ToLower(b)

	i, j := 0, 0
	for i < len(a) && j < len(b) {
		// Check if both characters are digits
		if unicode.IsDigit(rune(a[i])) && unicode.IsDigit(rune(b[j])) {
			// Extract numeric parts
			numA, lenA := extractNumber(a[i:])
			numB, lenB := extractNumber(b[j:])

			if numA < numB {
				return -1
			} else if numA > numB {
				return 1
			}

			i += lenA
			j += lenB
		} else {
			// Compare characters normally
			if a[i] < b[j] {
				return -1
			} else if a[i] > b[j] {
				return 1
			}
			i++
			j++
		}
	}

	// Handle different lengths
	if i < len(a) {
		return 1
	} else if j < len(b) {
		return -1
	}
	return 0
}

// extractNumber extracts a number from the beginning of a string
// Returns the numeric value and the length of the number in the string
func extractNumber(s string) (int, int) {
	length := 0
	for length < len(s) && unicode.IsDigit(rune(s[length])) {
		length++
	}

	if length == 0 {
		return 0, 0
	}

	num, _ := strconv.Atoi(s[:length])
	return num, length
}

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
			return naturalCompare(a.Name(), b.Name())
		case FileNameZA:
			return -naturalCompare(a.Name(), b.Name())
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
				return naturalCompare(a.Name(), b.Name())
			}
			return naturalCompare(extA, extB)
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
			return naturalCompare(a.Name, b.Name)
		case FileNameZA:
			return -naturalCompare(a.Name, b.Name)
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
				return naturalCompare(a.Name, b.Name)
			}
			return naturalCompare(a.Ext, b.Ext)
		default:
			return 0
		}
	})
}
