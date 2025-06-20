package notes

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/util"
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
		tags, err := GetAllTags(tempDir)
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

		tags, err := GetAllTags(tempDir)
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

		tags, err := GetAllTags(tempDir)
		assert.NoError(t, err)
		// Since order is not guaranteed, use ElementsMatch.
		assert.ElementsMatch(t, expectedTags, tags, "Expected list of tag directories to match")
	})
}

func TestTagExists(t *testing.T) {
	t.Run("returns false when tag directory does not exist", func(t *testing.T) {
		tempDir := t.TempDir()
		exists, err := TagExists(tempDir, "nonexistent-tag")
		assert.NoError(t, err)
		assert.False(t, exists, "Expected tag to not exist when directory doesn't exist")
	})

	t.Run("returns false when tag directory exists but notes.json does not exist", func(t *testing.T) {
		tempDir := t.TempDir()
		tagName := "test-tag"

		// Create tag directory but not the notes.json file
		tagDir := filepath.Join(tempDir, "tags", tagName)
		err := os.MkdirAll(tagDir, os.ModePerm)
		assert.NoError(t, err)

		exists, err := TagExists(tempDir, tagName)
		assert.NoError(t, err)
		assert.False(t, exists, "Expected tag to not exist when notes.json file is missing")
	})

	t.Run("returns false when the tags directory does not exist", func(t *testing.T) {
		tempDir := t.TempDir()
		// Don't create the tags directory at all

		exists, err := TagExists(tempDir, "any-tag")
		assert.NoError(t, err)
		assert.False(t, exists, "Expected tag to not exist when tags directory doesn't exist")
	})
	t.Run("returns false when path exists but is not a directory", func(t *testing.T) {
		tempDir := t.TempDir()
		tagName := "test-tag"

		// Create tags directory first
		tagsDir := filepath.Join(tempDir, "tags")
		err := os.MkdirAll(tagsDir, os.ModePerm)
		assert.NoError(t, err)

		// Create a file with the tag name instead of a directory
		tagPath := filepath.Join(tagsDir, tagName)
		file, err := os.Create(tagPath)
		assert.NoError(t, err)
		file.Close()

		exists, err := TagExists(tempDir, tagName)
		assert.NoError(t, err)
		assert.False(t, exists, "Expected tag to not exist when path is a file, not a directory")
	})
	t.Run("returns true when both tag directory and notes.json exist", func(t *testing.T) {
		tempDir := t.TempDir()
		tagName := "test-tag"

		// Create tag directory and notes.json file
		err := CreateTagToNotesArrayIfNotExists(tempDir, tagName)
		assert.NoError(t, err)

		exists, err := TagExists(tempDir, tagName)
		assert.NoError(t, err)
		assert.True(t, exists, "Expected tag to exist when both directory and notes.json exist")
	})

}

func TestCreateTagToNotesArrayIfNotExists(t *testing.T) {
	t.Run("when notes.json does not exist for a tag", func(t *testing.T) {
		t.Run("the file should be created", func(t *testing.T) {
			tempDir := t.TempDir()
			pathToFile := getTagNotesFilePath(tempDir, TagName)
			err := CreateTagToNotesArrayIfNotExists(tempDir, TagName)
			assert.NoError(t, err)
			assert.FileExists(t, pathToFile)
		})
		t.Run("the file should have the correct default content", func(t *testing.T) {
			tempDir := t.TempDir()
			pathToFile := getTagNotesFilePath(tempDir, TagName)
			err := CreateTagToNotesArrayIfNotExists(tempDir, TagName)
			assert.NoError(t, err)
			assert.FileExists(t, pathToFile)
			expected := []string{}
			notes := []string{}
			util.ReadJsonFromPath(pathToFile, &notes)
			assert.Equal(t, expected, notes, "Expected data to be empty")
		})
	})
	t.Run("when notes.json exists for a tag", func(t *testing.T) {
		t.Run("the file should not be overwritten", func(t *testing.T) {
			tempDir := t.TempDir()
			pathToFile := getTagNotesFilePath(tempDir, TagName)
			util.CreateFileIfNotExist(pathToFile)
			expected := TagsToNotesArray{
				Notes: []string{"note1", "note2"},
			}
			util.WriteJsonToPath(pathToFile, expected)
			err := CreateTagToNotesArrayIfNotExists(tempDir, TagName)
			assert.NoError(t, err)
			var notesArray TagsToNotesArray
			util.ReadJsonFromPath(pathToFile, &notesArray)
			assert.Equal(t, expected, notesArray, "Expected pre-existing data to not be overwritten")
		})
	})
}

func TestAddNotesToTagToNotesArray(t *testing.T) {
	t.Run("adds new notePaths to an empty array", func(t *testing.T) {
		tempDir := t.TempDir()
		pathToFile := getTagNotesFilePath(tempDir, TagName)

		// Call AddNotesToTagToNotesArray with two note paths.
		err := addNotesToTagNotesArray(tempDir, TagName, []string{"note1", "note2"})
		assert.NoError(t, err)

		tagsArray := TagsToNotesArray{}
		err = util.ReadJsonFromPath(pathToFile, &tagsArray)
		assert.NoError(t, err)

		expected := TagsToNotesArray{
			Notes: []string{"note1", "note2"},
		}
		assert.Equal(t, expected, tagsArray, "Expected notePaths to be added to the array")
	})

	t.Run("does not add duplicate notePaths", func(t *testing.T) {
		tempDir := t.TempDir()
		pathToFile := getTagNotesFilePath(tempDir, TagName)

		// Add a note path.
		err := addNotesToTagNotesArray(tempDir, TagName, []string{"note1"})
		assert.NoError(t, err)
		// Attempt to add the same note path again.
		err = addNotesToTagNotesArray(tempDir, TagName, []string{"note1"})
		assert.NoError(t, err)

		tagsArray := TagsToNotesArray{}
		err = util.ReadJsonFromPath(pathToFile, &tagsArray)
		assert.NoError(t, err)

		expected := TagsToNotesArray{
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
		err := addNotesToTagNotesArray(tempDir, TagName, []string{"note1", "note2", "note3"})
		assert.NoError(t, err)

		// Remove "note2".
		err = deleteNotesFromTagToNotesArray(tempDir, TagName, []string{"note2"})
		assert.NoError(t, err)

		var tagsArray TagsToNotesArray
		err = util.ReadJsonFromPath(pathToFile, &tagsArray)
		assert.NoError(t, err)

		expected := TagsToNotesArray{
			Notes: []string{"note1", "note3"},
		}
		assert.Equal(t, expected, tagsArray, "Expected notePath 'note2' to be removed")
	})

	t.Run("does nothing if the notePath does not exist", func(t *testing.T) {
		tempDir := t.TempDir()
		pathToFile := getTagNotesFilePath(tempDir, TagName)

		// Setup: add two note paths.
		err := addNotesToTagNotesArray(tempDir, TagName, []string{"note1", "note2"})
		assert.NoError(t, err)

		// Attempt to delete a non-existent note path.
		err = deleteNotesFromTagToNotesArray(tempDir, TagName, []string{"note3"})
		assert.NoError(t, err)

		var tagsArray TagsToNotesArray
		err = util.ReadJsonFromPath(pathToFile, &tagsArray)
		assert.NoError(t, err)

		expected := TagsToNotesArray{
			Notes: []string{"note1", "note2"},
		}
		assert.Equal(t, expected, tagsArray, "Expected array to remain unchanged when deleting a non-existent notePath")
	})

	t.Run("removes multiple notePaths from the array", func(t *testing.T) {
		tempDir := t.TempDir()
		pathToFile := getTagNotesFilePath(tempDir, TagName)

		// Setup: add four note paths.
		err := addNotesToTagNotesArray(tempDir, TagName, []string{"note1", "note2", "note3", "note4"})
		assert.NoError(t, err)

		// Remove "note1" and "note3".
		err = deleteNotesFromTagToNotesArray(tempDir, TagName, []string{"note1", "note3"})
		assert.NoError(t, err)

		var tagsArray TagsToNotesArray
		err = util.ReadJsonFromPath(pathToFile, &tagsArray)
		assert.NoError(t, err)

		expected := TagsToNotesArray{
			Notes: []string{"note2", "note4"},
		}
		assert.Equal(t, expected, tagsArray, "Expected multiple notePaths to be removed")
	})

	t.Run("returns no error and does not create file when no notePaths are provided", func(t *testing.T) {
		tempDir := t.TempDir()
		pathToFile := getTagNotesFilePath(tempDir, TagName)

		// Even if the file doesn't exist yet, providing an empty slice should return no error.
		err := deleteNotesFromTagToNotesArray(tempDir, TagName, []string{})
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
			err := config.CreateNoteToTagsMapIfNotExists(tempDir)
			assert.NoError(t, err)
			assert.FileExists(t, pathToFile)
		})
		t.Run("the file should have the correct default content", func(t *testing.T) {
			tempDir := t.TempDir()
			pathToFile := getNotesToTagsFilePath(tempDir)
			config.CreateNoteToTagsMapIfNotExists(tempDir)
			expected := config.NotesToTagsMap{Notes: map[string][]string{}}
			var notesToTagsMap config.NotesToTagsMap
			util.ReadJsonFromPath(pathToFile, &notesToTagsMap)
			assert.Equal(t, expected, notesToTagsMap, "Expected data to be empty")
		})
	})
	t.Run("when notes_to_tags.json does exist", func(t *testing.T) {
		t.Run("the file content should not be overwritten when valid", func(t *testing.T) {
			tempDir := t.TempDir()
			pathToFile := getNotesToTagsFilePath(tempDir)
			util.CreateFileIfNotExist(pathToFile)
			expected := config.NotesToTagsMap{Notes: map[string][]string{"note1": {"tag1", "tag2"}, "note2": {"tag3"}}}
			util.WriteJsonToPath(pathToFile, expected)

			config.CreateNoteToTagsMapIfNotExists(tempDir)
			var notesToTagsMap config.NotesToTagsMap
			util.ReadJsonFromPath(pathToFile, &notesToTagsMap)
			assert.Equal(t, expected, notesToTagsMap, "Expected pre-existing data to not be overwritten")
		})
	})
}

func TestGetTagsForNote(t *testing.T) {
	// Create a temporary project directory.
	projectPath := t.TempDir()

	err := addTagsToNotesToTagsMap(projectPath, []string{"note1", "note2"}, []string{"tag1", "tag2"})
	require.NoError(t, err)

	t.Run("returns tags when note exists", func(t *testing.T) {
		tags, err := GetTagsForNotes(projectPath, []string{"note1", "note2"})
		assert.NoError(t, err)
		// Verify that the returned tags match what we expect using assert.Equal for maps.
		expected := map[string][]string{
			"note1": {"tag1", "tag2"},
			"note2": {"tag1", "tag2"},
		}
		assert.Equal(t, expected, tags)
	})

	t.Run("skips notes that do not exist", func(t *testing.T) {
		tags, err := GetTagsForNotes(projectPath, []string{"note1", "note3"})
		assert.NoError(t, err)
		// Verify that the returned tags match what we expect using assert.Equal for maps.
		expected := map[string][]string{
			"note1": {"tag1", "tag2"},
		}
		assert.Equal(t, expected, tags)
	})
}

func TestAddTagsToNotesToTagsMap(t *testing.T) {
	t.Run("Adds notes and tags to the map", func(t *testing.T) {
		tempDir := t.TempDir()
		pathToFile := getNotesToTagsFilePath(tempDir)
		config.CreateNoteToTagsMapIfNotExists(tempDir)
		expected := config.NotesToTagsMap{Notes: map[string][]string{"note1": {"tag1", "tag2"}, "note2": {"tag3"}}}

		err := addTagsToNotesToTagsMap(tempDir, []string{"note1"}, []string{"tag1"})
		assert.NoError(t, err)
		// Testing the append code branch.
		err = addTagsToNotesToTagsMap(tempDir, []string{"note1"}, []string{"tag2"})
		assert.NoError(t, err)
		err = addTagsToNotesToTagsMap(tempDir, []string{"note2"}, []string{"tag3"})
		assert.NoError(t, err)

		var notesToTagsMap config.NotesToTagsMap
		util.ReadJsonFromPath(pathToFile, &notesToTagsMap)
		assert.Equal(t, expected, notesToTagsMap, "Expected notes and tags to be added to the map")
	})
}

func TestDeleteStaleTagsFromNotesToTagsMap(t *testing.T) {
	// Create a temporary project directory.
	projectPath := t.TempDir()
	notesToTagsFile := getNotesToTagsFilePath(projectPath)
	// Setup: Write an initial notes_to_tags.json file with some tags for each note.
	err := addTagsToNotesToTagsMap(projectPath, []string{"note1"}, []string{"tag1", "tag2", "tag3"})
	assert.NoError(t, err)
	err = addTagsToNotesToTagsMap(projectPath, []string{"note2"}, []string{"tag2", "tag5"})
	assert.NoError(t, err)
	err = addTagsToNotesToTagsMap(projectPath, []string{"note3"}, []string{"tag5", "tag1"})
	require.NoError(t, err)

	// Create a staleTags set containing "tag2" and "tag5".
	staleTags := util.Set[string]{}
	staleTags.Add("tag2")
	staleTags.Add("tag5")

	// Execute the function under test.
	err = DeleteStaleTagsFromNotesToTagsMap(projectPath, staleTags)
	require.NoError(t, err)

	// Read back the updated notes_to_tags.json file.
	var updatedMap config.NotesToTagsMap
	err = util.ReadJsonFromPath(notesToTagsFile, &updatedMap)
	require.NoError(t, err)

	// Expected result:
	// - "note1": "tag2" removed → {"tag1", "tag3"}
	// - "note2": "tag2", "tag5" removed → {}
	// - "note3": "tag5" removed → {"tag1"}
	expectedMap := config.NotesToTagsMap{
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
		config.CreateNoteToTagsMapIfNotExists(tempDir)
		expected := config.NotesToTagsMap{Notes: map[string][]string{"note1": {"tag1"}}}

		err := addTagsToNotesToTagsMap(tempDir, []string{"note1"}, []string{"tag1"})
		assert.NoError(t, err)
		// Testing the append code branch.
		err = addTagsToNotesToTagsMap(tempDir, []string{"note1"}, []string{"tag2"})
		assert.NoError(t, err)
		err = addTagsToNotesToTagsMap(tempDir, []string{"note2"}, []string{"tag3"})
		assert.NoError(t, err)

		err = deleteTagsFromNotesToTagsMap(tempDir, []string{"note1"}, []string{"tag2"})
		assert.NoError(t, err)
		err = deleteTagsFromNotesToTagsMap(tempDir, []string{"note2"}, []string{"tag3"})
		assert.NoError(t, err)

		var notesToTagsMap config.NotesToTagsMap
		util.ReadJsonFromPath(pathToFile, &notesToTagsMap)
		assert.Equal(t, expected, notesToTagsMap, "Expected notes and tags to be removed from the map")
	})
}

func TestAddTags(t *testing.T) {
	t.Run("adds tags to notes successfully", func(t *testing.T) {
		tempDir := t.TempDir()
		tagNames := []string{"tag1", "tag2"}
		notePaths := []string{"note1", "note2"}

		err := AddTags(tempDir, tagNames, notePaths)
		assert.NoError(t, err)

		// Verify that notes were added to each tag's notes.json file
		for _, tagName := range tagNames {
			pathToTagFile := getTagNotesFilePath(tempDir, tagName)
			var tagsArray TagsToNotesArray
			err := util.ReadJsonFromPath(pathToTagFile, &tagsArray)
			assert.NoError(t, err)
			assert.ElementsMatch(t, notePaths, tagsArray.Notes, "Expected notes to be added to tag %s", tagName)
		}

		// Verify that tags were added to notes_to_tags.json
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		for _, notePath := range notePaths {
			assert.ElementsMatch(t, tagNames, notesToTagsMap.Notes[notePath], "Expected tags to be added to note %s", notePath)
		}
	})

	t.Run("handles empty tag names", func(t *testing.T) {
		tempDir := t.TempDir()
		err := AddTags(tempDir, []string{}, []string{"note1"})
		assert.NoError(t, err)

		// Verify notes_to_tags.json gets created and the note has an empty tag array
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)
		// When we add empty tags to a note, it should create an entry with empty tags
		assert.Equal(t, []string{}, notesToTagsMap.Notes["note1"])
	})

	t.Run("handles empty note paths", func(t *testing.T) {
		tempDir := t.TempDir()
		err := AddTags(tempDir, []string{"tag1"}, []string{})
		assert.NoError(t, err)

		// Verify tag directory and notes.json file are created but empty
		pathToTagFile := getTagNotesFilePath(tempDir, "tag1")
		var tagsArray TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTagFile, &tagsArray)
		assert.NoError(t, err)
		assert.Empty(t, tagsArray.Notes)
	})

	t.Run("appends to existing tags", func(t *testing.T) {
		tempDir := t.TempDir()

		// First, add some tags
		err := AddTags(tempDir, []string{"tag1"}, []string{"note1"})
		assert.NoError(t, err)

		// Then add more tags and notes
		err = AddTags(tempDir, []string{"tag1", "tag2"}, []string{"note1", "note2"})
		assert.NoError(t, err)

		// Verify tag1 has both notes
		pathToTag1File := getTagNotesFilePath(tempDir, "tag1")
		var tag1Array TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTag1File, &tag1Array)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"note1", "note2"}, tag1Array.Notes)

		// Verify tag2 has both notes
		pathToTag2File := getTagNotesFilePath(tempDir, "tag2")
		var tag2Array TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTag2File, &tag2Array)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"note1", "note2"}, tag2Array.Notes)

		// Verify notes_to_tags mapping
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1", "tag2"}, notesToTagsMap.Notes["note1"])
		assert.ElementsMatch(t, []string{"tag1", "tag2"}, notesToTagsMap.Notes["note2"])
	})
}

func TestDeleteTags(t *testing.T) {
	t.Run("deletes tags from notes successfully", func(t *testing.T) {
		tempDir := t.TempDir()
		tagNames := []string{"tag1", "tag2", "tag3"}
		notePaths := []string{"note1", "note2"}

		// Setup: Add tags first
		err := AddTags(tempDir, tagNames, notePaths)
		assert.NoError(t, err)

		// Delete some tags
		tagsToDelete := []string{"tag1", "tag3"}
		err = DeleteTags(tempDir, tagsToDelete, notePaths)
		assert.NoError(t, err)

		// Verify notes were removed from deleted tags
		for _, tagName := range tagsToDelete {
			pathToTagFile := getTagNotesFilePath(tempDir, tagName)
			var tagsArray TagsToNotesArray
			err := util.ReadJsonFromPath(pathToTagFile, &tagsArray)
			assert.NoError(t, err)
			assert.Empty(t, tagsArray.Notes, "Expected notes to be removed from tag %s", tagName)
		}

		// Verify notes remain in tag2
		pathToTag2File := getTagNotesFilePath(tempDir, "tag2")
		var tag2Array TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTag2File, &tag2Array)
		assert.NoError(t, err)
		assert.ElementsMatch(t, notePaths, tag2Array.Notes)

		// Verify notes_to_tags mapping updated correctly
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		for _, notePath := range notePaths {
			assert.ElementsMatch(t, []string{"tag2"}, notesToTagsMap.Notes[notePath], "Expected only tag2 to remain for note %s", notePath)
		}
	})

	t.Run("handles partial deletions", func(t *testing.T) {
		tempDir := t.TempDir()

		// Setup: note1 has tag1 and tag2, note2 has only tag1
		err := AddTags(tempDir, []string{"tag1", "tag2"}, []string{"note1"})
		assert.NoError(t, err)
		err = AddTags(tempDir, []string{"tag1"}, []string{"note2"})
		assert.NoError(t, err)

		// Delete tag1 from note1 only
		err = DeleteTags(tempDir, []string{"tag1"}, []string{"note1"})
		assert.NoError(t, err)

		// Verify tag1 still has note2 but not note1
		pathToTag1File := getTagNotesFilePath(tempDir, "tag1")
		var tag1Array TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTag1File, &tag1Array)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"note2"}, tag1Array.Notes)

		// Verify tag2 still has note1
		pathToTag2File := getTagNotesFilePath(tempDir, "tag2")
		var tag2Array TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTag2File, &tag2Array)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"note1"}, tag2Array.Notes)

		// Verify notes_to_tags mapping
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag2"}, notesToTagsMap.Notes["note1"])
		assert.ElementsMatch(t, []string{"tag1"}, notesToTagsMap.Notes["note2"])
	})

	t.Run("handles empty parameters gracefully", func(t *testing.T) {
		tempDir := t.TempDir()

		// Setup some initial state
		err := AddTags(tempDir, []string{"tag1"}, []string{"note1"})
		assert.NoError(t, err)

		// Delete with empty tag names
		err = DeleteTags(tempDir, []string{}, []string{"note1"})
		assert.NoError(t, err)

		// Delete with empty note paths
		err = DeleteTags(tempDir, []string{"tag1"}, []string{})
		assert.NoError(t, err)

		// Verify original state is unchanged
		pathToTag1File := getTagNotesFilePath(tempDir, "tag1")
		var tag1Array TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTag1File, &tag1Array)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"note1"}, tag1Array.Notes)
	})
}

func TestSetTags(t *testing.T) {
	t.Run("sets tags for notes with no existing tags", func(t *testing.T) {
		tempDir := t.TempDir()
		tagNames := []string{"tag1", "tag2"}
		notePaths := []string{"note1", "note2"}

		err := SetTags(tempDir, tagNames, notePaths)
		assert.NoError(t, err)

		// Verify tags were set correctly
		for _, tagName := range tagNames {
			pathToTagFile := getTagNotesFilePath(tempDir, tagName)
			var tagsArray TagsToNotesArray
			err := util.ReadJsonFromPath(pathToTagFile, &tagsArray)
			assert.NoError(t, err)
			assert.ElementsMatch(t, notePaths, tagsArray.Notes, "Expected notes to be set for tag %s", tagName)
		}

		// Verify notes_to_tags mapping
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		for _, notePath := range notePaths {
			assert.ElementsMatch(t, tagNames, notesToTagsMap.Notes[notePath], "Expected tags to be set for note %s", notePath)
		}
	})

	t.Run("replaces existing tags completely", func(t *testing.T) {
		tempDir := t.TempDir()
		notePaths := []string{"note1", "note2"}

		// Setup: Add initial tags
		initialTags := []string{"oldTag1", "oldTag2", "oldTag3"}
		err := AddTags(tempDir, initialTags, notePaths)
		assert.NoError(t, err)

		// Set completely new tags
		newTags := []string{"newTag1", "newTag2"}
		err = SetTags(tempDir, newTags, notePaths)
		assert.NoError(t, err)

		// Verify old tags no longer contain the notes
		for _, oldTag := range initialTags {
			pathToOldTagFile := getTagNotesFilePath(tempDir, oldTag)
			var oldTagArray TagsToNotesArray
			err := util.ReadJsonFromPath(pathToOldTagFile, &oldTagArray)
			assert.NoError(t, err)
			assert.Empty(t, oldTagArray.Notes, "Expected old tag %s to have no notes", oldTag)
		}

		// Verify new tags contain the notes
		for _, newTag := range newTags {
			pathToNewTagFile := getTagNotesFilePath(tempDir, newTag)
			var newTagArray TagsToNotesArray
			err := util.ReadJsonFromPath(pathToNewTagFile, &newTagArray)
			assert.NoError(t, err)
			assert.ElementsMatch(t, notePaths, newTagArray.Notes, "Expected new tag %s to contain all notes", newTag)
		}

		// Verify notes_to_tags mapping shows only new tags
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		for _, notePath := range notePaths {
			assert.ElementsMatch(t, newTags, notesToTagsMap.Notes[notePath], "Expected note %s to have only new tags", notePath)
		}
	})

	t.Run("handles partial overlap in tags", func(t *testing.T) {
		tempDir := t.TempDir()
		notePaths := []string{"note1"}

		// Setup: Add initial tags
		initialTags := []string{"tag1", "tag2", "tag3"}
		err := AddTags(tempDir, initialTags, notePaths)
		assert.NoError(t, err)

		// Set tags with partial overlap (keep tag2, remove tag1 and tag3, add tag4)
		newTags := []string{"tag2", "tag4"}
		err = SetTags(tempDir, newTags, notePaths)
		assert.NoError(t, err)

		// Verify tag1 and tag3 no longer contain the note
		for _, removedTag := range []string{"tag1", "tag3"} {
			pathToRemovedTagFile := getTagNotesFilePath(tempDir, removedTag)
			var removedTagArray TagsToNotesArray
			err := util.ReadJsonFromPath(pathToRemovedTagFile, &removedTagArray)
			assert.NoError(t, err)
			assert.Empty(t, removedTagArray.Notes, "Expected removed tag %s to have no notes", removedTag)
		}

		// Verify tag2 and tag4 contain the note
		for _, keptTag := range newTags {
			pathToKeptTagFile := getTagNotesFilePath(tempDir, keptTag)
			var keptTagArray TagsToNotesArray
			err := util.ReadJsonFromPath(pathToKeptTagFile, &keptTagArray)
			assert.NoError(t, err)
			assert.ElementsMatch(t, notePaths, keptTagArray.Notes, "Expected kept tag %s to contain the note", keptTag)
		}

		// Verify notes_to_tags mapping
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)
		assert.ElementsMatch(t, newTags, notesToTagsMap.Notes["note1"])
	})

	t.Run("handles setting empty tags", func(t *testing.T) {
		tempDir := t.TempDir()
		notePaths := []string{"note1"}

		// Setup: Add initial tags
		initialTags := []string{"tag1", "tag2"}
		err := AddTags(tempDir, initialTags, notePaths)
		assert.NoError(t, err)

		// Set empty tags (remove all tags)
		err = SetTags(tempDir, []string{}, notePaths)
		assert.NoError(t, err)

		// Verify all old tags no longer contain the notes
		for _, oldTag := range initialTags {
			pathToOldTagFile := getTagNotesFilePath(tempDir, oldTag)
			var oldTagArray TagsToNotesArray
			err := util.ReadJsonFromPath(pathToOldTagFile, &oldTagArray)
			assert.NoError(t, err)
			assert.Empty(t, oldTagArray.Notes, "Expected old tag %s to have no notes", oldTag)
		}

		// Verify notes_to_tags mapping shows no tags for the notes
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		// The notes should not appear in the map at all when they have no tags
		_, exists := notesToTagsMap.Notes["note1"]
		assert.False(t, exists, "Expected note1 to not exist in notes_to_tags map when it has no tags")
	})

	t.Run("handles multiple notes with different existing tags", func(t *testing.T) {
		tempDir := t.TempDir()

		// Setup: note1 has tag1 and tag2, note2 has tag2 and tag3
		err := AddTags(tempDir, []string{"tag1", "tag2"}, []string{"note1"})
		assert.NoError(t, err)
		err = AddTags(tempDir, []string{"tag2", "tag3"}, []string{"note2"})
		assert.NoError(t, err)

		// Set both notes to have tag4 and tag5
		newTags := []string{"tag4", "tag5"}
		err = SetTags(tempDir, newTags, []string{"note1", "note2"})
		assert.NoError(t, err)

		// Verify old tags no longer contain either note
		for _, oldTag := range []string{"tag1", "tag2", "tag3"} {
			pathToOldTagFile := getTagNotesFilePath(tempDir, oldTag)
			var oldTagArray TagsToNotesArray
			err := util.ReadJsonFromPath(pathToOldTagFile, &oldTagArray)
			assert.NoError(t, err)
			assert.Empty(t, oldTagArray.Notes, "Expected old tag %s to have no notes", oldTag)
		}

		// Verify new tags contain both notes
		for _, newTag := range newTags {
			pathToNewTagFile := getTagNotesFilePath(tempDir, newTag)
			var newTagArray TagsToNotesArray
			err := util.ReadJsonFromPath(pathToNewTagFile, &newTagArray)
			assert.NoError(t, err)
			assert.ElementsMatch(t, []string{"note1", "note2"}, newTagArray.Notes, "Expected new tag %s to contain both notes", newTag)
		}

		// Verify notes_to_tags mapping
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		for _, notePath := range []string{"note1", "note2"} {
			assert.ElementsMatch(t, newTags, notesToTagsMap.Notes[notePath], "Expected note %s to have only new tags", notePath)
		}
	})
}

func TestUpdateFolderNameInTags(t *testing.T) {
	t.Run("updates folder name in tags successfully", func(t *testing.T) {
		tempDir := t.TempDir()

		// Setup: Create notes with tags in different folders

		// Add tags to notes
		err := AddTags(tempDir, []string{"tag1", "tag2"}, []string{"oldFolder/note1.md", "oldFolder/note2.md"})
		assert.NoError(t, err)
		err = AddTags(tempDir, []string{"tag2", "tag3"}, []string{"otherFolder/note3.md"})
		assert.NoError(t, err)
		err = AddTags(tempDir, []string{"tag1"}, []string{"oldFolder/note2.md"})
		assert.NoError(t, err)

		// Execute the function under test
		err = UpdateFolderNameInTags(tempDir, "oldFolder", "newFolder")
		assert.NoError(t, err)

		// Verify notes_to_tags.json was updated correctly
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		// Check that old folder paths are updated
		expectedNotesToTags := map[string][]string{
			"newFolder/note1.md":   {"tag1", "tag2"},
			"newFolder/note2.md":   {"tag1", "tag2"},
			"otherFolder/note3.md": {"tag2", "tag3"},
		}
		assert.Equal(t, expectedNotesToTags, notesToTagsMap.Notes)

		// Verify individual tag files were updated
		// Check tag1 notes.json
		pathToTag1File := getTagNotesFilePath(tempDir, "tag1")
		var tag1Array TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTag1File, &tag1Array)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"newFolder/note1.md", "newFolder/note2.md"}, tag1Array.Notes)

		// Check tag2 notes.json
		pathToTag2File := getTagNotesFilePath(tempDir, "tag2")
		var tag2Array TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTag2File, &tag2Array)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"newFolder/note1.md", "newFolder/note2.md", "otherFolder/note3.md"}, tag2Array.Notes)

		// Check tag3 notes.json (should only have the unchanged note)
		pathToTag3File := getTagNotesFilePath(tempDir, "tag3")
		var tag3Array TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTag3File, &tag3Array)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"otherFolder/note3.md"}, tag3Array.Notes)
	})

	t.Run("handles partial path matches correctly", func(t *testing.T) {
		tempDir := t.TempDir()

		// Setup notes with similar folder names
		err := AddTags(tempDir, []string{"tag1"}, []string{"folder/note1.md", "folder2/note2.md", "anotherfolder/note3.md"})
		assert.NoError(t, err)

		// Rename only "folder" (not "folder2" or "anotherfolder")
		err = UpdateFolderNameInTags(tempDir, "folder", "renamed")
		assert.NoError(t, err)

		// Verify only exact folder matches were updated
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		expectedNotesToTags := map[string][]string{
			"renamed/note1.md":       {"tag1"},
			"folder2/note2.md":       {"tag1"},
			"anotherfolder/note3.md": {"tag1"},
		}
		assert.Equal(t, expectedNotesToTags, notesToTagsMap.Notes)

		// Verify tag file was updated correctly
		pathToTag1File := getTagNotesFilePath(tempDir, "tag1")
		var tag1Array TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTag1File, &tag1Array)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"renamed/note1.md", "folder2/note2.md", "anotherfolder/note3.md"}, tag1Array.Notes)
	})

	t.Run("handles empty folder with no notes", func(t *testing.T) {
		tempDir := t.TempDir()

		// Setup some notes in other folders
		err := AddTags(tempDir, []string{"tag1"}, []string{"existingFolder/note1.md"})
		assert.NoError(t, err)

		// Try to rename a folder that has no notes
		err = UpdateFolderNameInTags(tempDir, "nonexistentFolder", "newName")
		assert.NoError(t, err)

		// Verify nothing was changed
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		expectedNotesToTags := map[string][]string{
			"existingFolder/note1.md": {"tag1"},
		}
		assert.Equal(t, expectedNotesToTags, notesToTagsMap.Notes)
	})

	t.Run("handles notes with no tags", func(t *testing.T) {
		tempDir := t.TempDir()

		// Create notes_to_tags.json file but don't add any tags
		err := config.CreateNoteToTagsMapIfNotExists(tempDir)
		assert.NoError(t, err)

		// Try to rename a folder
		err = UpdateFolderNameInTags(tempDir, "oldFolder", "newFolder")
		assert.NoError(t, err)

		// Verify the file still exists and is unchanged
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)
		assert.Empty(t, notesToTagsMap.Notes)
	})

	t.Run("handles nonexistent tags gracefully", func(t *testing.T) {
		tempDir := t.TempDir()

		// Manually create notes_to_tags.json with a tag that doesn't have a directory
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		err := config.CreateNoteToTagsMapIfNotExists(tempDir)
		assert.NoError(t, err)

		// Manually add a note with a tag that doesn't exist as a directory
		initialMap := config.NotesToTagsMap{
			Notes: map[string][]string{
				"oldFolder/note1.md": {"nonexistentTag"},
			},
		}
		err = util.WriteJsonToPath(pathToNotesToTagsFile, initialMap)
		assert.NoError(t, err)

		// Execute the function
		err = UpdateFolderNameInTags(tempDir, "oldFolder", "newFolder")
		assert.NoError(t, err)

		// Verify notes_to_tags.json was still updated
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		expectedNotesToTags := map[string][]string{
			"newFolder/note1.md": {"nonexistentTag"},
		}
		assert.Equal(t, expectedNotesToTags, notesToTagsMap.Notes)
	})

	t.Run("handles complex nested folder structures", func(t *testing.T) {
		tempDir := t.TempDir()

		// Setup notes in nested folder structures
		notePaths := []string{
			"oldFolder/note1.md",
			"oldFolder/subfolder/note2.md",
			"oldFolder/subfolder/nested/note3.md",
			"otherFolder/oldFolder/note4.md", // This should NOT be renamed
		}

		err := AddTags(tempDir, []string{"tag1"}, notePaths)
		assert.NoError(t, err)

		// Rename the top-level oldFolder
		err = UpdateFolderNameInTags(tempDir, "oldFolder", "newFolder")
		assert.NoError(t, err)

		// Verify the updates
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		expectedNotesToTags := map[string][]string{
			"newFolder/note1.md":                  {"tag1"},
			"newFolder/subfolder/note2.md":        {"tag1"},
			"newFolder/subfolder/nested/note3.md": {"tag1"},
			"otherFolder/oldFolder/note4.md":      {"tag1"}, // Should remain unchanged
		}
		assert.Equal(t, expectedNotesToTags, notesToTagsMap.Notes)

		// Verify tag file
		pathToTag1File := getTagNotesFilePath(tempDir, "tag1")
		var tag1Array TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTag1File, &tag1Array)
		assert.NoError(t, err)
		expectedNotes := []string{
			"newFolder/note1.md",
			"newFolder/subfolder/note2.md",
			"newFolder/subfolder/nested/note3.md",
			"otherFolder/oldFolder/note4.md",
		}
		assert.ElementsMatch(t, expectedNotes, tag1Array.Notes)
	})
}

func TestUpdateNoteNameInTags(t *testing.T) {
	t.Run("updates note name in tags successfully", func(t *testing.T) {
		tempDir := t.TempDir()

		// Setup: Create notes with tags
		err := AddTags(tempDir, []string{"tag1", "tag2"}, []string{"folder/old-note.md"})
		assert.NoError(t, err)
		err = AddTags(tempDir, []string{"tag2", "tag3"}, []string{"folder/other-note.md"})
		assert.NoError(t, err)
		err = AddTags(tempDir, []string{"tag1"}, []string{"folder/old-note.md"})
		assert.NoError(t, err)

		// Execute the function under test
		err = UpdateNoteNameInTags(tempDir, "folder/old-note.md", "folder/new-note.md")
		assert.NoError(t, err)

		// Verify notes_to_tags.json was updated correctly
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		// Check that the note name was updated
		expectedNotesToTags := map[string][]string{
			"folder/new-note.md":   {"tag1", "tag2"},
			"folder/other-note.md": {"tag2", "tag3"},
		}
		assert.Equal(t, expectedNotesToTags, notesToTagsMap.Notes)

		// Verify individual tag files were updated
		// Check tag1 notes.json
		pathToTag1File := getTagNotesFilePath(tempDir, "tag1")
		var tag1Array TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTag1File, &tag1Array)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"folder/new-note.md"}, tag1Array.Notes)

		// Check tag2 notes.json
		pathToTag2File := getTagNotesFilePath(tempDir, "tag2")
		var tag2Array TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTag2File, &tag2Array)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"folder/new-note.md", "folder/other-note.md"}, tag2Array.Notes)

		// Check tag3 notes.json (should only have the unchanged note)
		pathToTag3File := getTagNotesFilePath(tempDir, "tag3")
		var tag3Array TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTag3File, &tag3Array)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"folder/other-note.md"}, tag3Array.Notes)
	})

	t.Run("handles renaming note with no tags", func(t *testing.T) {
		tempDir := t.TempDir()

		// Setup: Create a note with tags and another without
		err := AddTags(tempDir, []string{"tag1"}, []string{"folder/tagged-note.md"})
		assert.NoError(t, err)

		// Try to rename a note that doesn't have any tags
		err = UpdateNoteNameInTags(tempDir, "folder/untagged-note.md", "folder/renamed-untagged.md")
		assert.NoError(t, err)

		// Verify the existing tagged note was not affected
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		expectedNotesToTags := map[string][]string{
			"folder/tagged-note.md": {"tag1"},
		}
		assert.Equal(t, expectedNotesToTags, notesToTagsMap.Notes)

		// Verify tag1 still has the correct note
		pathToTag1File := getTagNotesFilePath(tempDir, "tag1")
		var tag1Array TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTag1File, &tag1Array)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"folder/tagged-note.md"}, tag1Array.Notes)
	})

	t.Run("handles exact path matching", func(t *testing.T) {
		tempDir := t.TempDir()

		// Setup notes with similar names
		err := AddTags(tempDir, []string{"tag1"}, []string{
			"folder/note.md",
			"folder/note-extended.md",
			"folder/my-note.md",
		})
		assert.NoError(t, err)

		// Rename only "folder/note.md" (not the others)
		err = UpdateNoteNameInTags(tempDir, "folder/note.md", "folder/renamed.md")
		assert.NoError(t, err)

		// Verify only the exact match was updated
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		expectedNotesToTags := map[string][]string{
			"folder/renamed.md":       {"tag1"},
			"folder/note-extended.md": {"tag1"},
			"folder/my-note.md":       {"tag1"},
		}
		assert.Equal(t, expectedNotesToTags, notesToTagsMap.Notes)

		// Verify tag file was updated correctly
		pathToTag1File := getTagNotesFilePath(tempDir, "tag1")
		var tag1Array TagsToNotesArray
		err = util.ReadJsonFromPath(pathToTag1File, &tag1Array)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"folder/renamed.md", "folder/note-extended.md", "folder/my-note.md"}, tag1Array.Notes)
	})

	t.Run("handles renaming note with multiple tags", func(t *testing.T) {
		tempDir := t.TempDir()

		// Setup: Create a note with multiple tags
		err := AddTags(tempDir, []string{"tag1", "tag2", "tag3", "tag4"}, []string{"project/important-note.md"})
		assert.NoError(t, err)

		// Rename the note
		err = UpdateNoteNameInTags(tempDir, "project/important-note.md", "project/critical-note.md")
		assert.NoError(t, err)

		// Verify notes_to_tags.json was updated
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		expectedNotesToTags := map[string][]string{
			"project/critical-note.md": {"tag1", "tag2", "tag3", "tag4"},
		}
		assert.Equal(t, expectedNotesToTags, notesToTagsMap.Notes)

		// Verify all tag files were updated
		for _, tagName := range []string{"tag1", "tag2", "tag3", "tag4"} {
			pathToTagFile := getTagNotesFilePath(tempDir, tagName)
			var tagArray TagsToNotesArray
			err = util.ReadJsonFromPath(pathToTagFile, &tagArray)
			assert.NoError(t, err)
			assert.ElementsMatch(t, []string{"project/critical-note.md"}, tagArray.Notes, "Expected tag %s to contain the renamed note", tagName)
		}
	})

	t.Run("handles nonexistent tags gracefully", func(t *testing.T) {
		tempDir := t.TempDir()

		// Manually create notes_to_tags.json with a tag that doesn't have a directory
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		err := config.CreateNoteToTagsMapIfNotExists(tempDir)
		assert.NoError(t, err)

		// Manually add a note with a tag that doesn't exist as a directory
		initialMap := config.NotesToTagsMap{
			Notes: map[string][]string{
				"folder/note.md": {"nonexistentTag"},
			},
		}
		err = util.WriteJsonToPath(pathToNotesToTagsFile, initialMap)
		assert.NoError(t, err)

		// Execute the function
		err = UpdateNoteNameInTags(tempDir, "folder/note.md", "folder/renamed-note.md")
		assert.NoError(t, err)

		// Verify notes_to_tags.json was still updated
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		expectedNotesToTags := map[string][]string{
			"folder/renamed-note.md": {"nonexistentTag"},
		}
		assert.Equal(t, expectedNotesToTags, notesToTagsMap.Notes)
	})

	t.Run("handles mixed scenarios with multiple notes", func(t *testing.T) {
		tempDir := t.TempDir()

		// Setup: Create multiple notes with various tag combinations
		err := AddTags(tempDir, []string{"shared", "unique1"}, []string{"docs/note1.md"})
		assert.NoError(t, err)
		err = AddTags(tempDir, []string{"shared", "unique2"}, []string{"docs/note2.md"})
		assert.NoError(t, err)
		err = AddTags(tempDir, []string{"shared"}, []string{"docs/note3.md"})
		assert.NoError(t, err)

		// Rename one note
		err = UpdateNoteNameInTags(tempDir, "docs/note2.md", "docs/updated-note2.md")
		assert.NoError(t, err)

		// Verify notes_to_tags.json
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)

		expectedNotesToTags := map[string][]string{
			"docs/note1.md":         {"shared", "unique1"},
			"docs/updated-note2.md": {"shared", "unique2"},
			"docs/note3.md":         {"shared"},
		}
		assert.Equal(t, expectedNotesToTags, notesToTagsMap.Notes)

		// Verify shared tag contains all notes (with updated name)
		pathToSharedTagFile := getTagNotesFilePath(tempDir, "shared")
		var sharedTagArray TagsToNotesArray
		err = util.ReadJsonFromPath(pathToSharedTagFile, &sharedTagArray)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"docs/note1.md", "docs/updated-note2.md", "docs/note3.md"}, sharedTagArray.Notes)

		// Verify unique1 tag still has note1
		pathToUnique1TagFile := getTagNotesFilePath(tempDir, "unique1")
		var unique1TagArray TagsToNotesArray
		err = util.ReadJsonFromPath(pathToUnique1TagFile, &unique1TagArray)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"docs/note1.md"}, unique1TagArray.Notes)

		// Verify unique2 tag has the renamed note
		pathToUnique2TagFile := getTagNotesFilePath(tempDir, "unique2")
		var unique2TagArray TagsToNotesArray
		err = util.ReadJsonFromPath(pathToUnique2TagFile, &unique2TagArray)
		assert.NoError(t, err)
		assert.ElementsMatch(t, []string{"docs/updated-note2.md"}, unique2TagArray.Notes)
	})

	t.Run("handles empty tag system", func(t *testing.T) {
		tempDir := t.TempDir()

		// Create empty notes_to_tags.json
		err := config.CreateNoteToTagsMapIfNotExists(tempDir)
		assert.NoError(t, err)

		// Try to rename a note in an empty system
		err = UpdateNoteNameInTags(tempDir, "folder/note.md", "folder/renamed.md")
		assert.NoError(t, err)

		// Verify the system remains empty
		pathToNotesToTagsFile := getNotesToTagsFilePath(tempDir)
		var notesToTagsMap config.NotesToTagsMap
		err = util.ReadJsonFromPath(pathToNotesToTagsFile, &notesToTagsMap)
		assert.NoError(t, err)
		assert.Empty(t, notesToTagsMap.Notes)
	})
}
