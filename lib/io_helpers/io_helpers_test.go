package io_helpers_test

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/etesam913/bytebook/lib/io_helpers"
)

type TestWriteJson struct {
	Notes []string `json:"notes"`
}

func TestWriteJsonToPath(t *testing.T) {
	err := io_helpers.WriteJsonToPath("./test.json", TestWriteJson{
		Notes: []string{"Etesam", "was", "here"},
	})
	if err != nil {
		t.Errorf("failed in writing io_helpers.WriteJsonToPath: %v", err)
	}
	var testJson TestWriteJson
	err = io_helpers.ReadJsonFromPath("./test.json", &testJson)

	if err != nil {
		t.Errorf("failed in reading io_helpers.ReadJsonFromPath: %v", err)
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
	err := io_helpers.ReadJsonFromPath("./test_read.json", &testReadJson)
	if err != nil {
		t.Errorf("failed in reading io_helpers.ReadJsonFromPath: %v", err)
	}

	if testReadJson.StringTest != "entry" || testReadJson.BooleanTest != true || testReadJson.NumberTest != 1234 {
		t.Errorf("the read value from the temp file is incorrect %v", err)
	}
}

// TestCompleteCustomActionForOS tests the CompleteCustomActionForOS function.
func TestCompleteCustomActionForOS(t *testing.T) {
	var windowsCalled, macCalled, linuxCalled bool

	action := io_helpers.ActionStruct{
		WindowsAction: func() { windowsCalled = true },
		MacAction:     func() { macCalled = true },
		LinuxAction:   func() { linuxCalled = true },
	}

	err := io_helpers.CompleteCustomActionForOS(action)
	if err != nil {
		if runtime.GOOS != "windows" && runtime.GOOS != "darwin" && runtime.GOOS != "linux" {
			// Expected error on unsupported OS
		} else {
			t.Errorf("Unexpected error: %v", err)
		}
	}

	switch runtime.GOOS {
	case "windows":
		if !windowsCalled {
			t.Errorf("WindowsAction was not called on Windows")
		}
		if macCalled || linuxCalled {
			t.Errorf("Unexpected actions called on Windows")
		}
	case "darwin":
		if !macCalled {
			t.Errorf("MacAction was not called on Mac")
		}
		if windowsCalled || linuxCalled {
			t.Errorf("Unexpected actions called on Mac")
		}
	case "linux":
		if !linuxCalled {
			t.Errorf("LinuxAction was not called on Linux")
		}
		if windowsCalled || macCalled {
			t.Errorf("Unexpected actions called on Linux")
		}
	default:
		if err == nil {
			t.Errorf("Expected error on unsupported OS")
		}
	}
}

// TestCopyFile tests the CopyFile function.
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
	copyErr := io_helpers.CopyFile(srcFile, dstFile, false)
	if copyErr.Err != nil {
		t.Errorf("CopyFile failed: %v", copyErr.Err)
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
	copyErr = io_helpers.CopyFile(srcFile, dstFile, false)
	if copyErr.Err == nil || !copyErr.IsDstExists {
		t.Errorf("Expected error when destination exists and shouldOverride is false")
	}

	// Now test copying when destination exists and shouldOverride is true
	copyErr = io_helpers.CopyFile(srcFile, dstFile, true)
	if copyErr.Err != nil {
		t.Errorf("CopyFile failed with shouldOverride=true: %v", copyErr.Err)
	}
}

// TestCleanFileName tests the CleanFileName function.
func TestCleanFileName(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"validfilename", "validfilename"},
		{"file name with spaces", "filenamewithspaces"},
		{"file/name:with*illegal|chars?", "filenamewithillegalchars"},
		{"[test](file)", "testfile"},
	}

	for _, test := range tests {
		cleaned := io_helpers.CleanFileName(test.input)
		if cleaned != test.expected {
			t.Errorf("CleanFileName(%q) = %q; expected %q", test.input, cleaned, test.expected)
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

	exists, err := io_helpers.FileOrFolderExists(tmpFile.Name())
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

	exists, err = io_helpers.FileOrFolderExists(tmpDir)
	if err != nil {
		t.Errorf("Error checking if directory exists: %v", err)
	}
	if !exists {
		t.Errorf("Directory should exist but FileOrFolderExists returned false")
	}

	// Check a non-existent path
	exists, err = io_helpers.FileOrFolderExists("/path/that/does/not/exist")
	if err != nil {
		t.Errorf("Error checking non-existent path: %v", err)
	}
	if exists {
		t.Errorf("Non-existent path should not exist but FileOrFolderExists returned true")
	}
}

// TestCreateFolderIfNotExist tests the CreateFolderIfNotExist function.
func TestCreateFolderIfNotExist(t *testing.T) {
	// Create a temporary directory to work in
	tmpDir, err := os.MkdirTemp("", "testcreatefolder")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	folderPath := filepath.Join(tmpDir, "newfolder")

	err = io_helpers.CreateFolderIfNotExist(folderPath)
	if err != nil {
		t.Errorf("CreateFolderIfNotExist failed: %v", err)
	}

	// Check that the folder now exists
	info, err := os.Stat(folderPath)
	if err != nil {
		t.Errorf("Failed to stat folder: %v", err)
	}
	if !info.IsDir() {
		t.Errorf("Expected %s to be a directory", folderPath)
	}

	// Call the function again to see that it does not error
	err = io_helpers.CreateFolderIfNotExist(folderPath)
	if err != nil {
		t.Errorf("CreateFolderIfNotExist failed on existing folder: %v", err)
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
	newFilePath, err := io_helpers.CreateUniqueNameForFileIfExists(filePath)
	if err != nil {
		t.Errorf("CreateUniqueNameForFileIfExists failed: %v", err)
	}

	// newFilePath should not be the same as filePath
	if newFilePath == filePath {
		t.Errorf("Expected a new unique file name, but got the same name")
	}

	// Check that the new file does not exist
	exists, err := io_helpers.FileOrFolderExists(newFilePath)
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
	anotherFilePath, err := io_helpers.CreateUniqueNameForFileIfExists(filePath)
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

// TestMoveFile tests the MoveFile function.
func TestMoveFile(t *testing.T) {
	// Create a temporary directory to work in
	tmpDir, err := os.MkdirTemp("", "testmovefile")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	srcFile := filepath.Join(tmpDir, "testfile.txt")
	dstFile := filepath.Join(tmpDir, "destfile.txt")

	// Create source file
	err = os.WriteFile(srcFile, []byte("Hello, world!"), 0644)
	if err != nil {
		t.Fatalf("Failed to create source file: %v", err)
	}

	// Move file to destination
	err = io_helpers.MoveFile(srcFile, dstFile)
	if err != nil {
		t.Errorf("MoveFile failed: %v", err)
	}

	// Check that source file no longer exists
	exists, err := io_helpers.FileOrFolderExists(srcFile)
	if err != nil {
		t.Errorf("Error checking if source file exists: %v", err)
	}
	if exists {
		t.Errorf("Source file should not exist after moving")
	}

	// Check that destination file exists and has correct content
	exists, err = io_helpers.FileOrFolderExists(dstFile)
	if err != nil {
		t.Errorf("Error checking if destination file exists: %v", err)
	}
	if !exists {
		t.Errorf("Destination file should exist after moving")
	}

	content, err := os.ReadFile(dstFile)
	if err != nil {
		t.Errorf("Failed to read destination file: %v", err)
	}
	if string(content) != "Hello, world!" {
		t.Errorf("Destination file content mismatch")
	}

	// Now try moving to a destination where file already exists
	// Create a file at srcFile again
	err = os.WriteFile(srcFile, []byte("New content"), 0644)
	if err != nil {
		t.Fatalf("Failed to create source file again: %v", err)
	}

	// Move file to the same destination
	err = io_helpers.MoveFile(srcFile, dstFile)
	if err != nil {
		t.Errorf("MoveFile failed when destination exists: %v", err)
	}

	// Now the destination should have a unique name
	uniqueDstFile := filepath.Join(tmpDir, "destfile-1.txt")
	exists, err = io_helpers.FileOrFolderExists(uniqueDstFile)
	if err != nil {
		t.Errorf("Error checking if unique destination file exists: %v", err)
	}
	if !exists {
		t.Errorf("Unique destination file should exist after moving")
	}

	// Check that the content of the unique destination file is "New content"
	content, err = os.ReadFile(uniqueDstFile)
	if err != nil {
		t.Errorf("Failed to read unique destination file: %v", err)
	}
	if string(content) != "New content" {
		t.Errorf("Unique destination file content mismatch")
	}
}
