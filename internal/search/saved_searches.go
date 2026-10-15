package search

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/util"
)

// SavedSearch represents a saved search with a name and query
type SavedSearch struct {
	Name  string `json:"name"`
	Query string `json:"query"`
}

// SavedSearches represents the collection of all saved searches
type SavedSearches struct {
	Searches []SavedSearch `json:"searches"`
}

// getSavedSearchesPath returns the path to the saved searches file
func getSavedSearchesPath(projectPath string) string {
	return filepath.Join(projectPath, "search", "saved-searches.json")
}

// GetAllSavedSearches reads all saved searches from the JSON file
func GetAllSavedSearches(projectPath string) ([]SavedSearch, error) {
	path := getSavedSearchesPath(projectPath)

	var savedSearches SavedSearches
	err := util.ReadJsonFromPath(path, &savedSearches)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []SavedSearch{}, nil
		}
		return nil, fmt.Errorf("failed to read saved searches: %w", err)
	}

	return savedSearches.Searches, nil
}

// AddSavedSearch adds a new saved search to the JSON file
func AddSavedSearch(projectPath, name, query string) error {
	path := getSavedSearchesPath(projectPath)

	// Read existing searches
	searches, err := GetAllSavedSearches(projectPath)
	if err != nil {
		return err
	}

	// Check if search with this name already exists
	for _, search := range searches {
		if search.Name == name {
			return fmt.Errorf("saved search with name '%s' already exists", name)
		}
	}

	// Add new search
	newSearch := SavedSearch{Name: name, Query: query}
	savedSearches := SavedSearches{Searches: append(searches, newSearch)}

	// Write back to file
	return util.WriteJsonToPath(path, savedSearches)
}

// RemoveSavedSearch removes a saved search by name
func RemoveSavedSearch(projectPath, name string) error {
	path := getSavedSearchesPath(projectPath)

	// Read existing searches
	var savedSearches SavedSearches
	err := util.ReadJsonFromPath(path, &savedSearches)
	if err != nil {
		return fmt.Errorf("failed to read saved searches: %w", err)
	}

	// Find and remove the search
	found := false
	for i, search := range savedSearches.Searches {
		if search.Name == name {
			savedSearches.Searches = append(savedSearches.Searches[:i], savedSearches.Searches[i+1:]...)
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("saved search with name '%s' not found", name)
	}

	// Write back to file
	return util.WriteJsonToPath(path, savedSearches)
}
