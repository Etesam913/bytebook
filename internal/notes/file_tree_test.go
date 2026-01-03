package notes

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetChildrenOfFolder(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "file_tree_test")
	assert.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Create test directory structure
	testFolder := "test_folder"
	fullTestFolderPath := filepath.Join(tempDir, testFolder)
	err = os.Mkdir(fullTestFolderPath, 0755)
	assert.NoError(t, err)

	// Create some test files and subdirectories
	testFiles := []string{"file1.txt", "file2.md", "file3.json"}
	for _, f := range testFiles {
		filePath := filepath.Join(fullTestFolderPath, f)
		err = os.WriteFile(filePath, []byte("test content"), 0644)
		assert.NoError(t, err)
	}

	// Create a subdirectory
	subDir := filepath.Join(fullTestFolderPath, "subdir")
	err = os.Mkdir(subDir, 0755)
	assert.NoError(t, err)

	tests := []struct {
		name          string
		projectPath   string
		folderId      string
		pathToFolder  string
		parentId      string
		expectedCount int
		expectError   bool
		errorContains string
	}{
		{
			name:          "Valid folder with children",
			projectPath:   tempDir,
			folderId:      "folder-123",
			pathToFolder:  testFolder,
			parentId:      "parent-123",
			expectedCount: 4, // 3 files + 1 subdirectory
			expectError:   false,
		},
		{
			name:          "Empty folder",
			projectPath:   tempDir,
			folderId:      "folder-456",
			pathToFolder:  filepath.Join(testFolder, "subdir"),
			parentId:      "folder-123",
			expectedCount: 0,
			expectError:   false,
		},
		{
			name:          "Non-existent path",
			projectPath:   tempDir,
			folderId:      "folder-789",
			pathToFolder:  "non_existent_folder",
			parentId:      "parent-456",
			expectedCount: 0,
			expectError:   true,
			errorContains: "does not exist",
		},
		{
			name:          "Path is a file, not a folder",
			projectPath:   tempDir,
			folderId:      "folder-101",
			pathToFolder:  filepath.Join(testFolder, "file1.txt"),
			parentId:      "folder-123",
			expectedCount: 0,
			expectError:   true,
			errorContains: "is not a folder",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			childIds, err := GetChildrenOfFolder(tt.projectPath, tt.folderId, tt.pathToFolder, tt.parentId)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
				assert.Empty(t, childIds)
			} else {
				assert.NoError(t, err)
				assert.Len(t, childIds, tt.expectedCount)
				// Verify that all returned IDs are valid UUIDs
				for _, id := range childIds {
					assert.NotEmpty(t, id)
				}
			}
		})
	}
}
