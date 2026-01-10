package notes

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

type FileOrFolder struct {
	Id          string   `json:"id"`
	Name        string   `json:"name"`
	Path        string   `json:"path"`
	ParentId    string   `json:"parentId"`
	Type        string   `json:"type"`
	ChildrenIds []string `json:"childrenIds"`
}

// readDirectoryEntries reads entries from a directory and converts them to FileOrFolder objects.
// fullPath is the absolute path to the directory to read.
// pathFormatter is a function that formats the path for each entry (e.g., relative path or absolute path).
func readDirectoryEntries(fullPath string, pathFormatter func(string) string) ([]FileOrFolder, error) {
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return []FileOrFolder{}, err
	}

	items := make([]FileOrFolder, len(entries))
	for i, entry := range entries {
		entryType := "file"
		if entry.IsDir() {
			entryType = "folder"
		}
		items[i] = FileOrFolder{
			Id:          uuid.NewString(),
			Name:        entry.Name(),
			Path:        pathFormatter(entry.Name()),
			Type:        entryType,
			ChildrenIds: []string{},
		}
	}

	return items, nil
}

func GetChildrenOfFolder(projectPath, pathToFolder string) ([]FileOrFolder, error) {
	fullPathToFolder := filepath.Join(projectPath, "notes", pathToFolder)
	fileInfo, err := os.Stat(fullPathToFolder)

	if os.IsNotExist(err) {
		return []FileOrFolder{}, fmt.Errorf("%s does not exist", pathToFolder)
	}

	if err != nil {
		return []FileOrFolder{}, err
	}

	if !fileInfo.IsDir() {
		return []FileOrFolder{}, fmt.Errorf("%s is not a folder, so it does not have children", pathToFolder)
	}

	children, err := readDirectoryEntries(
		fullPathToFolder,
		func(entryName string) string {
			return filepath.Join(pathToFolder, entryName)
		},
	)

	for _, child := range children {
		child.ParentId = filepath.Base(pathToFolder)
	}

	if err != nil {
		return []FileOrFolder{}, fmt.Errorf("Could not read entries in %s", pathToFolder)
	}

	return children, nil
}

func GetTopLevelItems(projectPath string) ([]FileOrFolder, error) {
	pathToRoot := filepath.Join(projectPath, "notes")
	fileInfo, err := os.Stat(pathToRoot)
	if err != nil {
		return []FileOrFolder{}, fmt.Errorf("failed to read %s", pathToRoot)
	}

	if !fileInfo.IsDir() {
		return []FileOrFolder{}, fmt.Errorf("%s is not a directory", pathToRoot)
	}

	topLevelItems, err := readDirectoryEntries(
		pathToRoot,
		func(entryName string) string {
			return "/" + entryName
		},
	)
	if err != nil {
		return []FileOrFolder{}, fmt.Errorf("failed to read %s", pathToRoot)
	}

	return topLevelItems, nil
}
