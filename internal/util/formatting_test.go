package util

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFormatStringListForErrorMessage(t *testing.T) {
	t.Run("List within capacity", func(t *testing.T) {
		stringList := []string{"error1", "error2", "error3"}
		capacity := 5

		result := FormatStringListForErrorMessage(stringList, capacity)
		expected := "error1, error2, error3"

		assert.Equal(t, expected, result)
	})

	t.Run("List exceeds capacity", func(t *testing.T) {
		stringList := []string{"error1", "error2", "error3", "error4", "error5"}
		capacity := 2

		result := FormatStringListForErrorMessage(stringList, capacity)
		expected := "error1, error2etc..."

		assert.Equal(t, expected, result)
	})

	t.Run("Empty list", func(t *testing.T) {
		stringList := []string{}
		capacity := 3

		result := FormatStringListForErrorMessage(stringList, capacity)
		expected := ""

		assert.Equal(t, expected, result)
	})

	t.Run("Single item list within capacity", func(t *testing.T) {
		stringList := []string{"single_error"}
		capacity := 3

		result := FormatStringListForErrorMessage(stringList, capacity)
		expected := "single_error"

		assert.Equal(t, expected, result)
	})

	t.Run("List exactly at capacity", func(t *testing.T) {
		stringList := []string{"error1", "error2", "error3"}
		capacity := 3

		result := FormatStringListForErrorMessage(stringList, capacity)
		expected := "error1, error2, error3"

		assert.Equal(t, expected, result)
	})

	t.Run("List has one more item than capacity", func(t *testing.T) {
		stringList := []string{"error1", "error2", "error3", "error4"}
		capacity := 3

		result := FormatStringListForErrorMessage(stringList, capacity)
		expected := "error1, error2, error3etc..."

		assert.Equal(t, expected, result)
	})

	t.Run("Negative capacity", func(t *testing.T) {
		stringList := []string{"error1", "error2"}
		capacity := -1

		result := FormatStringListForErrorMessage(stringList, capacity)
		expected := "error1etc..."

		assert.Equal(t, expected, result)
	})

	t.Run("Capacity is zero", func(t *testing.T) {
		stringList := []string{"error1", "error2"}
		capacity := 0

		result := FormatStringListForErrorMessage(stringList, capacity)
		expected := "error1etc..."

		assert.Equal(t, expected, result)
	})
}

func TestConstructFileServerPath(t *testing.T) {
	t.Run("Basic path construction", func(t *testing.T) {
		fileFolder := "documents"
		fileName := "test.md"

		result := ConstructFileServerPath(fileFolder, fileName)
		expected := "http://localhost:5890/notes/documents/test.md"

		assert.Equal(t, expected, result)
	})

	t.Run("Nested folder path", func(t *testing.T) {
		fileFolder := "documents/subfolder"
		fileName := "nested.md"

		result := ConstructFileServerPath(fileFolder, fileName)
		expected := "http://localhost:5890/notes/documents/subfolder/nested.md"

		assert.Equal(t, expected, result)
	})

	t.Run("Empty folder name", func(t *testing.T) {
		fileFolder := ""
		fileName := "root.md"

		result := ConstructFileServerPath(fileFolder, fileName)
		expected := "http://localhost:5890/notes/root.md"

		assert.Equal(t, expected, result)
	})

	t.Run("Empty file name", func(t *testing.T) {
		fileFolder := "documents"
		fileName := ""

		result := ConstructFileServerPath(fileFolder, fileName)
		expected := "http://localhost:5890/notes/documents"

		assert.Equal(t, expected, result)
	})

	t.Run("File with extension", func(t *testing.T) {
		fileFolder := "projects"
		fileName := "readme.txt"

		result := ConstructFileServerPath(fileFolder, fileName)
		expected := "http://localhost:5890/notes/projects/readme.txt"

		assert.Equal(t, expected, result)
	})

	t.Run("Path with special characters", func(t *testing.T) {
		fileFolder := "my documents"
		fileName := "file-with-dashes_and_underscores.md"

		result := ConstructFileServerPath(fileFolder, fileName)
		expected := "http://localhost:5890/notes/my documents/file-with-dashes_and_underscores.md"

		assert.Equal(t, expected, result)
	})

	t.Run("URL protocol is not corrupted", func(t *testing.T) {
		fileFolder := "test"
		fileName := "file.md"

		result := ConstructFileServerPath(fileFolder, fileName)

		// Verify the protocol is preserved correctly (http://)
		assert.True(t, strings.HasPrefix(result, "http://"), "URL should start with http://")
		assert.False(t, strings.Contains(result, "http:/localhost"), "URL should not contain corrupted protocol")

		expected := "http://localhost:5890/notes/test/file.md"
		assert.Equal(t, expected, result)
	})
}

func TestConstructInternalLink(t *testing.T) {
	t.Run("Basic internal link construction", func(t *testing.T) {
		fileFolder := "documents"
		fileName := "test.md"

		result := ConstructInternalLink(fileFolder, fileName)
		expected := "wails://localhost:5173/notes/documents/test.md"

		assert.Equal(t, expected, result)
	})

	t.Run("Nested folder path", func(t *testing.T) {
		fileFolder := "documents/subfolder"
		fileName := "nested.md"

		result := ConstructInternalLink(fileFolder, fileName)
		expected := "wails://localhost:5173/notes/documents/subfolder/nested.md"

		assert.Equal(t, expected, result)
	})

	t.Run("Empty folder name", func(t *testing.T) {
		fileFolder := ""
		fileName := "root.md"

		result := ConstructInternalLink(fileFolder, fileName)
		expected := "wails://localhost:5173/notes/root.md"

		assert.Equal(t, expected, result)
	})

	t.Run("Empty file name", func(t *testing.T) {
		fileFolder := "documents"
		fileName := ""

		result := ConstructInternalLink(fileFolder, fileName)
		expected := "wails://localhost:5173/notes/documents"

		assert.Equal(t, expected, result)
	})

	t.Run("Deep nested path", func(t *testing.T) {
		fileFolder := "projects/web/frontend/components"
		fileName := "button.md"

		result := ConstructInternalLink(fileFolder, fileName)
		expected := "wails://localhost:5173/notes/projects/web/frontend/components/button.md"

		assert.Equal(t, expected, result)
	})

	t.Run("File with multiple extensions", func(t *testing.T) {
		fileFolder := "backups"
		fileName := "data.backup.json"

		result := ConstructInternalLink(fileFolder, fileName)
		expected := "wails://localhost:5173/notes/backups/data.backup.json"

		assert.Equal(t, expected, result)
	})

	t.Run("URL protocol is not corrupted", func(t *testing.T) {
		fileFolder := "test"
		fileName := "file.md"

		result := ConstructInternalLink(fileFolder, fileName)

		// Verify the protocol is preserved correctly (wails://)
		assert.True(t, strings.HasPrefix(result, "wails://"), "URL should start with wails://")
		assert.False(t, strings.Contains(result, "wails:/localhost"), "URL should not contain corrupted protocol")

		expected := "wails://localhost:5173/notes/test/file.md"
		assert.Equal(t, expected, result)
	})
}

func TestGlobalVariables(t *testing.T) {
	t.Run("FILE_SERVER_URL has expected value", func(t *testing.T) {
		expected := "http://localhost:5890"
		assert.Equal(t, expected, FILE_SERVER_URL)
	})

	t.Run("INTERNAL_LINK_PREFIX has expected value", func(t *testing.T) {
		expected := "wails://localhost:5173"
		assert.Equal(t, expected, INTERNAL_LINK_PREFIX)
	})
}
