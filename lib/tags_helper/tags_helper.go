package tags_helper

import (
	"os"
	"path/filepath"
	"slices"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/list_helpers"
)

type NotesToTagsMap struct {
	Notes map[string][]string `json:"notes"`
}

type TagsToNotesArray struct {
	Notes []string `json:"notes"`
}

func GetAllTags(projectPath string) ([]string, error) {
	tags := []string{}
	tagsFolder := filepath.Join(projectPath, "tags")

	// Ensure the "tags" directory exists
	if err := os.MkdirAll(tagsFolder, os.ModePerm); err != nil {
		return nil, err
	}

	tagFolders, err := os.ReadDir(tagsFolder)
	if err != nil {
		return nil, err
	}
	for _, tagFolder := range tagFolders {
		if tagFolder.IsDir() {
			tags = append(tags, tagFolder.Name())
		}
	}
	return tags, nil
}

// CreateTagToNotesArrayIfNotExists creates notes.json file for the given tag.
func CreateTagToNotesArrayIfNotExists(projectPath string, tag string) error {
	tagDir := filepath.Join(projectPath, "tags", tag)
	pathToTagToNotesArray := filepath.Join(tagDir, "notes.json")

	// Ensure the "tags" directory exists
	if err := os.MkdirAll(tagDir, os.ModePerm); err != nil {
		return err
	}

	err := io_helpers.CreateFileIfNotExist(pathToTagToNotesArray)

	if err != nil {
		return err
	}

	tagToNotesArray := TagsToNotesArray{}
	if err = io_helpers.ReadJsonFromPath(pathToTagToNotesArray, &tagToNotesArray); err != nil {
		err = io_helpers.WriteJsonToPath(
			pathToTagToNotesArray,
			TagsToNotesArray{Notes: []string{}},
		)

		if err != nil {
			return err
		}
	}
	return nil
}

// AddNotesToTagToNotesArray adds each notePath to the notes.json file for the given tag.
func AddNotesToTagToNotesArray(projectPath string, tag string, notePaths []string) error {
	pathToTagToNotesArray := filepath.Join(projectPath, "tags", tag, "notes.json")

	// Ensure the notes.json file exists.
	if err := CreateTagToNotesArrayIfNotExists(projectPath, tag); err != nil {
		return err
	}

	tagToNotesArray := TagsToNotesArray{}
	if err := io_helpers.ReadJsonFromPath(pathToTagToNotesArray, &tagToNotesArray); err != nil {
		return err
	}

	// Append notePaths that are not already present.
	for _, notePath := range notePaths {
		if !slices.Contains(tagToNotesArray.Notes, notePath) {
			tagToNotesArray.Notes = append(tagToNotesArray.Notes, notePath)
		}
	}

	if err := io_helpers.WriteJsonToPath(pathToTagToNotesArray, tagToNotesArray); err != nil {
		return err
	}

	return nil
}

// TODO: Remove this interface and just return the error
type DeleteNotesResponse struct {
	NotesRemaining int
	Err            error
}

// DeleteNotesFromTagToNotesArray removes each notePath from the notes.json file for the given tag.
func DeleteNotesFromTagToNotesArray(projectPath string, tag string, notePaths []string) DeleteNotesResponse {
	if len(notePaths) == 0 {
		return DeleteNotesResponse{
			NotesRemaining: 0,
			Err:            nil,
		}
	}
	pathToTagToNotesArray := filepath.Join(projectPath, "tags", tag, "notes.json")

	// Ensure the notes.json file exists.
	if err := CreateTagToNotesArrayIfNotExists(projectPath, tag); err != nil {
		return DeleteNotesResponse{
			NotesRemaining: 0,
			Err:            err,
		}
	}

	tagToNotesArray := TagsToNotesArray{}
	if err := io_helpers.ReadJsonFromPath(pathToTagToNotesArray, &tagToNotesArray); err != nil {
		return DeleteNotesResponse{
			NotesRemaining: 0,
			Err:            err,
		}
	}

	// Filter out the notePaths that should be removed.
	tagToNotesArray.Notes = list_helpers.Filter(tagToNotesArray.Notes, func(note string) bool {
		return !slices.Contains(notePaths, note)
	})

	if err := io_helpers.WriteJsonToPath(pathToTagToNotesArray, tagToNotesArray); err != nil {
		return DeleteNotesResponse{
			NotesRemaining: len(tagToNotesArray.Notes),
			Err:            err,
		}
	}

	return DeleteNotesResponse{
		NotesRemaining: len(tagToNotesArray.Notes),
		Err:            nil,
	}
}

// CreateNoteToTagsMapIfNotExists ensures that the note-to-tags map exists.
func CreateNoteToTagsMapIfNotExists(projectPath string) error {
	tagsDir := filepath.Join(projectPath, "tags")

	// Ensure the "tags" directory exists
	if err := os.MkdirAll(tagsDir, os.ModePerm); err != nil {
		return err
	}

	pathToNoteToTagsMap := filepath.Join(tagsDir, "notes_to_tags.json")
	err := io_helpers.CreateFileIfNotExist(pathToNoteToTagsMap)

	if err != nil {
		return err
	}

	notesToTagsMap := NotesToTagsMap{}
	if err = io_helpers.ReadJsonFromPath(pathToNoteToTagsMap, &notesToTagsMap); err != nil {
		err = io_helpers.WriteJsonToPath(
			pathToNoteToTagsMap,
			NotesToTagsMap{Notes: map[string][]string{}},
		)

		if err != nil {
			return err
		}
	}

	return nil
}

// AddNoteToTagsMap adds key-value pairs to the notes_to_tags.json file.
func AddTagsToNotesToTagsMap(projectPath string, notes []string, tags []string) error {
	pathToNoteToTagsMap := filepath.Join(projectPath, "tags", "notes_to_tags.json")

	notesToTagsMap := NotesToTagsMap{}
	if err := io_helpers.ReadJsonFromPath(pathToNoteToTagsMap, &notesToTagsMap); err != nil {
		return err
	}

	for _, note := range notes {
		if existingTags, exists := notesToTagsMap.Notes[note]; exists {
			notesToTagsMap.Notes[note] = append(existingTags, tags...)
		} else {
			notesToTagsMap.Notes[note] = tags
		}
	}

	if err := io_helpers.WriteJsonToPath(pathToNoteToTagsMap, notesToTagsMap); err != nil {
		return err
	}

	return nil
}

// DeleteNoteFromTagsMap deletes key-value pairs from the notes_to_tags.json file.
func DeleteTagsFromNotesFromTagsMap(projectPath string, notes []string, tags []string) error {
	pathToNoteToTagsMap := filepath.Join(projectPath, "tags", "notes_to_tags.json")

	notesToTagsMap := NotesToTagsMap{}
	if err := io_helpers.ReadJsonFromPath(pathToNoteToTagsMap, &notesToTagsMap); err != nil {
		return err
	}

	for _, note := range notes {
		notesToTagsMap.Notes[note] = list_helpers.Filter(
			notesToTagsMap.Notes[note],
			func(curTag string) bool {
				return !slices.Contains(tags, curTag)
			},
		)
		if len(notesToTagsMap.Notes[note]) == 0 {
			delete(notesToTagsMap.Notes, note)
		}
	}

	if err := io_helpers.WriteJsonToPath(pathToNoteToTagsMap, notesToTagsMap); err != nil {
		return err
	}

	return nil
}
