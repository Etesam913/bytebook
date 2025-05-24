package notes

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// frontendFileInfo contains information about a file formatted for frontend use
type frontendFileInfo struct {
	URL       string // Frontend-friendly URL (e.g., "path/to/file?ext=jpg")
	FileName  string // File name without extension
	Directory string // File directory with trailing slash
	Extension string // File extension without the dot (e.g., "jpg")
}

// ConvertFileNameForFrontendUrl converts a file path to a frontend-friendly format.
// It parses the file path to extract directory, filename, and extension information.
// Returns a FrontendFileInfo struct with the parsed information or an error if the path is invalid.
func ConvertFileNameForFrontendUrl(pathToFile string) (frontendFileInfo, error) {
	// Validate input
	if len(strings.TrimSpace(pathToFile)) == 0 {
		return frontendFileInfo{}, errors.New("empty pathToFile")
	}

	// Get file directory and file name with extension
	fileDir := filepath.Dir(pathToFile)
	fileNameWithExtension := filepath.Base(pathToFile)

	// Check for a valid file name
	if len(fileNameWithExtension) == 0 || fileNameWithExtension == "." || strings.HasPrefix(fileNameWithExtension, ".") {
		return frontendFileInfo{}, errors.New("invalid file name")
	}

	// Extract the file extension
	fileExtension := filepath.Ext(fileNameWithExtension)
	if len(strings.TrimSpace(fileExtension)) == 0 {
		return frontendFileInfo{}, errors.New("invalid file extension")
	}

	// Remove the file extension from the file name
	fileNameWithoutExtension := fileNameWithExtension[:len(fileNameWithExtension)-len(fileExtension)]
	if len(strings.TrimSpace(fileNameWithoutExtension)) == 0 {
		return frontendFileInfo{}, errors.New("invalid file name")
	}

	// Ensure the file directory ends with a '/'
	if fileDir == "." {
		fileDir = "" // current directory
	} else if len(fileDir) > 0 && fileDir[len(fileDir)-1] != '/' {
		fileDir += "/"
	}

	// Create the frontend-friendly URL
	frontendUrl := fileDir + fileNameWithoutExtension + "?ext=" + fileExtension[1:]

	return frontendFileInfo{
		URL:       frontendUrl,
		FileName:  fileNameWithoutExtension,
		Directory: fileDir,
		Extension: fileExtension[1:], // exclude the dot
	}, nil
}

// NoteMetadata holds extracted information from a note file.
type NoteMetadata struct {
	FirstLine     string
	FirstImageSrc string
	Size          int64
	LastUpdated   string // RFC3339 format
}

// ProcessNoteContent extracts metadata from a note file.
// It attempts to get file stats (size, last updated).
// For markdown files, it also attempts to read content to extract the first line and first image.
// An error is returned *only* if reading the content of a markdown file fails.
// Errors from os.Stat will result in zero values for Size and an empty string for LastUpdated,
// but no error will be returned from this function for os.Stat failures.
func ProcessNoteContent(fullPath string) (metadata NoteMetadata, contentReadError error) {
	fileExtension := filepath.Ext(fullPath)

	fileInfo, statErr := os.Stat(fullPath)
	if statErr == nil {
		metadata.Size = fileInfo.Size()
		metadata.LastUpdated = fileInfo.ModTime().Format(time.RFC3339)
	}
	// If statErr != nil, metadata.Size will be 0 and metadata.LastUpdated will be ""

	if fileExtension == ".md" {
		noteContent, readErr := os.ReadFile(fullPath)
		if readErr != nil {
			// Return metadata (possibly with Size/LastUpdated if os.Stat succeeded) and the readErr.
			return metadata, readErr
		}
		metadata.FirstLine = GetFirstLineFromMarkdown(string(noteContent))
		metadata.FirstImageSrc = GetFirstImageSrcFromMarkdown(string(noteContent))
	}

	// No error means markdown content (if applicable) was processed successfully,
	// or it wasn't a markdown file. os.Stat errors are reflected in zero-values in metadata.
	return metadata, nil
}
