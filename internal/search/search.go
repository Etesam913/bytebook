package search

import (
	"path/filepath"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/util"
)

var INDEX_NAME = "index.bleve"

// GetPathToIndex returns the full path to the search index file for a given project.
// It combines the project path with the notes directory and the index filename.
func GetPathToIndex(projectPath string) string {
	return filepath.Join(projectPath, "notes", INDEX_NAME)
}

// doesIndexExist checks whether a search index file exists for the given project path.
// It returns true if the index file exists, false otherwise.
func doesIndexExist(projectPath string) bool {
	exists, _ := util.FileOrFolderExists(GetPathToIndex(projectPath))
	return exists
}

// createIndex creates a new Bleve search index at the specified project path.
// It returns the created index or an error if the creation fails.
func createIndex(projectPath string) (bleve.Index, error) {
	pathToIndex := GetPathToIndex(projectPath)
	index, err := bleve.New(pathToIndex, bleve.NewIndexMapping())
	if err != nil {
		return nil, err
	}

	return index, nil
}

// OpenOrCreateIndex opens an existing search index or creates a new one if it doesn't exist.
// It first checks if an index exists at the project path, and if so, opens it.
// If no index exists, it creates a new one. Returns the index or an error if the operation fails.
func OpenOrCreateIndex(projectPath string) (bleve.Index, error) {
	indexExists := doesIndexExist(projectPath)
	if indexExists {
		openedIndex, err := bleve.Open(GetPathToIndex(projectPath))
		if err != nil {
			return nil, err
		}
		return openedIndex, nil
	}

	index, err := createIndex(projectPath)
	if err != nil {
		return nil, err
	}
	return index, nil
}
