package util

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type TestWriteJson struct {
	Notes []string `json:"notes"`
}

func TestDedupeDescendantPaths(t *testing.T) {
	t.Run("Removes duplicates and descendants without changing the input", func(t *testing.T) {
		paths := []string{"a/b/c.md", "other.md", "a", "a/b", "a"}
		original := append([]string(nil), paths...)

		result := DedupeDescendantPaths(paths)

		assert.Equal(t, []string{"a", "other.md"}, result)
		assert.Equal(t, original, paths)
	})

	t.Run("Removes a descendant when its parent has a trailing slash", func(t *testing.T) {
		result := DedupeDescendantPaths([]string{"a/", "a/b"})

		assert.Equal(t, []string{"a/"}, result)
	})

	t.Run("Removes a descendant listed before its trailing slash parent", func(t *testing.T) {
		result := DedupeDescendantPaths([]string{"a/b", "a/"})

		assert.Equal(t, []string{"a/"}, result)
	})

	t.Run("Deduplicates the same parent with and without a trailing slash", func(t *testing.T) {
		result := DedupeDescendantPaths([]string{"a/", "a", "a/b"})

		assert.Equal(t, []string{"a"}, result)
	})

	t.Run("Keeps paths that only share a name prefix", func(t *testing.T) {
		result := DedupeDescendantPaths([]string{"ab/note.md", "a/"})

		assert.Equal(t, []string{"a/", "ab/note.md"}, result)
	})

	t.Run("Returns no paths for empty input", func(t *testing.T) {
		assert.Empty(t, DedupeDescendantPaths(nil))
	})
}

func TestSafeJoin(t *testing.T) {
	base := filepath.Join("/tmp", "project", "notes")

	cases := []struct {
		name    string
		rel     string
		want    string
		wantErr bool
	}{
		{"simple relative", "folder/note.md", filepath.Join(base, "folder/note.md"), false},
		{"with dot segments inside", "folder/./note.md", filepath.Join(base, "folder/note.md"), false},
		{"internal backtrack still inside", "folder/sub/../note.md", filepath.Join(base, "folder/note.md"), false},
		{"empty stays at base", "", base, false},
		{"parent escape", "../secret", "", true},
		{"deep parent escape", "folder/../../etc/passwd", "", true},
		{"absolute path is treated as relative by Join", "/etc/passwd", filepath.Join(base, "etc/passwd"), false},
		{"just ..", "..", "", true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := SafeJoin(base, tc.rel)
			if tc.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.Equal(t, tc.want, got)
		})
	}
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

func TestIsDirectory(t *testing.T) {
	t.Run("returns true for directories", func(t *testing.T) {
		tempDir := t.TempDir()
		assert.True(t, IsDirectory(tempDir))
	})

	t.Run("returns false for files", func(t *testing.T) {
		tempDir := t.TempDir()
		filePath := filepath.Join(tempDir, "note.md")
		err := os.WriteFile(filePath, []byte("test"), 0644)
		assert.NoError(t, err)

		assert.False(t, IsDirectory(filePath))
	})

	t.Run("returns false for missing paths", func(t *testing.T) {
		tempDir := t.TempDir()
		missingPath := filepath.Join(tempDir, "missing")
		assert.False(t, IsDirectory(missingPath))
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

		// spaces preserved and normalized
		{"file name with spaces", "file name with spaces"},
		{"My   file\tname\n", "My file name"},

		// Unicode characters preserved
		{"файл.txt", "файл.txt"},
		{"文档.pdf", "文档.pdf"},
		{"café (final).doc", "café (final).doc"},

		// Only problematic filesystem chars removed
		{"file/name:with*illegal|chars?", "filenamewithillegalchars"},
		{"valid<name>with\"quotes", "validnamewithquotes"},

		// Brackets/parentheses preserved
		{"[test](file)", "[test](file)"},
		{"My Document (Final v2).pdf", "My Document (Final v2).pdf"},

		// Windows reserved names get a leading underscore
		{"CON", "_CON"},
		{"CON.txt", "_CON.txt"},
		{"LPT9.doc", "_LPT9.doc"},

		// Multiple spaces collapse to single space
		{"a  b   c", "a b c"},

		// all-illegal → empty → fallback
		{"<>:\"/\\|?*", "file"},

		// Leading/trailing spaces and dots trimmed
		{" .filename. ", "filename"},
	}

	for _, tt := range tests {
		got := CleanFileName(tt.input)
		if got != tt.expected {
			t.Errorf("CleanFileNamePreserveUnicode(%q) = %q; want %q", tt.input, got, tt.expected)
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

func TestDestinationCollides(t *testing.T) {
	t.Run("returns false when destination does not exist", func(t *testing.T) {
		tmpDir := t.TempDir()
		oldPath := filepath.Join(tmpDir, "file1.txt")
		newPath := filepath.Join(tmpDir, "file2.txt")
		require.NoError(t, os.WriteFile(oldPath, []byte("content"), 0644))

		collides, err := DestinationCollides(oldPath, newPath)
		assert.NoError(t, err)
		assert.False(t, collides)
	})

	t.Run("returns true when destination exists as distinct file", func(t *testing.T) {
		tmpDir := t.TempDir()
		oldPath := filepath.Join(tmpDir, "file1.txt")
		newPath := filepath.Join(tmpDir, "file2.txt")
		require.NoError(t, os.WriteFile(oldPath, []byte("content1"), 0644))
		require.NoError(t, os.WriteFile(newPath, []byte("content2"), 0644))

		collides, err := DestinationCollides(oldPath, newPath)
		assert.NoError(t, err)
		assert.True(t, collides)
	})

	t.Run("returns false for case-only rename of same file", func(t *testing.T) {
		tmpDir := t.TempDir()
		oldPath := filepath.Join(tmpDir, "file.txt")
		newPath := filepath.Join(tmpDir, "File.txt")
		require.NoError(t, os.WriteFile(oldPath, []byte("content"), 0644))

		collides, err := DestinationCollides(oldPath, newPath)
		assert.NoError(t, err)
		assert.False(t, collides)
	})

	t.Run("returns error when source file does not exist", func(t *testing.T) {
		tmpDir := t.TempDir()
		oldPath := filepath.Join(tmpDir, "missing.txt")
		newPath := filepath.Join(tmpDir, "new.txt")

		_, err := DestinationCollides(oldPath, newPath)
		assert.Error(t, err)
	})
}

func TestExactPathExists(t *testing.T) {
	t.Run("returns true when file exists with exact case", func(t *testing.T) {
		tmpDir := t.TempDir()
		filePath := filepath.Join(tmpDir, "BUgS.md")
		require.NoError(t, os.WriteFile(filePath, []byte("content"), 0644))

		assert.True(t, ExactPathExists(filePath))
	})

	t.Run("returns false when file casing differs from disk", func(t *testing.T) {
		tmpDir := t.TempDir()
		filePath := filepath.Join(tmpDir, "BUgS.md")
		require.NoError(t, os.WriteFile(filePath, []byte("content"), 0644))

		assert.False(t, ExactPathExists(filepath.Join(tmpDir, "bugs.md")))
		assert.False(t, ExactPathExists(filepath.Join(tmpDir, "BugS.md")))
		assert.False(t, ExactPathExists(filepath.Join(tmpDir, "bugS.md")))
	})

	t.Run("returns false when file does not exist", func(t *testing.T) {
		tmpDir := t.TempDir()
		assert.False(t, ExactPathExists(filepath.Join(tmpDir, "missing.md")))
	})

	t.Run("returns true when directory exists with exact case", func(t *testing.T) {
		tmpDir := t.TempDir()
		dirPath := filepath.Join(tmpDir, "MyFolder")
		require.NoError(t, os.MkdirAll(dirPath, 0755))

		assert.True(t, ExactPathExists(dirPath))
		assert.False(t, ExactPathExists(filepath.Join(tmpDir, "myfolder")))
	})
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
