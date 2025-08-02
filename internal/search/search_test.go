package search

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

// setupTempProject creates a temporary directory with a notes subdirectory
// and returns the temp directory path and a cleanup function.
func setupTempProject(t *testing.T, namePrefix string) (string, func()) {
	tempDir, err := os.MkdirTemp("", namePrefix)
	assert.NoError(t, err, "Failed to create temp directory")

	notesDir := filepath.Join(tempDir, "notes")
	err = os.Mkdir(notesDir, 0755)
	assert.NoError(t, err, "Failed to create notes directory")

	cleanup := func() {
		os.RemoveAll(tempDir)
	}

	return tempDir, cleanup
}

func TestDoesIndexExist(t *testing.T) {
	t.Run("index exists", func(t *testing.T) {
		tempDir, cleanup := setupTempProject(t, "index_test")
		defer cleanup()

		// Create the index file
		indexPath := filepath.Join(tempDir, "notes", INDEX_NAME)
		err := os.WriteFile(indexPath, []byte("fake index content"), 0644)
		assert.NoError(t, err, "Failed to create index file")

		// Test that doesIndexExist returns true
		result := doesIndexExist(tempDir)
		assert.True(t, result, "Expected doesIndexExist to return true when index exists")
	})

	t.Run("index does not exist", func(t *testing.T) {
		tempDir, cleanup := setupTempProject(t, "index_test")
		defer cleanup()

		// Test that doesIndexExist returns false
		result := doesIndexExist(tempDir)
		assert.False(t, result, "Expected doesIndexExist to return false when index does not exist")
	})

	t.Run("notes directory does not exist", func(t *testing.T) {
		// Create a temporary directory without notes subdirectory
		tempDir, err := os.MkdirTemp("", "index_test")
		assert.NoError(t, err, "Failed to create temp directory")
		defer os.RemoveAll(tempDir)

		// Test that doesIndexExist returns false
		result := doesIndexExist(tempDir)
		assert.False(t, result, "Expected doesIndexExist to return false when notes directory does not exist")
	})

	t.Run("project directory does not exist", func(t *testing.T) {
		// Use a non-existent directory path
		nonExistentDir := "/this/path/should/not/exist"

		// Test that doesIndexExist returns false
		result := doesIndexExist(nonExistentDir)
		assert.False(t, result, "Expected doesIndexExist to return false when project directory does not exist")
	})

	t.Run("index is a directory instead of file", func(t *testing.T) {
		tempDir, cleanup := setupTempProject(t, "index_test")
		defer cleanup()

		// Create a directory with the index name instead of a file
		indexPath := filepath.Join(tempDir, "notes", INDEX_NAME)
		err := os.Mkdir(indexPath, 0755)
		assert.NoError(t, err, "Failed to create index directory")

		// Test that doesIndexExist returns true (since it checks for existence, not file type)
		result := doesIndexExist(tempDir)
		assert.True(t, result, "Expected doesIndexExist to return true when index exists as directory")
	})

	t.Run("empty project path", func(t *testing.T) {
		// Test with empty string as project path
		result := doesIndexExist("")
		assert.False(t, result, "Expected doesIndexExist to return false for empty project path")
	})
}

func TestGetPathToIndex(t *testing.T) {
	t.Run("normal project path", func(t *testing.T) {
		projectPath := "/path/to/project"
		expected := filepath.Join(projectPath, "notes", INDEX_NAME)
		result := GetPathToIndex(projectPath)
		assert.Equal(t, expected, result, "Expected correct path to index")
	})

	t.Run("empty project path", func(t *testing.T) {
		projectPath := ""
		expected := filepath.Join("notes", INDEX_NAME)
		result := GetPathToIndex(projectPath)
		assert.Equal(t, expected, result, "Expected correct path for empty project path")
	})

	t.Run("project path with trailing slash", func(t *testing.T) {
		projectPath := "/path/to/project/"
		expected := filepath.Join(projectPath, "notes", INDEX_NAME)
		result := GetPathToIndex(projectPath)
		assert.Equal(t, expected, result, "Expected correct path with trailing slash")
	})

	t.Run("relative project path", func(t *testing.T) {
		projectPath := "./project"
		expected := filepath.Join(projectPath, "notes", INDEX_NAME)
		result := GetPathToIndex(projectPath)
		assert.Equal(t, expected, result, "Expected correct path for relative project path")
	})
}

func TestCreateIndex(t *testing.T) {
	t.Run("create index successfully", func(t *testing.T) {
		tempDir, cleanup := setupTempProject(t, "create_index_test")
		defer cleanup()

		// Create the index
		index, err := createIndex(tempDir)
		assert.NoError(t, err, "Expected createIndex to succeed")
		assert.NotNil(t, index, "Expected index to be created")

		// Verify the index file was created
		indexPath := GetPathToIndex(tempDir)
		_, err = os.Stat(indexPath)
		assert.NoError(t, err, "Expected index file to exist")

		// Close the index to clean up
		err = index.Close()
		assert.NoError(t, err, "Failed to close index")
	})

	t.Run("create index succeeds even when notes directory doesn't exist", func(t *testing.T) {
		// Create a temporary directory without notes subdirectory
		tempDir, err := os.MkdirTemp("", "create_index_test")
		assert.NoError(t, err, "Failed to create temp directory")
		defer os.RemoveAll(tempDir)

		// Create the index - Bleve will create the necessary directories
		index, err := createIndex(tempDir)
		assert.NoError(t, err, "Expected createIndex to succeed and create directories as needed")
		assert.NotNil(t, index, "Expected index to be created")

		// Verify the index file was created along with the notes directory
		indexPath := GetPathToIndex(tempDir)
		_, err = os.Stat(indexPath)
		assert.NoError(t, err, "Expected index file to exist")

		// Close the index to clean up
		err = index.Close()
		assert.NoError(t, err, "Failed to close index")
	})

	t.Run("create index fails with invalid project path", func(t *testing.T) {
		// Use a path that can't be created (on most systems)
		invalidPath := "/root/nonexistent/invalid"

		// Try to create the index - this should fail
		index, err := createIndex(invalidPath)
		assert.Error(t, err, "Expected createIndex to fail with invalid project path")
		assert.Nil(t, index, "Expected index to be nil on failure")
	})
}

func TestOpenOrCreateIndex(t *testing.T) {
	t.Run("create new index when none exists", func(t *testing.T) {
		tempDir, cleanup := setupTempProject(t, "open_create_index_test")
		defer cleanup()

		// Open or create index (should create new one)
		index, err := OpenOrCreateIndex(tempDir)
		assert.NoError(t, err, "Expected OpenOrCreateIndex to succeed")
		assert.NotNil(t, index, "Expected index to be created")

		// Verify the index file was created
		indexPath := GetPathToIndex(tempDir)
		_, err = os.Stat(indexPath)
		assert.NoError(t, err, "Expected index file to exist")

		// Close the index to clean up
		err = index.Close()
		assert.NoError(t, err, "Failed to close index")
	})

	t.Run("open existing index", func(t *testing.T) {
		tempDir, cleanup := setupTempProject(t, "open_create_index_test")
		defer cleanup()

		// First, create an index
		index1, err := createIndex(tempDir)
		assert.NoError(t, err, "Failed to create initial index")
		err = index1.Close()
		assert.NoError(t, err, "Failed to close initial index")

		// Now open the existing index
		index2, err := OpenOrCreateIndex(tempDir)
		assert.NoError(t, err, "Expected OpenOrCreateIndex to succeed")
		assert.NotNil(t, index2, "Expected index to be opened")

		// Close the index to clean up
		err = index2.Close()
		assert.NoError(t, err, "Failed to close index")
	})

	t.Run("fail to create index with invalid path", func(t *testing.T) {
		// Use a path that can't be created
		invalidPath := "/root/nonexistent/invalid"

		// Try to open or create index - this should fail
		index, err := OpenOrCreateIndex(invalidPath)
		assert.Error(t, err, "Expected OpenOrCreateIndex to fail with invalid path")
		assert.Nil(t, index, "Expected index to be nil on failure")
	})

	t.Run("fail to open corrupted index", func(t *testing.T) {
		tempDir, cleanup := setupTempProject(t, "open_create_index_test")
		defer cleanup()

		// Create a corrupted "index" (just a regular file with wrong content)
		indexPath := GetPathToIndex(tempDir)
		err := os.WriteFile(indexPath, []byte("not a valid bleve index"), 0644)
		assert.NoError(t, err, "Failed to create corrupted index file")

		// Try to open the corrupted index - this should fail
		index, err := OpenOrCreateIndex(tempDir)
		assert.Error(t, err, "Expected OpenOrCreateIndex to fail with corrupted index")
		assert.Nil(t, index, "Expected index to be nil on failure")
	})
}
