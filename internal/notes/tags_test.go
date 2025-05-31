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

	t.Run("returns error when note does not exist", func(t *testing.T) {
		tags, err := GetTagsForNotes(projectPath, []string{"note3"})
		assert.Error(t, err)
		assert.Equal(t, map[string][]string{}, tags)
		assert.Equal(t, "note does not have any tags", err.Error())
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
