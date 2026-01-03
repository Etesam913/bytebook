package notes

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

type FileOrFolder struct {
	Id          string   `json:"id"`
	Path        string   `json:"path"`
	ParentId    string   `json:"parentId"`
	Type        string   `json:"type"`
	ChildrenIds []string `json:"childrenIds"`
}

func GetChildrenOfFolder(projectPath, folderId, pathToFolder, parentId string) ([]string, error) {
	fullPathToFile := filepath.Join(projectPath, pathToFolder)
	fileInfo, err := os.Stat(fullPathToFile)

	if os.IsNotExist(err) {
		return []string{}, fmt.Errorf("%s does not exist", pathToFolder)
	}

	if err != nil {
		return []string{}, err
	}

	if !fileInfo.IsDir() {
		return []string{}, fmt.Errorf("%s is not a folder, so it does not have children", pathToFolder)
	}

	entries, err := os.ReadDir(fullPathToFile)
	if err != nil {
		return []string{}, fmt.Errorf("Could not read entries in %s", pathToFolder)
	}

	childIds := make([]string, len(entries))

	for i := 0; i < len(childIds); i++ {
		childIds[i] = uuid.New().String()
	}

	return childIds, nil
}
