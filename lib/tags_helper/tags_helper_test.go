package tags_helper_test

import (
	"path/filepath"
	"testing"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/tags_helper"
	"github.com/stretchr/testify/assert"
)

const (
	// TagsDir is the name of the folder containing all tag-related files.
	TagsDir = "tags"
	// NotesToTagsFile is the file name for the map of notes to tags.
	NotesToTagsFile = "notes_to_tags.json"
	// TagNotesFile is the file name for the array of notes for a given tag.
	TagNotesFile = "notes.json"
)

// getNotesToTagsFilePath returns the path to the notes_to_tags.json file for the given project.
func getNotesToTagsFilePath(projectPath string) string {
	return filepath.Join(projectPath, TagsDir, NotesToTagsFile)
}

// getTagNotesFilePath returns the path to the notes.json file for a given tag under the project.
func getTagNotesFilePath(projectPath, tag string) string {
	return filepath.Join(projectPath, TagsDir, tag, TagNotesFile)
}

func TestCreateTagToNotesArrayIfNotExists(t *testing.T) {
	tag := "etesam-tag"
	t.Run("when notes.json does not exist for a tag", func(t *testing.T) {
		t.Run("the file should be created", func(t *testing.T) {
			tempDir := t.TempDir()
			pathToFile := getTagNotesFilePath(tempDir, tag)
			err := tags_helper.CreateTagToNotesArrayIfNotExists(tempDir, tag)
			assert.NoError(t, err)
			assert.FileExists(t, pathToFile)
		})
		t.Run("the file should have the correct default content", func(t *testing.T) {
			tempDir := t.TempDir()
			pathToFile := getTagNotesFilePath(tempDir, tag)
			err := tags_helper.CreateTagToNotesArrayIfNotExists(tempDir, tag)
			assert.NoError(t, err)
			assert.FileExists(t, pathToFile)
			expected := []string{}
			notes := []string{}
			io_helpers.ReadJsonFromPath(pathToFile, &notes)
			assert.Equal(t, expected, notes, "Expected data to be empty")
		})
	})
	t.Run("when notes.json exists for a tag", func(t *testing.T) {
		t.Run("the file should not be overwritten", func(t *testing.T) {
			tempDir := t.TempDir()
			pathToFile := getTagNotesFilePath(tempDir, tag)
			io_helpers.CreateFileIfNotExist(pathToFile)
			expected := tags_helper.TagsToNotesArray{
				Notes: []string{"note1", "note2"},
			}
			io_helpers.WriteJsonToPath(pathToFile, expected)
			err := tags_helper.CreateTagToNotesArrayIfNotExists(tempDir, tag)
			assert.NoError(t, err)
			var notesToTagsMap tags_helper.TagsToNotesArray
			io_helpers.ReadJsonFromPath(pathToFile, &notesToTagsMap)
			assert.Equal(t, expected, notesToTagsMap, "Expected pre-existing data to not be overwritten")
		})
	})
}

func TestCreateNoteToTagsMapIfNotExists(t *testing.T) {
	t.Run("when notes_to_tags.json does not exist", func(t *testing.T) {
		t.Run("the file should be created", func(t *testing.T) {
			tempDir := t.TempDir()
			pathToFile := getNotesToTagsFilePath(tempDir)
			err := tags_helper.CreateNoteToTagsMapIfNotExists(tempDir)
			assert.NoError(t, err)
			assert.FileExists(t, pathToFile)
		})
		t.Run("the file should have the correct default content", func(t *testing.T) {
			tempDir := t.TempDir()
			pathToFile := getNotesToTagsFilePath(tempDir)
			tags_helper.CreateNoteToTagsMapIfNotExists(tempDir)
			expected := tags_helper.NotesToTagsMap{Tags: map[string][]string{}}
			var notesToTagsMap tags_helper.NotesToTagsMap
			io_helpers.ReadJsonFromPath(pathToFile, &notesToTagsMap)
			assert.Equal(t, expected, notesToTagsMap, "Expected data to be empty")
		})
	})
	t.Run("when notes_to_tags.json does exist", func(t *testing.T) {
		t.Run("the file content should not be overwritten when valid", func(t *testing.T) {
			tempDir := t.TempDir()
			pathToFile := getNotesToTagsFilePath(tempDir)
			io_helpers.CreateFileIfNotExist(pathToFile)
			expected := tags_helper.NotesToTagsMap{Tags: map[string][]string{"note1": {"tag1", "tag2"}, "note2": {"tag3"}}}
			io_helpers.WriteJsonToPath(pathToFile, expected)

			tags_helper.CreateNoteToTagsMapIfNotExists(tempDir)
			var notesToTagsMap tags_helper.NotesToTagsMap
			io_helpers.ReadJsonFromPath(pathToFile, &notesToTagsMap)
			assert.Equal(t, expected, notesToTagsMap, "Expected pre-existing data to not be overwritten")
		})
	})
}

func TestAddNotesToTagsMap(t *testing.T) {
	t.Run("Adds notes and tags to the map", func(t *testing.T) {
		tempDir := t.TempDir()
		pathToFile := getNotesToTagsFilePath(tempDir)
		tags_helper.CreateNoteToTagsMapIfNotExists(tempDir)
		expected := tags_helper.NotesToTagsMap{Tags: map[string][]string{"note1": {"tag1", "tag2"}, "note2": {"tag3"}}}

		err := tags_helper.AddNotesToTagsMap(tempDir, []string{"note1"}, []string{"tag1"})
		assert.NoError(t, err)
		// Testing the append code branch.
		err = tags_helper.AddNotesToTagsMap(tempDir, []string{"note1"}, []string{"tag2"})
		assert.NoError(t, err)
		err = tags_helper.AddNotesToTagsMap(tempDir, []string{"note2"}, []string{"tag3"})
		assert.NoError(t, err)

		var notesToTagsMap tags_helper.NotesToTagsMap
		io_helpers.ReadJsonFromPath(pathToFile, &notesToTagsMap)
		assert.Equal(t, expected, notesToTagsMap, "Expected notes and tags to be added to the map")
	})
}

func TestDeleteNotesFromTagsMap(t *testing.T) {
	t.Run("Deletes notes and tags from the map", func(t *testing.T) {
		tempDir := t.TempDir()
		pathToFile := getNotesToTagsFilePath(tempDir)
		tags_helper.CreateNoteToTagsMapIfNotExists(tempDir)
		expected := tags_helper.NotesToTagsMap{Tags: map[string][]string{"note1": {"tag1"}}}

		err := tags_helper.AddNotesToTagsMap(tempDir, []string{"note1"}, []string{"tag1"})
		assert.NoError(t, err)
		// Testing the append code branch.
		err = tags_helper.AddNotesToTagsMap(tempDir, []string{"note1"}, []string{"tag2"})
		assert.NoError(t, err)
		err = tags_helper.AddNotesToTagsMap(tempDir, []string{"note2"}, []string{"tag3"})
		assert.NoError(t, err)

		err = tags_helper.DeleteNotesFromTagsMap(tempDir, []string{"note1"}, []string{"tag2"})
		assert.NoError(t, err)
		err = tags_helper.DeleteNotesFromTagsMap(tempDir, []string{"note2"}, []string{"tag3"})
		assert.NoError(t, err)

		var notesToTagsMap tags_helper.NotesToTagsMap
		io_helpers.ReadJsonFromPath(pathToFile, &notesToTagsMap)
		assert.Equal(t, expected, notesToTagsMap, "Expected notes and tags to be removed from the map")
	})
}
