package notes

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// findChildByName is a test helper that finds a child by name from a slice of FileOrFolder
func findChildByName(children []FileOrFolder, name string) *FileOrFolder {
	for _, child := range children {
		if child.Name == name {
			return &child
		}
	}
	return nil
}

func TestGetChildrenOfFolder(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "file_tree_test")
	assert.NoError(t, err)
	defer os.RemoveAll(tempDir)

	notesDir := filepath.Join(tempDir, "notes")
	err = os.Mkdir(notesDir, 0755)
	assert.NoError(t, err)

	testFolder := filepath.Join(notesDir, "test_folder")
	err = os.Mkdir(testFolder, 0755)
	assert.NoError(t, err)

	// Create test files
	err = os.WriteFile(filepath.Join(testFolder, "file1.txt"), []byte("content"), 0644)
	assert.NoError(t, err)
	err = os.WriteFile(filepath.Join(testFolder, "file2.md"), []byte("content"), 0644)
	assert.NoError(t, err)

	// Create subdirectory
	err = os.Mkdir(filepath.Join(testFolder, "subdir"), 0755)
	assert.NoError(t, err)

	// Create hidden files and folders (should be skipped)
	err = os.WriteFile(filepath.Join(testFolder, ".hidden_file"), []byte("content"), 0644)
	assert.NoError(t, err)
	err = os.WriteFile(filepath.Join(testFolder, ".DS_Store"), []byte("content"), 0644)
	assert.NoError(t, err)
	err = os.Mkdir(filepath.Join(testFolder, ".hidden_dir"), 0755)
	assert.NoError(t, err)

	// Test parentId for children
	testParentId := "test-parent-uuid"

	t.Run("returns three children for test_folder", func(t *testing.T) {
		page, err := GetChildrenOfFolder(tempDir, "test_folder", testParentId, "", 100)
		assert.NoError(t, err)
		assert.Len(t, page.Items, 3)
	})

	t.Run("file1.txt has correct properties", func(t *testing.T) {
		page, err := GetChildrenOfFolder(tempDir, "test_folder", testParentId, "", 100)
		assert.NoError(t, err)

		file1 := findChildByName(page.Items, "file1.txt")
		assert.NotNil(t, file1, "file1.txt should exist in children")

		assert.Equal(t, filepath.Join("test_folder", "file1.txt"), file1.Id)
		assert.Equal(t, "file1.txt", file1.Name)
		assert.Equal(t, "file", file1.Type)
		assert.Equal(t, testParentId, file1.ParentId)
		assert.Equal(t, []string{}, file1.ChildrenIds)
	})

	t.Run("file2.md has correct properties", func(t *testing.T) {
		page, err := GetChildrenOfFolder(tempDir, "test_folder", testParentId, "", 100)
		assert.NoError(t, err)

		file2 := findChildByName(page.Items, "file2.md")
		assert.NotNil(t, file2, "file2.md should exist in children")

		// Id should be a valid UUID
		_, err = uuid.Parse(file2.Id)
		assert.NoError(t, err, "Id should be a valid UUID")
		// Path should be the file path
		assert.Equal(t, filepath.Join("test_folder", "file2.md"), file2.Path)
		assert.Equal(t, "file2.md", file2.Name)
		assert.Equal(t, "file", file2.Type)
		assert.Equal(t, testParentId, file2.ParentId)
		assert.Equal(t, []string{}, file2.ChildrenIds)
	})

	t.Run("subdir has correct properties", func(t *testing.T) {
		page, err := GetChildrenOfFolder(tempDir, "test_folder", testParentId, "", 100)
		assert.NoError(t, err)

		subdir := findChildByName(page.Items, "subdir")
		assert.NotNil(t, subdir, "subdir should exist in children")

		// Id should be a valid UUID
		_, err = uuid.Parse(subdir.Id)
		assert.NoError(t, err, "Id should be a valid UUID")
		// Path should be the folder path
		assert.Equal(t, filepath.Join("test_folder", "subdir"), subdir.Path)
		assert.Equal(t, "subdir", subdir.Name)
		assert.Equal(t, "folder", subdir.Type)
		assert.Equal(t, testParentId, subdir.ParentId)
		assert.Equal(t, []string{}, subdir.ChildrenIds)
	})

	t.Run("non-existent folder returns error", func(t *testing.T) {
		page, err := GetChildrenOfFolder(tempDir, "missing", testParentId, "", 100)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "does not exist")
		assert.Empty(t, page.Items)
	})

	t.Run("path is a file returns error", func(t *testing.T) {
		page, err := GetChildrenOfFolder(tempDir, "test_folder/file1.txt", testParentId, "", 100)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "is not a folder")
		assert.Empty(t, page.Items)
	})

	t.Run("hidden files and folders are skipped", func(t *testing.T) {
		page, err := GetChildrenOfFolder(tempDir, "test_folder", testParentId, "", 100)
		assert.NoError(t, err)
		// Should only have 3 items (file1.txt, file2.md, subdir), not the hidden ones
		assert.Len(t, page.Items, 3)

		// Verify hidden files are not present
		assert.Nil(t, findChildByName(page.Items, ".hidden_file"), ".hidden_file should not be in children")
		assert.Nil(t, findChildByName(page.Items, ".DS_Store"), ".DS_Store should not be in children")
		assert.Nil(t, findChildByName(page.Items, ".hidden_dir"), ".hidden_dir should not be in children")
	})

	t.Run("supports cursor pagination", func(t *testing.T) {
		page1, err := GetChildrenOfFolder(tempDir, "test_folder", testParentId, "", 2)
		assert.NoError(t, err)
		assert.Len(t, page1.Items, 2)
		assert.True(t, page1.HasMore)
		assert.NotEmpty(t, page1.NextCursor)

		page2, err := GetChildrenOfFolder(tempDir, "test_folder", testParentId, page1.NextCursor, 2)
		assert.NoError(t, err)
		assert.Len(t, page2.Items, 1)
		assert.False(t, page2.HasMore)
		assert.Empty(t, page2.NextCursor)
	})
}

func TestGetTopLevelItems(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "file_tree_test")
	assert.NoError(t, err)
	defer os.RemoveAll(tempDir)

	notesDir := filepath.Join(tempDir, "notes")
	err = os.Mkdir(notesDir, 0755)
	assert.NoError(t, err)

	// Create top-level items
	err = os.WriteFile(filepath.Join(notesDir, "file1.md"), []byte("content"), 0644)
	assert.NoError(t, err)
	err = os.Mkdir(filepath.Join(notesDir, "folder1"), 0755)
	assert.NoError(t, err)

	// Create hidden files and folders (should be skipped)
	err = os.WriteFile(filepath.Join(notesDir, ".hidden_file"), []byte("content"), 0644)
	assert.NoError(t, err)
	err = os.Mkdir(filepath.Join(notesDir, ".hidden_folder"), 0755)
	assert.NoError(t, err)

	t.Run("valid notes directory", func(t *testing.T) {
		items, err := GetTopLevelItems(tempDir)
		assert.NoError(t, err)
		assert.Len(t, items, 2)
		for _, item := range items {
			// Id should be a valid UUID
			_, err := uuid.Parse(item.Id)
			assert.NoError(t, err, "Id should be a valid UUID")
			// Path should be non-empty
			assert.NotEmpty(t, item.Path)
			assert.Contains(t, []string{"file", "folder"}, item.Type)
		}
	})

	t.Run("missing notes directory", func(t *testing.T) {
		emptyDir, err := os.MkdirTemp("", "file_tree_test_empty")
		assert.NoError(t, err)
		defer os.RemoveAll(emptyDir)

		items, err := GetTopLevelItems(emptyDir)
		assert.Error(t, err)
		assert.Empty(t, items)
	})

	t.Run("hidden files and folders are skipped", func(t *testing.T) {
		items, err := GetTopLevelItems(tempDir)
		assert.NoError(t, err)
		// Should only have 2 items (file1.md, folder1), not the hidden ones
		assert.Len(t, items, 2)

		// Verify hidden files are not present
		hiddenFile := findChildByName(items, ".hidden_file")
		assert.Nil(t, hiddenFile, ".hidden_file should not be in items")
		hiddenFolder := findChildByName(items, ".hidden_folder")
		assert.Nil(t, hiddenFolder, ".hidden_folder should not be in items")
	})
}
