package tags_helper_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/map_helpers"
	"github.com/etesam913/bytebook/lib/tags_helper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	// TagsDir is the name of the folder containing all tag-related files.
	TagsDir = "tags"
	// NotesToTagsFile is the file name for the map of notes to tags.
	NotesToTagsFile = "notes_to_tags.json"
	// TagNotesFile is the file name for the array of notes for a given tag.
	TagNotesFile = "notes.json"
	// TagName is a sample tag name used for testing.
	TagName = "etesam-tag"
)

// getNotesToTagsFilePath returns the path to the notes_to_tags.json file for the given project.
func getNotesToTagsFilePath(projectPath string) string {
	return filepath.Join(projectPath, TagsDir, NotesToTagsFile)
}

// getTagNotesFilePath returns the path to the notes.json file for a given tag under the project.
func getTagNotesFilePath(projectPath, tag string) string {
	return filepath.Join(projectPath, TagsDir, tag, TagNotesFile)
}

func TestGetAllTags(t *testing.T) {
	t.Run("creates tags folder if it does not exist", func(t *testing.T) {
		tempDir := t.TempDir()
		// Do not pre-create the "tags" folder.
		tags, err := tags_helper.GetAllTags(tempDir)
		assert.NoError(t, err)

		// Verify that the "tags" folder was created.
		tagsFolder := filepath.Join(tempDir, "tags")
		_, err = os.Stat(tagsFolder)
		assert.NoError(t, err, "Expected tags folder to be created")

		// Since no tag directories exist, the returned slice should be empty.
		assert.Empty(t, tags, "Expected no tags when none have been added")
	})

	t.Run("returns empty slice when tags folder is empty", func(t *testing.T) {
		tempDir := t.TempDir()
		// Manually create an empty "tags" folder.
		tagsFolder := filepath.Join(tempDir, "tags")
		err := os.MkdirAll(tagsFolder, os.ModePerm)
		assert.NoError(t, err)

		tags, err := tags_helper.GetAllTags(tempDir)
		assert.NoError(t, err)
		assert.Empty(t, tags, "Expected empty slice when no tag directories exist")
	})

	t.Run("returns tag directories when present", func(t *testing.T) {
		tempDir := t.TempDir()
		tagsFolder := filepath.Join(tempDir, "tags")
		err := os.MkdirAll(tagsFolder, os.ModePerm)
		assert.NoError(t, err)

		// Create several tag directories.
		expectedTags := []string{"tag1", "tag2", "tag3"}
		for _, tag := range expectedTags {
			tagPath := filepath.Join(tagsFolder, tag)
			err := os.Mkdir(tagPath, os.ModePerm)
			assert.NoError(t, err)
		}

		tags, err := tags_helper.GetAllTags(tempDir)
		assert.NoError(t, err)
		// Since order is not guaranteed, use ElementsMatch.
		assert.ElementsMatch(t, expectedTags, tags, "Expected list of tag directories to match")
	})
}

func TestCreateTagToNotesArrayIfNotExists(t *testing.T) {
	t.Run("when notes.json does not exist for a tag", func(t *testing.T) {
		t.Run("the file should be created", func(t *testing.T) {
			tempDir := t.TempDir()
			pathToFile := getTagNotesFilePath(tempDir, TagName)
			err := tags_helper.CreateTagToNotesArrayIfNotExists(tempDir, TagName)
			assert.NoError(t, err)
			assert.FileExists(t, pathToFile)
		})
		t.Run("the file should have the correct default content", func(t *testing.T) {
			tempDir := t.TempDir()
			pathToFile := getTagNotesFilePath(tempDir, TagName)
			err := tags_helper.CreateTagToNotesArrayIfNotExists(tempDir, TagName)
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
			pathToFile := getTagNotesFilePath(tempDir, TagName)
			io_helpers.CreateFileIfNotExist(pathToFile)
			expected := tags_helper.TagsToNotesArray{
				Notes: []string{"note1", "note2"},
			}
			io_helpers.WriteJsonToPath(pathToFile, expected)
			err := tags_helper.CreateTagToNotesArrayIfNotExists(tempDir, TagName)
			assert.NoError(t, err)
			var notesArray tags_helper.TagsToNotesArray
			io_helpers.ReadJsonFromPath(pathToFile, &notesArray)
			assert.Equal(t, expected, notesArray, "Expected pre-existing data to not be overwritten")
		})
	})
}

func TestAddNotesToTagToNotesArray(t *testing.T) {
	t.Run("adds new notePaths to an empty array", func(t *testing.T) {
		tempDir := t.TempDir()
		pathToFile := getTagNotesFilePath(tempDir, TagName)

		// Call AddNotesToTagToNotesArray with two note paths.
		err := tags_helper.AddNotesToTagToNotesArray(tempDir, TagName, []string{"note1", "note2"})
		assert.NoError(t, err)

		tagsArray := tags_helper.TagsToNotesArray{}
		err = io_helpers.ReadJsonFromPath(pathToFile, &tagsArray)
		assert.NoError(t, err)

		expected := tags_helper.TagsToNotesArray{
			Notes: []string{"note1", "note2"},
		}
		assert.Equal(t, expected, tagsArray, "Expected notePaths to be added to the array")
	})

	t.Run("does not add duplicate notePaths", func(t *testing.T) {
		tempDir := t.TempDir()
		pathToFile := getTagNotesFilePath(tempDir, TagName)

		// Add a note path.
		err := tags_helper.AddNotesToTagToNotesArray(tempDir, TagName, []string{"note1"})
		assert.NoError(t, err)
		// Attempt to add the same note path again.
		err = tags_helper.AddNotesToTagToNotesArray(tempDir, TagName, []string{"note1"})
		assert.NoError(t, err)

		tagsArray := tags_helper.TagsToNotesArray{}
		err = io_helpers.ReadJsonFromPath(pathToFile, &tagsArray)
		assert.NoError(t, err)

		expected := tags_helper.TagsToNotesArray{
			Notes: []string{"note1"},
		}
		assert.Equal(t, expected, tagsArray, "Expected duplicate notePaths to not be added")
	})
}

func TestDeleteNotesFromTagToNotesArray(t *testing.T) {
	t.Run("removes an existing notePath from the array", func(t *testing.T) {
		tempDir := t.TempDir()
		pathToFile := getTagNotesFilePath(tempDir, TagName)

		// Setup: add several note paths.
		err := tags_helper.AddNotesToTagToNotesArray(tempDir, TagName, []string{"note1", "note2", "note3"})
		assert.NoError(t, err)

		// Remove "note2".
		err = tags_helper.DeleteNotesFromTagToNotesArray(tempDir, TagName, []string{"note2"})
		assert.NoError(t, err)

		var tagsArray tags_helper.TagsToNotesArray
		err = io_helpers.ReadJsonFromPath(pathToFile, &tagsArray)
		assert.NoError(t, err)

		expected := tags_helper.TagsToNotesArray{
			Notes: []string{"note1", "note3"},
		}
		assert.Equal(t, expected, tagsArray, "Expected notePath 'note2' to be removed")
	})

	t.Run("does nothing if the notePath does not exist", func(t *testing.T) {
		tempDir := t.TempDir()
		pathToFile := getTagNotesFilePath(tempDir, TagName)

		// Setup: add two note paths.
		err := tags_helper.AddNotesToTagToNotesArray(tempDir, TagName, []string{"note1", "note2"})
		assert.NoError(t, err)

		// Attempt to delete a non-existent note path.
		err = tags_helper.DeleteNotesFromTagToNotesArray(tempDir, TagName, []string{"note3"})
		assert.NoError(t, err)

		var tagsArray tags_helper.TagsToNotesArray
		err = io_helpers.ReadJsonFromPath(pathToFile, &tagsArray)
		assert.NoError(t, err)

		expected := tags_helper.TagsToNotesArray{
			Notes: []string{"note1", "note2"},
		}
		assert.Equal(t, expected, tagsArray, "Expected array to remain unchanged when deleting a non-existent notePath")
	})

	t.Run("removes multiple notePaths from the array", func(t *testing.T) {
		tempDir := t.TempDir()
		pathToFile := getTagNotesFilePath(tempDir, TagName)

		// Setup: add four note paths.
		err := tags_helper.AddNotesToTagToNotesArray(tempDir, TagName, []string{"note1", "note2", "note3", "note4"})
		assert.NoError(t, err)

		// Remove "note1" and "note3".
		err = tags_helper.DeleteNotesFromTagToNotesArray(tempDir, TagName, []string{"note1", "note3"})
		assert.NoError(t, err)

		var tagsArray tags_helper.TagsToNotesArray
		err = io_helpers.ReadJsonFromPath(pathToFile, &tagsArray)
		assert.NoError(t, err)

		expected := tags_helper.TagsToNotesArray{
			Notes: []string{"note2", "note4"},
		}
		assert.Equal(t, expected, tagsArray, "Expected multiple notePaths to be removed")
	})

	t.Run("returns no error and does not create file when no notePaths are provided", func(t *testing.T) {
		tempDir := t.TempDir()
		pathToFile := getTagNotesFilePath(tempDir, TagName)

		// Even if the file doesn't exist yet, providing an empty slice should return no error.
		err := tags_helper.DeleteNotesFromTagToNotesArray(tempDir, TagName, []string{})
		assert.NoError(t, err)

		// The file should not be created.
		_, err = os.Stat(pathToFile)
		assert.True(t, os.IsNotExist(err), "Expected notes file not to exist when no notePaths are provided")
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
			expected := tags_helper.NotesToTagsMap{Notes: map[string][]string{}}
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
			expected := tags_helper.NotesToTagsMap{Notes: map[string][]string{"note1": {"tag1", "tag2"}, "note2": {"tag3"}}}
			io_helpers.WriteJsonToPath(pathToFile, expected)

			tags_helper.CreateNoteToTagsMapIfNotExists(tempDir)
			var notesToTagsMap tags_helper.NotesToTagsMap
			io_helpers.ReadJsonFromPath(pathToFile, &notesToTagsMap)
			assert.Equal(t, expected, notesToTagsMap, "Expected pre-existing data to not be overwritten")
		})
	})
}

func TestGetTagsForNote(t *testing.T) {
	// Create a temporary project directory.
	projectPath := t.TempDir()

	err := tags_helper.AddTagsToNotesToTagsMap(projectPath, []string{"note1", "note2"}, []string{"tag1", "tag2"})
	require.NoError(t, err)

	t.Run("returns tags when note exists", func(t *testing.T) {
		tags, err := tags_helper.GetTagsForNotes(projectPath, []string{"note1", "note2"})
		assert.NoError(t, err)
		// Verify that the returned tags match what we expect using assert.Equal for maps.
		expected := map[string][]string{
			"note1": {"tag1", "tag2"},
			"note2": {"tag1", "tag2"},
		}
		assert.Equal(t, expected, tags)
	})

	t.Run("returns error when note does not exist", func(t *testing.T) {
		tags, err := tags_helper.GetTagsForNotes(projectPath, []string{"note3"})
		assert.Error(t, err)
		assert.Equal(t, map[string][]string{}, tags)
		assert.Equal(t, "note does not have any tags", err.Error())
	})
}

func TestAddTagsToNotesToTagsMap(t *testing.T) {
	t.Run("Adds notes and tags to the map", func(t *testing.T) {
		tempDir := t.TempDir()
		pathToFile := getNotesToTagsFilePath(tempDir)
		tags_helper.CreateNoteToTagsMapIfNotExists(tempDir)
		expected := tags_helper.NotesToTagsMap{Notes: map[string][]string{"note1": {"tag1", "tag2"}, "note2": {"tag3"}}}

		err := tags_helper.AddTagsToNotesToTagsMap(tempDir, []string{"note1"}, []string{"tag1"})
		assert.NoError(t, err)
		// Testing the append code branch.
		err = tags_helper.AddTagsToNotesToTagsMap(tempDir, []string{"note1"}, []string{"tag2"})
		assert.NoError(t, err)
		err = tags_helper.AddTagsToNotesToTagsMap(tempDir, []string{"note2"}, []string{"tag3"})
		assert.NoError(t, err)

		var notesToTagsMap tags_helper.NotesToTagsMap
		io_helpers.ReadJsonFromPath(pathToFile, &notesToTagsMap)
		assert.Equal(t, expected, notesToTagsMap, "Expected notes and tags to be added to the map")
	})
}

func TestDeleteStaleTagsFromNotesToTagsMap(t *testing.T) {
	// Create a temporary project directory.
	projectPath := t.TempDir()
	notesToTagsFile := getNotesToTagsFilePath(projectPath)
	// Setup: Write an initial notes_to_tags.json file with some tags for each note.
	err := tags_helper.AddTagsToNotesToTagsMap(projectPath, []string{"note1"}, []string{"tag1", "tag2", "tag3"})
	err = tags_helper.AddTagsToNotesToTagsMap(projectPath, []string{"note2"}, []string{"tag2", "tag5"})
	err = tags_helper.AddTagsToNotesToTagsMap(projectPath, []string{"note3"}, []string{"tag5", "tag1"})
	require.NoError(t, err)

	// Create a staleTags set containing "tag2" and "tag5".
	staleTags := map_helpers.Set[string]{}
	staleTags.Add("tag2")
	staleTags.Add("tag5")

	// Execute the function under test.
	err = tags_helper.DeleteStaleTagsFromNotesToTagsMap(projectPath, staleTags)
	require.NoError(t, err)

	// Read back the updated notes_to_tags.json file.
	var updatedMap tags_helper.NotesToTagsMap
	err = io_helpers.ReadJsonFromPath(notesToTagsFile, &updatedMap)
	require.NoError(t, err)

	// Expected result:
	// - "note1": "tag2" removed → {"tag1", "tag3"}
	// - "note2": "tag2", "tag5" removed → {}
	// - "note3": "tag5" removed → {"tag1"}
	expectedMap := tags_helper.NotesToTagsMap{
		Notes: map[string][]string{
			"note1": {"tag1", "tag3"},
			"note3": {"tag1"},
		},
	}

	assert.Equal(t, expectedMap, updatedMap)
}

func TestDeleteTagsFromNotesFromTagsMap(t *testing.T) {
	t.Run("Deletes notes and tags from the map", func(t *testing.T) {
		tempDir := t.TempDir()
		pathToFile := getNotesToTagsFilePath(tempDir)
		tags_helper.CreateNoteToTagsMapIfNotExists(tempDir)
		expected := tags_helper.NotesToTagsMap{Notes: map[string][]string{"note1": {"tag1"}}}

		err := tags_helper.AddTagsToNotesToTagsMap(tempDir, []string{"note1"}, []string{"tag1"})
		assert.NoError(t, err)
		// Testing the append code branch.
		err = tags_helper.AddTagsToNotesToTagsMap(tempDir, []string{"note1"}, []string{"tag2"})
		assert.NoError(t, err)
		err = tags_helper.AddTagsToNotesToTagsMap(tempDir, []string{"note2"}, []string{"tag3"})
		assert.NoError(t, err)

		err = tags_helper.DeleteTagsFromNotesToTagsMap(tempDir, []string{"note1"}, []string{"tag2"})
		assert.NoError(t, err)
		err = tags_helper.DeleteTagsFromNotesToTagsMap(tempDir, []string{"note2"}, []string{"tag3"})
		assert.NoError(t, err)

		var notesToTagsMap tags_helper.NotesToTagsMap
		io_helpers.ReadJsonFromPath(pathToFile, &notesToTagsMap)
		assert.Equal(t, expected, notesToTagsMap, "Expected notes and tags to be removed from the map")
	})
}
