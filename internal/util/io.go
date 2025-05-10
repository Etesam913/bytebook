package util

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/Kei-K23/trashbox"
	"github.com/etesam913/bytebook/lib/project_types"
	"golang.org/x/text/unicode/norm"
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
func WriteJsonToPath(pathname string, data any) error {
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
func ReadJsonFromPath(pathname string, data any) error {
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

// ReadOrCreateJSON takes a file path and a default value.
// If the file doesn't exist, can't be read, or contains invalid JSON,
// it will write the default value to the file and return it.
func ReadOrCreateJSON[T any](filePath string, defaultValue T) (T, error) {
	var value T

	// Try to read the existing file using the helper
	err := ReadJsonFromPath(filePath, &value)
	if err == nil {
		// Successfully read and parsed the file
		return value, nil
	}

	// At this point, either:
	// 1. The file doesn't exist
	// 2. The file exists but couldn't be read
	// 3. The file exists but contains invalid JSON

	// Ensure the directory exists
	dir := filepath.Dir(filePath)
	if err = os.MkdirAll(dir, 0755); err != nil {
		return value, fmt.Errorf("failed to create directory: %w", err)
	}

	// Write the default value to the file using the helper
	if err = WriteJsonToPath(filePath, defaultValue); err != nil {
		return value, fmt.Errorf("failed to write default value to file: %w", err)
	}

	return defaultValue, nil
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

// CleanFileName takes an arbitrary user string and returns a safe filename
// using only letters, digits, dash, underscore, and dot. It enforces max length,
// avoids Windows reserved names, collapses runs of underscores, and trims
// undesirable leading/trailing characters.
func CleanFileName(name string) string {
	// 1) Normalize Unicode
	name = norm.NFC.String(name)

	// 2) Replace any whitespace with single underscore
	ws := regexp.MustCompile(`\s+`)
	name = ws.ReplaceAllString(name, "_")

	// 3) Remove any character that is NOT [A-Za-z0-9-_.]
	valid := regexp.MustCompile(`[^A-Za-z0-9\-\._]+`)
	name = valid.ReplaceAllString(name, "")

	// 4) Collapse multiple underscores into one
	dupUnderscore := regexp.MustCompile(`_+`)
	name = dupUnderscore.ReplaceAllString(name, "_")

	// 5) Trim leading/trailing dots, underscores, and spaces
	name = strings.Trim(name, "._ ")

	// 6) Avoid Windows reserved filenames
	upper := strings.ToUpper(name)
	reserved := map[string]bool{
		"CON": true, "PRN": true, "AUX": true, "NUL": true,
	}
	for i := 1; i <= 9; i++ {
		reserved[fmt.Sprintf("COM%d", i)] = true
		reserved[fmt.Sprintf("LPT%d", i)] = true
	}
	if reserved[upper] {
		name = "_" + name
	}

	// 7) Truncate to 255 bytes without cutting UTF-8 codepoints:
	const maxFilenameBytes = 255
	if len(name) > maxFilenameBytes {
		cutoff := maxFilenameBytes
		for !utf8.ValidString(name[:cutoff]) {
			cutoff--
		}
		name = name[:cutoff]
	}

	// 8) Fallback for empty string
	if name == "" {
		return "file"
	}
	return name
}

// CreateFileIfNotExist creates a file at the specified pathname if it does not already exist.
// Parameters:
//
//	pathname: The path where the file should be created.
//
// Returns:
//
//	An error if the creation process fails, otherwise nil.
func CreateFileIfNotExist(pathname string) error {
	// Check if the file already exists using FileOrFolderExists.
	exists, err := FileOrFolderExists(pathname)
	if err != nil {
		return err
	}
	if !exists {
		// Create the directory structure if it doesn't exist
		dir := filepath.Dir(pathname)
		if err := os.MkdirAll(dir, os.ModePerm); err != nil {
			return err
		}

		// If the file does not exist, create it.
		file, err := os.Create(pathname)
		if err != nil {
			return err
		}
		defer file.Close()
	}
	// If the file already exists, do nothing.
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

// MoveNotesToTrash moves the given notes (and folders) into the system trash.
// Returns an error if any individual move fails, or nil on full success.
func MoveNotesToTrash(projectPath string, folderAndNotes []string) error {
	var failed []string

	// Attempt to move each note/folder to trash
	for _, relPath := range folderAndNotes {
		parts := strings.Split(relPath, "/")
		_, fileName, _ := Pop(parts)
		fullPath := filepath.Join(projectPath, "notes", relPath)

		if err := trashbox.MoveToTrash(fullPath); err != nil {
			failed = append(failed, fileName)
		}
	}

	// Update pinned-notes in settings.json if present (ignore errors here)
	settingsPath := filepath.Join(projectPath, "settings", "settings.json")
	var cfg project_types.ProjectSettingsJson
	if err := ReadJsonFromPath(settingsPath, &cfg); err == nil {
		cfg.PinnedNotes = GetValidPinnedNotes(projectPath, cfg)
		_ = WriteJsonToPath(settingsPath, cfg)
	}

	// Return a combined error if any moves failed
	if len(failed) > 0 {
		return fmt.Errorf(
			"could not move %s to trash",
			strings.Join(failed, ", "),
		)
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

// CopyFile copies a file from src to dst. If dst does not exist, it will be created.
// If dst exists, it will be overwritten only if shouldOverride is true.
func CopyFile(src, dst string, shouldOverride bool) error {
	// Open the source file for reading.
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	doesDstExist, err := FileOrFolderExists(dst)
	if err != nil {
		return err
	}
	if doesDstExist && !shouldOverride {
		pathSegments := strings.Split(dst, "/")
		return fmt.Errorf("%s already exists", pathSegments[len(pathSegments)-1])
	}

	// Create the destination file for writing. Use os.Create to create or truncate it before writing.
	destinationFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destinationFile.Close()

	// Copy the contents of the source file to the destination file.
	_, err = io.Copy(destinationFile, sourceFile)
	if err != nil {
		return err
	}

	// Ensure that any writes to the destination file are committed to stable storage.
	return destinationFile.Sync()
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
	// Create a unique destination path using CreateUniqueNameForFileIfExists
	uniqueDstPath, err := CreateUniqueNameForFileIfExists(dstPath)
	if err != nil {
		return err
	}

	// Move the file to the unique destination path
	err = os.Rename(srcPath, uniqueDstPath)
	if err != nil {
		return err
	}

	return nil
}

// Powers the reveal in finder option in the context menu
func RevealInFinder(fileOrDir string) error {
	// Check if the directory exists
	if _, err := exec.LookPath("open"); err != nil {
		return fmt.Errorf("failed to open directory: %v", fileOrDir)
	}

	// Run the open command with or without -R based on if fileOrDir is a directory
	args := []string{"-R", fileOrDir}

	cmd := exec.Command("open", args...)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to open directory: %v", fileOrDir)
	}
	return nil
}
