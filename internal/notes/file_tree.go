package notes

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"github.com/google/uuid"
)

type FileOrFolder struct {
	Id          string   `json:"id"`
	Path        string   `json:"path"`
	Name        string   `json:"name"`
	ParentId    string   `json:"parentId"`
	Type        string   `json:"type"`
	ChildrenIds []string `json:"childrenIds"`
}

type FileOrFolderPage struct {
	Items      []FileOrFolder `json:"items"`
	NextCursor string         `json:"nextCursor"`
	HasMore    bool           `json:"hasMore"`
}

// readDirectoryEntries reads entries from a directory and converts them to FileOrFolder objects.
// fullPath is the absolute path to the directory to read.
// pathPrefix is the prefix to use for constructing the Path of each entry.
// Hidden files and folders (those starting with '.') are skipped.
func readDirectoryEntries(fullPath string, pathPrefix string) ([]FileOrFolder, error) {
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return []FileOrFolder{}, err
	}

	var items []FileOrFolder
	for _, entry := range entries {
		// Skip hidden files and folders (those starting with '.')
		if len(entry.Name()) > 0 && entry.Name()[0] == '.' {
			continue
		}

		entryType := "file"
		if entry.IsDir() {
			entryType = "folder"
		}
		items = append(items, FileOrFolder{
			Id:          uuid.New().String(),
			Path:        filepath.Join(pathPrefix, entry.Name()),
			Name:        entry.Name(),
			Type:        entryType,
			ChildrenIds: []string{},
		})
	}

	return items, nil
}

func GetChildrenOfFolder(projectPath, pathToFolder, parentId, cursor string, limit int) (FileOrFolderPage, error) {
	fullPathToFolder := filepath.Join(projectPath, "notes", pathToFolder)
	fileInfo, err := os.Stat(fullPathToFolder)

	if os.IsNotExist(err) {
		return FileOrFolderPage{}, fmt.Errorf("%s does not exist", pathToFolder)
	}

	if err != nil {
		return FileOrFolderPage{}, err
	}

	if !fileInfo.IsDir() {
		return FileOrFolderPage{}, fmt.Errorf("%s is not a folder, so it does not have children", pathToFolder)
	}

	children, err := readDirectoryEntries(
		fullPathToFolder,
		pathToFolder,
	)

	if err != nil {
		return FileOrFolderPage{}, fmt.Errorf("Could not read entries in %s", pathToFolder)
	}

	sort.Slice(children, func(i, j int) bool {
		return children[i].Name < children[j].Name
	})

	if limit <= 0 {
		limit = 100
	}

	startIndex := 0
	if cursor != "" {
		// Get first element in the folder that has a larger name than the cursor
		startIndex = min(sort.Search(len(children), func(i int) bool {
			return children[i].Name > cursor
		}), len(children))
	}

	endIndex := min(startIndex+limit, len(children))

	pageItems := children[startIndex:endIndex]
	for i := range pageItems {
		pageItems[i].ParentId = parentId
	}

	hasMore := endIndex < len(children)
	// is nextCursor calculated correcrlt?
	nextCursor := ""
	if hasMore && len(pageItems) > 0 {
		nextCursor = pageItems[len(pageItems)-1].Name
	}

	return FileOrFolderPage{
		Items:      pageItems,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
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
		"",
	)
	if err != nil {
		return []FileOrFolder{}, fmt.Errorf("failed to read %s", pathToRoot)
	}

	return topLevelItems, nil
}
