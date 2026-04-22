package util

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"regexp"
	"runtime"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

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
	jsonData, err := json.MarshalIndent(data, "", "    ")
	if err != nil {
		return err
	}

	// Write to a temp file in the same directory, then atomically rename.
	// This prevents corruption if the app crashes mid-write, and ensures
	// file watchers never see a partially-written file.
	dir := filepath.Dir(pathname)
	tmpFile, err := os.CreateTemp(dir, ".tmp-*")
	if err != nil {
		return err
	}
	tmpPath := tmpFile.Name()

	// Clean up the temp file on any failure after this point.
	success := false
	defer func() {
		if !success {
			os.Remove(tmpPath)
		}
	}()

	if _, err := tmpFile.Write(jsonData); err != nil {
		tmpFile.Close()
		return err
	}
	if err := tmpFile.Sync(); err != nil {
		tmpFile.Close()
		return err
	}
	if err := tmpFile.Close(); err != nil {
		return err
	}

	if err := os.Rename(tmpPath, pathname); err != nil {
		return err
	}

	success = true
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

// ReadOrCreateJSON attempts to read a JSON file from the given path. If the file doesn't exist,
// it creates the necessary directories and writes the default value as JSON. If the file exists
// but contains invalid JSON, it returns an error.
//
// Parameters:
//   - filePath: The path where the JSON file should be read from or created
//   - defaultValue: The value to write if the file doesn't exist
//
// Returns:
//   - The read value if successful, or the default value if the file was created
//   - An error if the operation fails
func ReadOrCreateJSON[T any](filePath string, defaultValue T) (T, error) {
	var value T

	// 1) Does the file exist at all?
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		// directory creation, then write default
		if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
			return defaultValue, fmt.Errorf("couldn't mkdir: %w", err)
		}
		if err := WriteJsonToPath(filePath, defaultValue); err != nil {
			return defaultValue, fmt.Errorf("couldn't write default JSON: %w", err)
		}
		return defaultValue, nil
	} else if err != nil {
		// some other Stat error (permissions?), bubble it up
		return defaultValue, fmt.Errorf("stat error: %w", err)
	}

	// 2) File is there—try to load it.  If this fails, return the error
	if err := ReadJsonFromPath(filePath, &value); err != nil {
		return value, fmt.Errorf("invalid JSON or read error: %w", err)
	}
	return value, nil
}

// SafeJoin joins base with relPath and verifies the result stays within base.
// Returns an error if relPath escapes base (via "..", absolute paths, etc.).
// Containment is checked lexically after cleaning; callers should resolve
// symlinks beforehand if they need symlink-aware containment.
func SafeJoin(base, relPath string) (string, error) {
	joined := filepath.Join(base, relPath)
	rel, err := filepath.Rel(filepath.Clean(base), joined)
	if err != nil {
		return "", fmt.Errorf("invalid path %q: %w", relPath, err)
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("path %q escapes base directory", relPath)
	}
	return joined, nil
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

// IsDirectory reports whether path exists and is a directory.
func IsDirectory(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}

	return info.IsDir()
}

func normalizeTrashSelections(paths []string) []string {
	sortedPaths := append([]string(nil), paths...)
	slices.SortFunc(sortedPaths, func(a, b string) int {
		aDepth := strings.Count(a, "/")
		bDepth := strings.Count(b, "/")
		if aDepth != bDepth {
			return aDepth - bDepth
		}
		return strings.Compare(a, b)
	})

	normalized := make([]string, 0, len(sortedPaths))
	for _, path := range sortedPaths {
		shouldSkip := false
		for _, keptPath := range normalized {
			if path == keptPath || strings.HasPrefix(path, keptPath+"/") {
				shouldSkip = true
				break
			}
		}
		if shouldSkip {
			continue
		}
		normalized = append(normalized, path)
	}

	return normalized
}

type TrashRestoreInfo struct {
	OriginalPath string `json:"originalPath"`
	TrashedPath  string `json:"trashedPath"`
	IsFolder     bool   `json:"isFolder"`
}

func resolveTrashDir(homeDir string) string {
	if override := os.Getenv("BYTEBOOK_TRASH_DIR"); override != "" {
		return override
	}
	return filepath.Join(homeDir, ".Trash")
}

// MoveToTrash moves the file or directory at src to the user's home trash directory.
// On macOS it first tries FSPathMoveObjectToTrashSync to preserve Finder metadata;
// on failure or Linux it falls back to the FreeDesktop spec or ~/.Trash rename.
// The returned metadata is used to support app-level undo.
func MoveToTrash(src string) (TrashRestoreInfo, error) {
	fileInfo, err := os.Stat(src)
	if err != nil {
		return TrashRestoreInfo{}, fmt.Errorf("could not stat source before moving to trash: %w", err)
	}

	usr, err := user.Current()
	if err != nil {
		return TrashRestoreInfo{}, fmt.Errorf("could not get current user: %w", err)
	}

	// Ensure absolute path for metadata accuracy
	srcAbs, err := filepath.Abs(src)
	if err == nil {
		src = srcAbs
	}

	restoreInfo := TrashRestoreInfo{
		OriginalPath: src,
		IsFolder:     fileInfo.IsDir(),
	}

	if runtime.GOOS == "darwin" {
		if os.Getenv("BYTEBOOK_TRASH_DIR") == "" {
			// Try CoreServices API for full Finder compatibility when no test override is set.
			if trashedPath, ok := moveToTrashDarwin(src); ok {
				restoreInfo.TrashedPath = trashedPath
				return restoreInfo, nil
			}
		}
		// Fallback to manual rename
		trashDir := resolveTrashDir(usr.HomeDir)
		if err := os.MkdirAll(trashDir, 0755); err != nil {
			return TrashRestoreInfo{}, fmt.Errorf("could not create macOS trash directory: %w", err)
		}
		name := filepath.Base(src)
		timestamp := time.Now().Format("20060102T150405")
		trashedName := fmt.Sprintf("%s_%s", timestamp, name)
		dest := filepath.Join(trashDir, trashedName)

		if err := os.Rename(src, dest); err != nil {
			return TrashRestoreInfo{}, fmt.Errorf("could not move file to macOS trash fallback: %w", err)
		}
		restoreInfo.TrashedPath = dest
		return restoreInfo, nil
	}

	// Linux & others: use XDG Trash spec
	dataHome := os.Getenv("XDG_DATA_HOME")
	if dataHome == "" {
		dataHome = filepath.Join(usr.HomeDir, ".local", "share")
	}
	trashBase := filepath.Join(dataHome, "Trash")
	filesDir := filepath.Join(trashBase, "files")
	infoDir := filepath.Join(trashBase, "info")

	for _, d := range []string{filesDir, infoDir} {
		if err := os.MkdirAll(d, 0755); err != nil {
			return TrashRestoreInfo{}, fmt.Errorf("could not create trash directory %s: %w", d, err)
		}
	}

	name := filepath.Base(src)
	timestamp := time.Now().Format("20060102T150405")
	trashedName := fmt.Sprintf("%s_%s", timestamp, name)
	dest := filepath.Join(filesDir, trashedName)

	if err := os.Rename(src, dest); err != nil {
		return TrashRestoreInfo{}, fmt.Errorf("could not move file to trash: %w", err)
	}

	infoPath := filepath.Join(infoDir, trashedName+".trashinfo")
	info := fmt.Sprintf("[Trash Info]\nPath=%s\nDeletionDate=%s\n", src, time.Now().Format(time.RFC3339))
	if err := os.WriteFile(infoPath, []byte(info), 0644); err != nil {
		return TrashRestoreInfo{}, fmt.Errorf("could not write trashinfo file: %w", err)
	}

	restoreInfo.TrashedPath = dest
	return restoreInfo, nil
}

// CleanFileNamePreserveUnicode provides a less restrictive alternative that preserves
// more characters while still ensuring cross-platform compatibility.
// Allows Unicode letters, digits, spaces, parentheses, brackets, and common punctuation.
func CleanFileName(name string) string {
	// 1) Normalize Unicode
	name = norm.NFC.String(name)

	// 2) Replace whitespace characters (including tabs, newlines) with spaces
	whitespace := regexp.MustCompile(`\s+`)
	name = whitespace.ReplaceAllString(name, " ")

	// 3) Remove problematic filesystem characters and non-printable control chars
	// Keep spaces (handled above), Unicode letters/digits, and common punctuation
	problemChars := regexp.MustCompile(`[<>:"/\\|?*\x00-\x08\x0B\x0C\x0E-\x1f\x7f]`)
	name = problemChars.ReplaceAllString(name, "")

	// 4) Trim leading/trailing spaces and dots
	name = strings.Trim(name, " .")

	// 5) Avoid Windows reserved filenames
	baseName := strings.Split(name, ".")[0] // Get name before first dot
	upper := strings.ToUpper(baseName)
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

	// 6) Truncate to 255 bytes without cutting UTF-8 codepoints
	const maxFilenameBytes = 255
	if len(name) > maxFilenameBytes {
		cutoff := maxFilenameBytes
		for cutoff > 0 && !utf8.ValidString(name[:cutoff]) {
			cutoff--
		}
		name = name[:cutoff]
	}

	// 7) Fallback for empty string
	if name == "" {
		return "file"
	}
	return name
}

// MoveNotesToTrash moves the given notes (and folders) into the system trash.
// It returns restore metadata for app-level undo when all moves succeed.
func MoveNotesToTrash(projectPath string, folderAndNotes []string) ([]TrashRestoreInfo, error) {
	var failed []string
	normalizedPaths := normalizeTrashSelections(folderAndNotes)
	restoreItems := make([]TrashRestoreInfo, 0, len(normalizedPaths))

	// Attempt to move each note/folder to trash
	for _, relPath := range normalizedPaths {
		parts := strings.Split(relPath, "/")
		_, fileName, _ := Pop(parts)
		fullPath := filepath.Join(projectPath, "notes", relPath)

		restoreInfo, err := MoveToTrash(fullPath)
		if err != nil {
			failed = append(failed, fileName)
			continue
		}
		restoreItems = append(restoreItems, restoreInfo)
	}

	// // Update pinned-notes in settings.json if present (ignore errors here)
	// settingsPath := filepath.Join(projectPath, "settings", "settings.json")
	// var cfg config.ProjectSettingsJson
	// if err := ReadJsonFromPath(settingsPath, &cfg); err == nil {
	// 	cfg.PinnedNotes = GetValidPinned(projectPath, cfg)
	// 	_ = WriteJsonToPath(settingsPath, cfg)
	// }

	// Return a combined error if any moves failed
	if len(failed) > 0 {
		return nil, fmt.Errorf(
			"could not move %s to trash",
			strings.Join(failed, ", "),
		)
	}

	return restoreItems, nil
}

// RestoreNotesFromTrash restores trashed note and folder paths back into the current project's notes directory.
func RestoreNotesFromTrash(projectPath string, restoreItems []TrashRestoreInfo) error {
	if runtime.GOOS != "darwin" {
		return fmt.Errorf("trash restore is only supported on macOS")
	}

	notesPath := filepath.Join(projectPath, "notes")
	for _, restoreItem := range restoreItems {
		relativePath, err := filepath.Rel(notesPath, restoreItem.OriginalPath)
		if err != nil {
			return fmt.Errorf("could not validate restore path: %w", err)
		}
		if relativePath == ".." || strings.HasPrefix(relativePath, ".."+string(filepath.Separator)) {
			return fmt.Errorf("restore path must stay inside the notes directory")
		}
		if filepath.IsAbs(relativePath) {
			return fmt.Errorf("restore path must stay inside the notes directory")
		}

		if err := restoreToTrashDarwin(restoreItem.TrashedPath, restoreItem.OriginalPath); err != nil {
			return err
		}
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
