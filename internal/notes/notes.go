package notes

import (
	"errors"
	"path/filepath"
	"strings"
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
