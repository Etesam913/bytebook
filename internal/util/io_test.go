package util

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

type TestWriteJson struct {
	Notes []string `json:"notes"`
}

func TestWriteJsonToPath(t *testing.T) {
	err := WriteJsonToPath("./test.json", TestWriteJson{
		Notes: []string{"Etesam", "was", "here"},
	})
	if err != nil {
		t.Errorf("failed in writing WriteJsonToPath: %v", err)
	}
	var testJson TestWriteJson
	err = ReadJsonFromPath("./test.json", &testJson)

	if err != nil {
		t.Errorf("failed in reading ReadJsonFromPath: %v", err)
	}

	if testJson.Notes[0] != "Etesam" || testJson.Notes[1] != "was" || testJson.Notes[2] != "here" {
		t.Errorf("the written value to the temp file is incorrect %v", err)
	}

	err = os.Remove("./test.json")
	if err != nil {
		t.Errorf("failed in removing the temp json file: %v", err)
	}
}

type TestReadJson struct {
	StringTest  string `json:"stringTest"`
	BooleanTest bool   `json:"booleanTest"`
	NumberTest  int    `json:"numberTest"`
}

func TestReadJsonFromPath(t *testing.T) {
	var testReadJson TestReadJson
	err := ReadJsonFromPath("./test_read.json", &testReadJson)
	if err != nil {
		t.Errorf("failed in reading ReadJsonFromPath: %v", err)
	}

	if testReadJson.StringTest != "entry" || testReadJson.BooleanTest != true || testReadJson.NumberTest != 1234 {
		t.Errorf("the read value from the temp file is incorrect %v", err)
	}
}

func TestReadOrCreateJSON(t *testing.T) {
	// Define a test type
	type Config struct {
		Name    string `json:"name"`
		Version int    `json:"version"`
		Debug   bool   `json:"debug"`
	}

	t.Run("Reads existing JSON successfully", func(t *testing.T) {
		// Setup
		tempDir := t.TempDir()
		filePath := filepath.Join(tempDir, "config.json")

		expectedConfig := Config{
			Name:    "TestApp",
			Version: 42,
			Debug:   true,
		}

		// Create the file using the helper
		err := WriteJsonToPath(filePath, expectedConfig)
		assert.NoError(t, err)

		// Test the function
		defaultConfig := Config{Name: "Default", Version: 1, Debug: false}
		result, err := ReadOrCreateJSON(filePath, defaultConfig)

		// Verify
		assert.NoError(t, err)
		assert.Equal(t, expectedConfig, result)
	})

	t.Run("Creates new file with default value when file doesn't exist", func(t *testing.T) {
		// Setup
		tempDir := t.TempDir()
		filePath := filepath.Join(tempDir, "non-existent-config.json")
		defaultConfig := Config{Name: "Default", Version: 1, Debug: false}

		// Test the function
		result, err := ReadOrCreateJSON(filePath, defaultConfig)

		// Verify
		assert.NoError(t, err)
		assert.Equal(t, defaultConfig, result)

		// Verify file exists and contains expected content
		var readConfig Config
		err = ReadJsonFromPath(filePath, &readConfig)
		assert.NoError(t, err)
		assert.Equal(t, defaultConfig, readConfig)
	})

	t.Run("Returns error if file is not valid JSON", func(t *testing.T) {
		// Setup
		tempDir := t.TempDir()
		filePath := filepath.Join(tempDir, "invalid.json")

		// Create an invalid JSON file
		err := os.WriteFile(filePath, []byte("This is not valid JSON"), 0644)
		assert.NoError(t, err)

		defaultConfig := Config{Name: "Default", Version: 1, Debug: false}

		// Test the function
		_, err = ReadOrCreateJSON(filePath, defaultConfig)

		// Verify
		assert.Error(t, err)
	})

	t.Run("Creates directories if they don't exist", func(t *testing.T) {
		// Setup
		tempDir := t.TempDir()
		nestedPath := filepath.Join(tempDir, "nested", "dirs", "config.json")
		defaultValue := "test-value"

		// Test the function
		result, err := ReadOrCreateJSON(nestedPath, defaultValue)

		// Verify
		assert.NoError(t, err)
		assert.Equal(t, defaultValue, result)
		assert.DirExists(t, filepath.Join(tempDir, "nested", "dirs"))
		assert.FileExists(t, nestedPath)
	})

	t.Run("Handles permission errors", func(t *testing.T) {
		if os.Geteuid() == 0 {
			t.Skip("Skipping test as root user can write to read-only directories")
		}

		tempDir := t.TempDir()
		// Create a subdirectory with no write permissions
		readOnlyDir := filepath.Join(tempDir, "readonly")
		err := os.Mkdir(readOnlyDir, 0500) // read & execute only
		assert.NoError(t, err)
		defer os.Chmod(readOnlyDir, 0700) // restore permissions for cleanup

		filePath := filepath.Join(readOnlyDir, "config.json")
		defaultValue := "test-value"

		// Test the function
		_, err = ReadOrCreateJSON(filePath, defaultValue)
		assert.Error(t, err)
	})

	t.Run("Handles different types", func(t *testing.T) {
		// Test with a string
		t.Run("string type", func(t *testing.T) {
			tempDir := t.TempDir()
			filePath := filepath.Join(tempDir, "string.json")
			defaultValue := "test-string"

			result, err := ReadOrCreateJSON(filePath, defaultValue)
			assert.NoError(t, err)
			assert.Equal(t, defaultValue, result)
			assert.FileExists(t, filePath)

			// Verify content
			var readValue string
			err = ReadJsonFromPath(filePath, &readValue)
			assert.NoError(t, err)
			assert.Equal(t, defaultValue, readValue)
		})

		// Test with an integer
		t.Run("int type", func(t *testing.T) {
			tempDir := t.TempDir()
			filePath := filepath.Join(tempDir, "int.json")
			defaultValue := 42

			result, err := ReadOrCreateJSON(filePath, defaultValue)
			assert.NoError(t, err)
			assert.Equal(t, defaultValue, result)
			assert.FileExists(t, filePath)

			// Verify content
			var readValue int
			err = ReadJsonFromPath(filePath, &readValue)
			assert.NoError(t, err)
			assert.Equal(t, defaultValue, readValue)
		})

		// Test with a slice
		t.Run("slice type", func(t *testing.T) {
			tempDir := t.TempDir()
			filePath := filepath.Join(tempDir, "slice.json")
			defaultValue := []string{"one", "two", "three"}

			result, err := ReadOrCreateJSON(filePath, defaultValue)
			assert.NoError(t, err)
			assert.Equal(t, defaultValue, result)
			assert.FileExists(t, filePath)

			// Verify content
			var readValue []string
			err = ReadJsonFromPath(filePath, &readValue)
			assert.NoError(t, err)
			assert.Equal(t, defaultValue, readValue)
		})

		// Test with a map
		t.Run("map type", func(t *testing.T) {
			tempDir := t.TempDir()
			filePath := filepath.Join(tempDir, "map.json")
			defaultValue := map[string]interface{}{
				"name":   "MapTest",
				"values": []int{1, 2, 3},
			}

			result, err := ReadOrCreateJSON(filePath, defaultValue)
			assert.NoError(t, err)

			// Maps with interface{} values are tricky to compare directly
			// after JSON marshaling/unmarshaling, so we'll check keys
			assert.Len(t, result, len(defaultValue))
			assert.Equal(t, "MapTest", result["name"])
			assert.FileExists(t, filePath)
		})
	})
}

func TestCreateFileIfNotExist(t *testing.T) {
	t.Run("Creates new file in existing directory", func(t *testing.T) {
		// Setup
		tempDir := t.TempDir()
		filePath := filepath.Join(tempDir, "newfile.txt")

		// Test
		created, err := CreateFileIfNotExist(filePath)
		assert.NoError(t, err)
		assert.True(t, created, "File should have been created")

		// Verify
		exists, err := FileOrFolderExists(filePath)
		assert.NoError(t, err)
		assert.True(t, exists, "File should exist after creation")
	})

	t.Run("Creates new file with nested directories", func(t *testing.T) {
		// Setup
		tempDir := t.TempDir()
		nestedPath := filepath.Join(tempDir, "nested", "dirs", "newfile.txt")

		// Test
		created, err := CreateFileIfNotExist(nestedPath)
		assert.NoError(t, err)
		assert.True(t, created, "File should have been created")

		// Verify
		exists, err := FileOrFolderExists(nestedPath)
		assert.NoError(t, err)
		assert.True(t, exists, "File should exist after creation")
		assert.DirExists(t, filepath.Join(tempDir, "nested", "dirs"))
	})

	t.Run("Handles existing file", func(t *testing.T) {
		// Setup
		tempDir := t.TempDir()
		filePath := filepath.Join(tempDir, "existingfile.txt")

		// Create file first
		err := os.WriteFile(filePath, []byte("original content"), 0644)
		assert.NoError(t, err)

		// Get original modification time
		originalStat, err := os.Stat(filePath)
		assert.NoError(t, err)
		originalModTime := originalStat.ModTime()

		// Test
		created, err := CreateFileIfNotExist(filePath)
		assert.NoError(t, err)
		assert.False(t, created, "File should not have been created")

		// Verify file wasn't modified
		newStat, err := os.Stat(filePath)
		assert.NoError(t, err)
		assert.Equal(t, originalModTime, newStat.ModTime(), "File should not have been modified")
	})

	t.Run("Handles permission errors", func(t *testing.T) {
		if os.Geteuid() == 0 {
			t.Skip("Skipping test as root user can write to read-only directories")
		}

		// Setup
		tempDir := t.TempDir()
		readOnlyDir := filepath.Join(tempDir, "readonly")
		err := os.Mkdir(readOnlyDir, 0500) // read & execute only
		assert.NoError(t, err)
		defer os.Chmod(readOnlyDir, 0700) // restore permissions for cleanup

		filePath := filepath.Join(readOnlyDir, "newfile.txt")

		// Test
		created, err := CreateFileIfNotExist(filePath)
		assert.Error(t, err, "Should fail to create file in read-only directory")
		assert.False(t, created, "File should not have been created")
	})
}

func TestCopyFile(t *testing.T) {
	srcFile := "test_src.txt"
	dstFile := "test_dst.txt"

	// Create source file
	err := os.WriteFile(srcFile, []byte("Hello, world!"), 0644)
	if err != nil {
		t.Fatalf("Failed to create source file: %v", err)
	}
	defer os.Remove(srcFile) // Clean up

	// Copy file when destination does not exist
	err = CopyFile(srcFile, dstFile, false)
	if err != nil {
		t.Errorf("CopyFile failed: %v", err)
	}
	defer os.Remove(dstFile) // Clean up

	// Check that the destination file exists and has the correct content
	dstContent, err := os.ReadFile(dstFile)
	if err != nil {
		t.Errorf("Failed to read destination file: %v", err)
	}
	if string(dstContent) != "Hello, world!" {
		t.Errorf("Destination file content mismatch. Expected 'Hello, world!', got '%s'", string(dstContent))
	}

	// Now test copying when destination exists and shouldOverride is false
	err = CopyFile(srcFile, dstFile, false)
	if err == nil {
		t.Error("Expected error when destination exists and shouldOverride is false")
	}

	// Now test copying when destination exists and shouldOverride is true
	err = CopyFile(srcFile, dstFile, true)
	if err != nil {
		t.Errorf("CopyFile failed with shouldOverride=true: %v", err)
	}
}

func TestCleanFileName(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		// basic pass-through
		{"validfilename", "validfilename"},

		// spaces → underscore; runs collapse
		{"file name with spaces", "file_name_with_spaces"},
		{"My   file\tname\n", "My_file_name"},

		// illegal chars dropped—but words concatenated
		{"file/name:with*illegal|chars?", "filenamewithillegalchars"},

		// brackets/parentheses dropped
		{"[test](file)", "testfile"},

		// Windows reserved names get a leading underscore
		{"CON", "_CON"},
		{"LPT9", "_LPT9"},

		// collapse existing underscores
		{"a__b___c", "a_b_c"},

		// all-illegal → empty → fallback
		{"////", "file"},
	}

	for _, tt := range tests {
		got := CleanFileName(tt.input)
		if got != tt.expected {
			t.Errorf("CleanFileName(%q) = %q; want %q", tt.input, got, tt.expected)
		}
	}
}

// TestFileOrFolderExists tests the FileOrFolderExists function.
func TestFileOrFolderExists(t *testing.T) {
	// Create a temporary file
	tmpFile, err := os.CreateTemp("", "testfile")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())

	exists, err := FileOrFolderExists(tmpFile.Name())
	if err != nil {
		t.Errorf("Error checking if file exists: %v", err)
	}
	if !exists {
		t.Errorf("File should exist but FileOrFolderExists returned false")
	}

	// Create a temporary directory
	tmpDir, err := os.MkdirTemp("", "testdir")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	exists, err = FileOrFolderExists(tmpDir)
	if err != nil {
		t.Errorf("Error checking if directory exists: %v", err)
	}
	if !exists {
		t.Errorf("Directory should exist but FileOrFolderExists returned false")
	}

	// Check a non-existent path
	exists, err = FileOrFolderExists("/path/that/does/not/exist")
	if err != nil {
		t.Errorf("Error checking non-existent path: %v", err)
	}
	if exists {
		t.Errorf("Non-existent path should not exist but FileOrFolderExists returned true")
	}
}

// TestCreateUniqueNameForFileIfExists tests the CreateUniqueNameForFileIfExists function.
func TestCreateUniqueNameForFileIfExists(t *testing.T) {
	// Create a temporary directory to work in
	tmpDir, err := os.MkdirTemp("", "testuniquefilename")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	filePath := filepath.Join(tmpDir, "testfile.txt")

	// Create a file at filePath
	err = os.WriteFile(filePath, []byte("content"), 0644)
	if err != nil {
		t.Fatalf("Failed to create file: %v", err)
	}

	// Call CreateUniqueNameForFileIfExists
	newFilePath, err := CreateUniqueNameForFileIfExists(filePath)
	if err != nil {
		t.Errorf("CreateUniqueNameForFileIfExists failed: %v", err)
	}

	// newFilePath should not be the same as filePath
	if newFilePath == filePath {
		t.Errorf("Expected a new unique file name, but got the same name")
	}

	// Check that the new file does not exist
	exists, err := FileOrFolderExists(newFilePath)
	if err != nil {
		t.Errorf("Error checking if file exists: %v", err)
	}
	if exists {
		t.Errorf("Expected new file not to exist yet")
	}

	// Now create the new file
	err = os.WriteFile(newFilePath, []byte("new content"), 0644)
	if err != nil {
		t.Fatalf("Failed to create new file: %v", err)
	}

	// Now call the function again
	anotherFilePath, err := CreateUniqueNameForFileIfExists(filePath)
	if err != nil {
		t.Errorf("CreateUniqueNameForFileIfExists failed: %v", err)
	}
	if anotherFilePath == filePath || anotherFilePath == newFilePath {
		t.Errorf("Expected a new unique file name, but got an existing name")
	}

	// The new file path should end with "testfile 2.txt" or similar
	expectedSuffix := "testfile 2.txt"
	if !strings.HasSuffix(anotherFilePath, expectedSuffix) {
		t.Errorf("Expected new file name to end with %q, but got %q", expectedSuffix, anotherFilePath)
	}
}

func createDirectories(t *testing.T) (string, string) {
	tempDir := t.TempDir()

	// Create parent directories only
	sourceDir := filepath.Join(tempDir, "dir1")
	targetDir := filepath.Join(tempDir, "dir2")

	err := os.MkdirAll(sourceDir, os.ModePerm)
	assert.NoError(t, err)

	err = os.MkdirAll(targetDir, os.ModePerm)
	assert.NoError(t, err)
	return sourceDir, targetDir
}

// TestMoveFile tests the MoveFile function.
func TestMoveFile(t *testing.T) {
	t.Run("Moves file from one empty dir to another empty dir", func(t *testing.T) {
		sourceDir, targetDir := createDirectories(t)

		// Define file paths
		pathToOldFile := filepath.Join(sourceDir, "test.txt")
		pathToNewFile := filepath.Join(targetDir, "test.txt")

		// Create the actual file with some content
		testContent := []byte("test content")
		err := os.WriteFile(pathToOldFile, testContent, 0644)
		assert.NoError(t, err)

		// Move the file and check for errors
		err = MoveFile(pathToOldFile, pathToNewFile)
		assert.NoError(t, err)

		// Verify the file was moved successfully and has the same content
		newContent, err := os.ReadFile(pathToNewFile)
		assert.NoError(t, err)
		assert.Equal(t, testContent, newContent, "File content should be preserved after moving")

		// Verify the old file no longer exists
		_, err = os.ReadFile(pathToOldFile)
		assert.Error(t, err)
	})

	t.Run("Moves file and handles case where the folder already has a file with the same name", func(t *testing.T) {
		sourceDir, targetDir := createDirectories(t)
		// Define file paths
		pathToOldFile := filepath.Join(sourceDir, "test.txt")
		pathToNewFile := filepath.Join(targetDir, "test.txt")
		testContent := []byte("test content")

		err := os.WriteFile(pathToNewFile, testContent, 0644)
		assert.NoError(t, err)

		// Create the actual file with some content
		err = os.WriteFile(pathToOldFile, testContent, 0644)
		assert.NoError(t, err)

		// Move the file and check for errors
		err = MoveFile(pathToOldFile, pathToNewFile)
		assert.NoError(t, err)

		// Verify the file was moved successfully and has the same content
		newContent, err := os.ReadFile(filepath.Join(targetDir, "test 1.txt"))
		assert.NoError(t, err)
		assert.Equal(t, testContent, newContent, "File content should be preserved after moving")

		// Verify the old file no longer exists
		_, err = os.ReadFile(pathToOldFile)
		assert.Error(t, err)
	})
}

func TestCreateJSONFileIfNotExists(t *testing.T) {
	t.Run("Creates new JSON file in existing directory", func(t *testing.T) {
		// Setup
		tempDir := t.TempDir()
		filePath := filepath.Join(tempDir, "newfile.json")

		// Test
		created, err := CreateJSONFileIfNotExists(filePath)
		assert.NoError(t, err)
		assert.True(t, created, "Should return true when creating new file")

		// Verify file exists and contains empty JSON object
		exists, err := FileOrFolderExists(filePath)
		assert.NoError(t, err)
		assert.True(t, exists, "File should exist after creation")

		// Verify content is an empty JSON object
		content, err := os.ReadFile(filePath)
		assert.NoError(t, err)
		assert.Equal(t, "{}", strings.TrimSpace(string(content)))
	})

	t.Run("Creates new JSON file with nested directories", func(t *testing.T) {
		// Setup
		tempDir := t.TempDir()
		nestedPath := filepath.Join(tempDir, "nested", "dirs", "newfile.json")

		// Test
		created, err := CreateJSONFileIfNotExists(nestedPath)
		assert.NoError(t, err)
		assert.True(t, created, "Should return true when creating new file")

		// Verify
		exists, err := FileOrFolderExists(nestedPath)
		assert.NoError(t, err)
		assert.True(t, exists, "File should exist after creation")
		assert.DirExists(t, filepath.Join(tempDir, "nested", "dirs"))

		// Verify content is an empty JSON object
		content, err := os.ReadFile(nestedPath)
		assert.NoError(t, err)
		assert.Equal(t, "{}", strings.TrimSpace(string(content)))
	})

	t.Run("Returns false for existing file", func(t *testing.T) {
		// Setup
		tempDir := t.TempDir()
		filePath := filepath.Join(tempDir, "existingfile.json")

		// Create file first with some content
		err := os.WriteFile(filePath, []byte(`{"existing": "content"}`), 0644)
		assert.NoError(t, err)

		// Get original modification time
		originalStat, err := os.Stat(filePath)
		assert.NoError(t, err)
		originalModTime := originalStat.ModTime()

		// Test
		created, err := CreateJSONFileIfNotExists(filePath)
		assert.NoError(t, err)
		assert.False(t, created, "Should return false for existing file")

		// Verify file wasn't modified
		newStat, err := os.Stat(filePath)
		assert.NoError(t, err)
		assert.Equal(t, originalModTime, newStat.ModTime(), "File should not have been modified")

		// Verify content wasn't changed
		content, err := os.ReadFile(filePath)
		assert.NoError(t, err)
		assert.Equal(t, `{"existing": "content"}`, strings.TrimSpace(string(content)))
	})

	t.Run("Handles permission errors", func(t *testing.T) {
		if os.Geteuid() == 0 {
			t.Skip("Skipping test as root user can write to read-only directories")
		}

		// Setup
		tempDir := t.TempDir()
		readOnlyDir := filepath.Join(tempDir, "readonly")
		err := os.Mkdir(readOnlyDir, 0500) // read & execute only
		assert.NoError(t, err)
		defer os.Chmod(readOnlyDir, 0700) // restore permissions for cleanup

		filePath := filepath.Join(readOnlyDir, "newfile.json")

		// Test
		created, err := CreateJSONFileIfNotExists(filePath)
		assert.Error(t, err, "Should fail to create file in read-only directory")
		assert.False(t, created, "Should return false when creation fails")
	})
}
