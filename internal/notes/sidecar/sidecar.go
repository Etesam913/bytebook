// Package sidecar manages the JSON metadata file that lives beside every
// project file (note or attachment). Each source file `foo.ext` has a
// companion `.foo.json` that holds tags and any code-execution results.
package sidecar

import (
	"errors"
	"os"
	"path/filepath"
	"strings"

	"github.com/etesam913/bytebook/internal/util"
)

// Data is the JSON payload stored in a sidecar file. The same shape is
// used for markdown notes and attachments alike.
type Data struct {
	Tags        []string     `json:"tags,omitempty"`
	CodeResults *CodeResults `json:"codeResults,omitempty"`
}

// PathFor returns the sidecar path that pairs with filePath.
// Example: "/x/photo.jpg" -> "/x/.photo.json".
func PathFor(filePath string) string {
	dir := filepath.Dir(filePath)
	base := filepath.Base(filePath)
	stem := strings.TrimSuffix(base, filepath.Ext(base))
	return filepath.Join(dir, "."+stem+".json")
}

// PathForFile returns the sidecar path for a project-relative file at notes/<folder>/<fileName>.
func PathForFile(projectPath, folder, fileName string) string {
	return PathFor(filepath.Join(projectPath, "notes", folder, fileName))
}

// IsFileName reports whether fileName matches the `.<base>.json` sidecar pattern.
func IsFileName(fileName string) bool {
	return strings.HasPrefix(fileName, ".") && strings.HasSuffix(fileName, ".json") && len(fileName) > len(".json")+1
}

// NotePathFromPath converts a sidecar path back to its associated `.md` note path.
// Used by the watcher to refresh code-results when a sidecar changes; for non-md
// sidecars the caller will detect the missing note via os.Stat and bail.
func NotePathFromPath(sidecarPath string) string {
	fileName := filepath.Base(sidecarPath)
	if !IsFileName(fileName) {
		return ""
	}
	noteName := strings.TrimSuffix(strings.TrimPrefix(fileName, "."), ".json") + ".md"
	return filepath.Join(filepath.Dir(sidecarPath), noteName)
}

// read parses the sidecar at sidecarPath; returns a zero value if the file is missing.
func read(sidecarPath string) (Data, error) {
	var data Data
	if err := util.ReadJsonFromPath(sidecarPath, &data); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return Data{}, nil
		}
		return Data{}, err
	}
	return data, nil
}

// write serializes data to sidecarPath, creating parent directories as needed.
func write(sidecarPath string, data Data) error {
	if err := os.MkdirAll(filepath.Dir(sidecarPath), 0755); err != nil {
		return err
	}
	return util.WriteJsonToPath(sidecarPath, data)
}

// removeIfExists deletes path if it exists; missing files are not an error.
func removeIfExists(path string) error {
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		return nil
	}
	return os.Remove(path)
}

// Ensure creates an empty sidecar for the file if one does not already exist.
func Ensure(projectPath, folder, fileName string) error {
	sidecarPath := PathForFile(projectPath, folder, fileName)
	if _, err := os.Stat(sidecarPath); err == nil {
		return nil
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return write(sidecarPath, Data{Tags: []string{}})
}

// Delete removes the file's sidecar if it exists.
func Delete(projectPath, folder, fileName string) error {
	return removeIfExists(PathForFile(projectPath, folder, fileName))
}

// Move renames the sidecar so it follows a file rename from oldFilePath to newFilePath.
// No-op when the source sidecar does not exist; errors when a sidecar already exists at the destination.
func Move(oldFilePath, newFilePath string) error {
	oldSidecarPath := PathFor(oldFilePath)
	if _, err := os.Stat(oldSidecarPath); errors.Is(err, os.ErrNotExist) {
		return nil
	} else if err != nil {
		return err
	}

	newSidecarPath := PathFor(newFilePath)
	if _, err := os.Stat(newSidecarPath); err == nil {
		return errors.New("sidecar already exists at destination")
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(newSidecarPath), 0755); err != nil {
		return err
	}
	return os.Rename(oldSidecarPath, newSidecarPath)
}
