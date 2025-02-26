package tags_helper_test

import (
	"testing"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/tags_helper"
	"github.com/stretchr/testify/assert"
)

func setupTempDir(t *testing.T) (string, string) {
	t.Helper() // Marks this function as a helper in test output
	tempDir := t.TempDir()
	return tempDir, tempDir + "/tags/notes_to_tags.json"
}

func TestCreateNoteToTagsMapIfNotExists(t *testing.T) {
	t.Run("when notes_to_tags.json does not exist", func(t *testing.T) {
		t.Run("the file should be created", func(t *testing.T) {
			tempDir, pathToFile := setupTempDir(t)
			err := tags_helper.CreateNoteToTagsMapIfNotExists(tempDir)
			assert.NoError(t, err)
			assert.FileExists(t, pathToFile)
		})
		t.Run("the file should have the correct default content", func(t *testing.T) {
			tempDir, pathToFile := setupTempDir(t)
			tags_helper.CreateNoteToTagsMapIfNotExists(tempDir)
			expected := tags_helper.NotesToTagsMap{Data: map[string][]string{}}
			notesToTagsMap := tags_helper.NotesToTagsMap{}
			io_helpers.ReadJsonFromPath(pathToFile, &notesToTagsMap)
			assert.Equal(t, expected, notesToTagsMap, "Expected data to be empty")
		})
	})
	t.Run("When notes_to_tags.json does exist", func(t *testing.T) {
		t.Run("the file should have the correct content", func(t *testing.T) {
			tempDir, pathToFile := setupTempDir(t)
			io_helpers.CreateFileIfNotExist(pathToFile)
			expected := tags_helper.NotesToTagsMap{Data: map[string][]string{"note1": {"tag1", "tag2"}, "note2": {"tag3"}}}
			io_helpers.WriteJsonToPath(pathToFile, expected)

			tags_helper.CreateNoteToTagsMapIfNotExists(tempDir)
			notesToTagsMap := tags_helper.NotesToTagsMap{}
			io_helpers.ReadJsonFromPath(pathToFile, &notesToTagsMap)
			assert.Equal(t, expected, notesToTagsMap, "Expected pre-existing data to not be overwritten")
		})
	})
}
