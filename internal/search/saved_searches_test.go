package search

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// helper to create temp project dir, search dir, and saved-searches.json path
func setupTempSearchDir(t *testing.T) (projectDir, searchDir, savedSearchesPath string) {
	projectDir = t.TempDir()
	searchDir = filepath.Join(projectDir, "search")
	err := os.MkdirAll(searchDir, 0755)
	require.NoError(t, err)
	savedSearchesPath = filepath.Join(searchDir, "saved-searches.json")
	return
}

func TestGetAllSavedSearches(t *testing.T) {
	projectDir, _, savedSearchesPath := setupTempSearchDir(t)

	t.Run("should return empty slice when file doesn't exist", func(t *testing.T) {
		searches, err := GetAllSavedSearches(projectDir)
		assert.NoError(t, err)
		assert.Empty(t, searches)
	})

	t.Run("should return empty slice when file exists but is empty", func(t *testing.T) {
		// Create empty file
		err := os.WriteFile(savedSearchesPath, []byte("{}"), 0644)
		require.NoError(t, err)

		searches, err := GetAllSavedSearches(projectDir)
		assert.NoError(t, err)
		assert.Empty(t, searches)
	})

	t.Run("should return saved searches from valid JSON file", func(t *testing.T) {
		// Write test data to file
		err := os.WriteFile(savedSearchesPath, []byte(`{"searches":[{"name":"test search","query":"test query"},{"name":"another search","query":"another query"}]}`), 0644)
		require.NoError(t, err)

		searches, err := GetAllSavedSearches(projectDir)
		assert.NoError(t, err)
		assert.Len(t, searches, 2)
		assert.Equal(t, "test search", searches[0].Name)
		assert.Equal(t, "test query", searches[0].Query)
		assert.Equal(t, "another search", searches[1].Name)
		assert.Equal(t, "another query", searches[1].Query)
	})
}

func TestAddSavedSearch(t *testing.T) {
	t.Run("should add search to empty file", func(t *testing.T) {
		projectDir, _, savedSearchesPath := setupTempSearchDir(t)

		// Create empty saved searches file
		err := os.WriteFile(savedSearchesPath, []byte("{}"), 0644)
		require.NoError(t, err)

		err = AddSavedSearch(projectDir, "test search", "test query")
		assert.NoError(t, err)

		searches, err := GetAllSavedSearches(projectDir)
		assert.NoError(t, err)
		assert.Len(t, searches, 1)
		assert.Equal(t, "test search", searches[0].Name)
		assert.Equal(t, "test query", searches[0].Query)
	})

	t.Run("should add search to existing file", func(t *testing.T) {
		projectDir, _, savedSearchesPath := setupTempSearchDir(t)

		// Create empty saved searches file
		err := os.WriteFile(savedSearchesPath, []byte("{}"), 0644)
		require.NoError(t, err)

		// Add first search
		err = AddSavedSearch(projectDir, "first search", "first query")
		require.NoError(t, err)

		// Add second search
		err = AddSavedSearch(projectDir, "second search", "second query")
		assert.NoError(t, err)

		searches, err := GetAllSavedSearches(projectDir)
		assert.NoError(t, err)
		assert.Len(t, searches, 2)
		assert.Equal(t, "first search", searches[0].Name)
		assert.Equal(t, "second search", searches[1].Name)
	})

	t.Run("should return error when adding duplicate search name", func(t *testing.T) {
		projectDir, _, savedSearchesPath := setupTempSearchDir(t)

		// Create empty saved searches file
		err := os.WriteFile(savedSearchesPath, []byte("{}"), 0644)
		require.NoError(t, err)

		// Add first search
		err = AddSavedSearch(projectDir, "duplicate search", "first query")
		require.NoError(t, err)

		// Try to add search with same name
		err = AddSavedSearch(projectDir, "duplicate search", "second query")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "already exists")

		// Should still have only one search
		searches, err := GetAllSavedSearches(projectDir)
		assert.NoError(t, err)
		assert.Len(t, searches, 1)
	})
}

func TestRemoveSavedSearch(t *testing.T) {
	t.Run("should return error when trying to remove non-existent search", func(t *testing.T) {
		projectDir, _, savedSearchesPath := setupTempSearchDir(t)

		// Create empty saved searches file
		err := os.WriteFile(savedSearchesPath, []byte("{}"), 0644)
		require.NoError(t, err)

		err = RemoveSavedSearch(projectDir, "non-existent search")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "not found")
	})

	t.Run("should remove existing search", func(t *testing.T) {
		projectDir, _, savedSearchesPath := setupTempSearchDir(t)

		// Create empty saved searches file
		err := os.WriteFile(savedSearchesPath, []byte("{}"), 0644)
		require.NoError(t, err)

		// Add test searches
		err = AddSavedSearch(projectDir, "search to remove", "query")
		require.NoError(t, err)
		err = AddSavedSearch(projectDir, "search to keep", "query")
		require.NoError(t, err)

		// Remove one search
		err = RemoveSavedSearch(projectDir, "search to remove")
		assert.NoError(t, err)

		// Should have only one search left
		searches, err := GetAllSavedSearches(projectDir)
		assert.NoError(t, err)
		assert.Len(t, searches, 1)
		assert.Equal(t, "search to keep", searches[0].Name)
	})
}
