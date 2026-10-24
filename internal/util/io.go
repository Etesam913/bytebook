package util

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
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
	within, err := isWithin(base, joined)
	if err != nil {
		return "", fmt.Errorf("invalid path %q: %w", relPath, err)
	}
	if !within {
		return "", fmt.Errorf("path %q escapes base directory", relPath)
	}
	return joined, nil
}

// isWithin checks lexical containment; it does not resolve symlinks.
func isWithin(base, path string) (bool, error) {
	relative, err := filepath.Rel(filepath.Clean(base), path)
	if err != nil {
		return false, err
	}
	return relative != ".." && !strings.HasPrefix(relative, ".."+string(filepath.Separator)), nil
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

// DestinationCollides reports whether newPath exists on disk and points to a
// distinct item from oldPath (i.e. not a case-only rename of the same item on a
// case-insensitive filesystem).
func DestinationCollides(oldPath, newPath string) (bool, error) {
	oldInfo, err := os.Stat(oldPath)
	if err != nil {
		return false, err
	}
	newInfo, err := os.Stat(newPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return false, nil
		}
		return false, err
	}
	return !os.SameFile(oldInfo, newInfo), nil
}

// ExactPathExists reports whether a file or directory exists at path with the
// exact casing on disk (preventing false positives on case-insensitive filesystems).
func ExactPathExists(path string) bool {
	if _, err := os.Lstat(path); err != nil {
		return false
	}

	dir := filepath.Dir(path)
	base := filepath.Base(path)
	if dir == path || base == "." || base == "/" {
		return true
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return false
	}

	for _, entry := range entries {
		if entry.Name() == base {
			return true
		}
	}

	return false
}

// DedupeDescendantPaths returns a copy of paths with duplicates and
// descendants of other paths removed. Paths are sorted shallowest-first (then
// alphabetically) so that when two entries are in an ancestor/descendant
// relationship only the ancestor is kept.
//
// Use this whenever an operation applied to a folder implicitly covers
// everything inside it (e.g. moving or trashing a folder also moves/trashes
// its children) and we need to avoid re-operating on descendants — which
// would otherwise fail because the original path no longer exists.
func DedupeDescendantPaths(paths []string) []string {
	sortedPaths := append([]string(nil), paths...)
	slices.SortFunc(sortedPaths, func(a, b string) int {
		aDepth := strings.Count(strings.TrimSuffix(a, "/"), "/")
		bDepth := strings.Count(strings.TrimSuffix(b, "/"), "/")
		if aDepth != bDepth {
			return aDepth - bDepth
		}
		return strings.Compare(a, b)
	})

	normalized := make([]string, 0, len(sortedPaths))
	for _, path := range sortedPaths {
		candidatePath := strings.TrimSuffix(path, "/")
		shouldSkip := false
		for _, keptPath := range normalized {
			parentPath := strings.TrimSuffix(keptPath, "/")
			if candidatePath == parentPath || strings.HasPrefix(candidatePath, parentPath+"/") {
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

var (
	whitespaceRegex   = regexp.MustCompile(`\s+`)
	problemCharsRegex = regexp.MustCompile(`[<>:"/\\|?*\x00-\x08\x0B\x0C\x0E-\x1f\x7f]`)
)

// CleanFileNamePreserveUnicode provides a less restrictive alternative that preserves
// more characters while still ensuring cross-platform compatibility.
// Allows Unicode letters, digits, spaces, parentheses, brackets, and common punctuation.
func CleanFileName(name string) string {
	// 1) Normalize Unicode
	name = norm.NFC.String(name)

	// 2) Replace whitespace characters (including tabs, newlines) with spaces
	name = whitespaceRegex.ReplaceAllString(name, " ")

	// 3) Remove problematic filesystem characters and non-printable control chars
	// Keep spaces (handled above), Unicode letters/digits, and common punctuation
	name = problemCharsRegex.ReplaceAllString(name, "")

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

// Powers the reveal in finder option in the context menu
func RevealInFinder(fileOrDir string) error {
	// Check if the directory exists
	if _, err := exec.LookPath("open"); err != nil {
		return fmt.Errorf("failed to open directory %s: %w", fileOrDir, err)
	}

	// Run the open command with or without -R based on if fileOrDir is a directory
	args := []string{"-R", fileOrDir}

	cmd := exec.Command("open", args...)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to open directory %s: %w", fileOrDir, err)
	}
	return nil
}
