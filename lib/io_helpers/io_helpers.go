package io_helpers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/etesam913/bytebook/lib/list_helpers"
	"github.com/etesam913/bytebook/lib/project_types"
)

// WriteJsonToPath writes the provided data as a JSON file at the specified pathname.
// Parameters:
//
//	pathname: The file path where the JSON data will be written.
//	data: The data to be serialized to JSON and written to the file.
//
// Returns:
//
//	An error if any step of the process fails, otherwise nil.
func WriteJsonToPath(pathname string, data interface{}) error {
	// MarshalIndent converts the data to a pretty-printed JSON format.
	jsonData, err := json.MarshalIndent(data, "", "    ")
	if err != nil {
		return err
	}

	// Create the file at the given pathname.
	file, err := os.Create(pathname)
	if err != nil {
		return err
	}
	// Ensure the file is closed when the function exits.
	defer file.Close()

	// Write the JSON data to the file.
	_, err = file.Write(jsonData)
	if err != nil {
		return err
	}

	return nil
}

// ReadJsonFromPath reads JSON data from the specified pathname and unmarshals it into the provided data structure.
// Parameters:
//
//	pathname: The file path from which the JSON data will be read.
//	data: The data structure where the JSON data will be unmarshaled.
//
// Returns:
//
//	An error if any step of the process fails, otherwise nil.
func ReadJsonFromPath(pathname string, data interface{}) error {
	// Open the file at the given pathname.
	file, err := os.Open(pathname)
	if err != nil {
		return err
	}
	// Ensure the file is closed when the function exits.
	defer file.Close()

	// Read all data from the file.
	byteValue, err := io.ReadAll(file)
	if err != nil {
		return err
	}

	// Unmarshal the JSON data into the provided data structure.
	err = json.Unmarshal(byteValue, data)
	if err != nil {
		return err
	}

	return nil
}

type ActionStruct struct {
	WindowsAction func()
	MacAction     func()
	LinuxAction   func()
}

func CompleteCustomActionForOS(action ActionStruct) error {
	var err error = nil
	switch os := runtime.GOOS; os {
	case "windows":
		action.WindowsAction()
	case "darwin":
		action.MacAction()
	case "linux":
		action.LinuxAction()
	default:
		// Fallback for other OS or as a default (can also decide to return an error instead)
		err = errors.New("unsupported os")
	}
	return err
}

type CopyFileErr struct {
	Err         error
	IsDstExists bool
}

// CopyFile copies a file from src to dst. If dst does not exist, it will be created.
// If dst exists, it will be overwritten.
func CopyFile(src, dst string, shouldOverride bool) CopyFileErr {
	// Open the source file for reading.
	sourceFile, err := os.Open(src)
	if err != nil {
		return CopyFileErr{Err: err, IsDstExists: false}
	}
	defer sourceFile.Close()

	doesDstExist, err := FileOrFolderExists(dst)
	if err != nil {
		return CopyFileErr{Err: err, IsDstExists: false}
	}
	if doesDstExist && !shouldOverride {
		pathSegments := strings.Split(dst, "/")
		return CopyFileErr{
			Err: fmt.Errorf(
				fmt.Sprintf("%s already exists", pathSegments[len(pathSegments)-1])),
			IsDstExists: true,
		}
	}

	// Create the destination file for writing. Use os.Create to create or truncate it before writing.
	destinationFile, err := os.Create(dst)
	if err != nil {
		return CopyFileErr{Err: err, IsDstExists: false}
	}
	defer destinationFile.Close()

	// Copy the contents of the source file to the destination file.
	_, err = io.Copy(destinationFile, sourceFile)
	if err != nil {
		return CopyFileErr{Err: err, IsDstExists: false}
	}

	// Ensure that any writes to the destination file are committed to stable storage.
	err = destinationFile.Sync()
	return CopyFileErr{Err: err, IsDstExists: false}
}

// cleanFileName removes unsafe characters and trims spaces from a filename.
func CleanFileName(filename string) string {
	// Define a regular expression for characters you want to remove

	// Replace those characters with an empty string

	// Trim leading and trailing spaces
	cleaned := strings.ReplaceAll(filename, " ", "_")
	cleaned = strings.ReplaceAll(cleaned, ":", "_")
	cleaned = strings.ReplaceAll(cleaned, "/", "_")
	cleaned = strings.ReplaceAll(cleaned, "\\", "_")
	cleaned = strings.ReplaceAll(cleaned, "*", "_")
	cleaned = strings.ReplaceAll(cleaned, "?", "_")
	cleaned = strings.ReplaceAll(cleaned, "\"", "_")
	cleaned = strings.ReplaceAll(cleaned, "<", "_")
	cleaned = strings.ReplaceAll(cleaned, ">", "_")
	cleaned = strings.ReplaceAll(cleaned, "|", "_")
	cleaned = strings.ReplaceAll(cleaned, "[", "_")
	cleaned = strings.ReplaceAll(cleaned, "]", "_")
	cleaned = strings.ReplaceAll(cleaned, "(", "_")
	cleaned = strings.ReplaceAll(cleaned, ")", "_")
	cleaned = strings.ReplaceAll(cleaned, "_", "")

	// Further modifications could include truncating the filename if it's too long,
	// ensuring it does not start with a dot if hidden files are a concern, etc.
	return cleaned
}

/*
FileOrFolderExists checks if a file or folder exists at the specified path.
Parameters:

	path: The path to the file or folder.

Returns:

	A boolean indicating whether the file or folder exists, and an error if the check fails.
*/
func FileOrFolderExists(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

type MostRecentNoteResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func MoveNotesToTrash(projectPath string, folderAndNotes []string) MostRecentNoteResponse {
	errors := []string{} // Slice to store any errors encountered during the process.

	// Iterate over each path in the provided folderAndNotes slice.
	for _, path := range folderAndNotes {
		// Split the path into parts using "/" as the delimiter.
		pathParts := strings.Split(path, "/")

		// Extract the filename from the path using a helper function.
		_, fileName, _ := list_helpers.Pop(pathParts)

		// Construct the full path of the file to be moved.
		fullPath := filepath.Join(projectPath, "notes", path)
		fullNewPath := filepath.Join(projectPath, "trash", fileName)

		// Attempt to move the file to the trash directory.
		err := MoveFile(fullPath, fullNewPath)
		if err != nil {
			// If an error occurs, add the filename to the errors slice.
			errors = append(errors, fileName)
		}
	}

	// Update the project settings to remove the moved notes from the pinned notes list if they are pinned
	var projectSettings project_types.ProjectSettingsJson
	projectSettingsPath := filepath.Join(projectPath, "settings", "settings.json")
	err := ReadJsonFromPath(projectSettingsPath, &projectSettings)
	if err == nil {
		validPinnedNotes := GetValidPinnedNotes(projectPath, projectSettings)
		projectSettings.PinnedNotes = validPinnedNotes
		WriteJsonToPath(projectSettingsPath, projectSettings)
	}

	// If any errors were encountered, return a failure response with the list of errors.
	if len(errors) > 0 {
		return MostRecentNoteResponse{
			Success: false,
			Message: fmt.Sprintf("Could not move %s to trash", strings.Join(errors, ", ")),
		}
	}

	// If no errors were encountered, return a success response.
	return MostRecentNoteResponse{
		Success: true,
		Message: "Successfully moved to trash",
	}
}

// CreateFolderIfNotExist creates a folder at the specified pathname if it does not already exist.
// Parameters:
//
//	pathname: The path where the folder should be created.
//
// Returns:
//
//	An error if the creation process fails, otherwise nil.
func CreateFolderIfNotExist(pathname string) error {
	// Check if the folder already exists.
	if _, err := os.Stat(pathname); os.IsNotExist(err) {
		// If the folder does not exist, create it.
		err := os.Mkdir(pathname, os.ModePerm)
		if err != nil {
			return err
		}
	}
	// If the folder already exists, do nothing.
	return nil
}

/*
GetValidPinnedNotes returns a list of valid pinned notes.
It checks if the pinned note exists in the notes folder and returns all of the pinned notes that exist.
*/
func GetValidPinnedNotes(projectPath string, projectSettings project_types.ProjectSettingsJson) []string {
	validPinnedNotes := []string{}
	for _, pinnedNote := range projectSettings.PinnedNotes {
		pathToPinnedNote := filepath.Join(projectPath, "notes", pinnedNote)
		pathExists, _ := FileOrFolderExists(pathToPinnedNote)
		if pathExists {
			validPinnedNotes = append(validPinnedNotes, pinnedNote)
		}
	}
	return validPinnedNotes
}

// MoveFile moves a file from srcPath to dstPath. If a file with the same name already exists at the destination,
// it appends a number to the filename to make it unique.
// Parameters:
//
//	srcPath: The source path of the file to be moved.
//	dstPath: The destination path where the file should be moved.
//
// Returns:
//
//	An error if the move process fails, otherwise nil.
func MoveFile(srcPath, dstPath string) error {
	// Get the directory and filename of the destination path
	dstDir := filepath.Dir(dstPath)
	dstBase := filepath.Base(dstPath)

	// Separate the filename and extension
	dstExt := filepath.Ext(dstBase)
	dstName := strings.TrimSuffix(dstBase, dstExt)

	// Create a unique destination path if a file with the same name already exists
	uniqueDstPath := dstPath
	counter := 1
	for {
		if _, err := os.Stat(uniqueDstPath); os.IsNotExist(err) {
			break
		}
		uniqueDstPath = filepath.Join(dstDir, fmt.Sprintf("%s-%d%s", dstName, counter, dstExt))
		counter++
	}

	// Move the file to the unique destination path
	err := os.Rename(srcPath, uniqueDstPath)
	if err != nil {
		return err
	}

	return nil
}

// CreateUniqueNameForFileIfExists Updates the name of the file until a unique name is found
func CreateUniqueNameForFileIfExists(filePath string) (string, error) {
	doesFileExist, err := FileOrFolderExists(filePath)
	if err != nil {
		return "", err
	}
	if !doesFileExist {
		return filePath, nil
	}

	dir, file := filepath.Split(filePath)
	ext := filepath.Ext(file)
	base := strings.TrimSuffix(file, ext)

	i := 1

	newFilePath := filepath.Join(dir, fmt.Sprintf("%s %d%s", base, i, ext))
	doesFileExist, err = FileOrFolderExists(newFilePath)
	if err != nil {
		return "", err
	}
	for doesFileExist {
		i++
		newFilePath = filepath.Join(dir, fmt.Sprintf("%s %d%s", base, i, ext))
		doesFileExist, err = FileOrFolderExists(newFilePath)
		if err != nil {
			return "", err
		}
	}

	return newFilePath, nil
}

func CountFilesInDirectory(folderPath string) (int, error) {
	dir, err := os.Open(folderPath)
	if err != nil {
		return 0, err
	}
	defer dir.Close()

	fileNames, err := dir.Readdirnames(-1)
	if err != nil {
		return 0, err
	}

	return len(fileNames), nil
}

// Powers the reveal in finder option in the context menu
func RevealInFinder(fileOrDir string) error {
	// Check if the directory exists
	if _, err := exec.LookPath("open"); err != nil {
		return fmt.Errorf("failed to open directory: %v", fileOrDir)
	}

	// Determine if fileOrDir is a directory
	info, err := os.Stat(fileOrDir)
	if err != nil {
		return fmt.Errorf("failed to stat file or directory: %v", fileOrDir)
	}
	// Run the open command with or without -R based on if fileOrDir is a directory
	var args []string
	if info.IsDir() {
		args = []string{"-R", fileOrDir}
	} else {
		args = []string{"-R", fileOrDir}
	}

	cmd := exec.Command("open", args...)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to open directory: %v", fileOrDir)
	}
	return nil
}
