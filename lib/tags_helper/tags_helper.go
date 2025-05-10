package tags_helper

import (
	"errors"
	"os"
	"path/filepath"
	"slices"

	"github.com/etesam913/bytebook/internal/util"
)

type NotesToTagsMap struct {
	Notes map[string][]string `json:"notes"`
}

type TagsToNotesArray struct {
	Notes []string `json:"notes"`
}

const MAX_TAGS_PER_NOTE = 100000

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

	err := util.CreateFileIfNotExist(pathToTagToNotesArray)

	if err != nil {
		return err
	}

	tagToNotesArray := TagsToNotesArray{}
	if err = util.ReadJsonFromPath(pathToTagToNotesArray, &tagToNotesArray); err != nil {
		err = util.WriteJsonToPath(
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
	if err := util.ReadJsonFromPath(pathToTagToNotesArray, &tagToNotesArray); err != nil {
		return err
	}

	// Append notePaths that are not already present.
	for _, notePath := range notePaths {
		if !slices.Contains(tagToNotesArray.Notes, notePath) {
			tagToNotesArray.Notes = append(tagToNotesArray.Notes, notePath)
		}
	}

	if err := util.WriteJsonToPath(pathToTagToNotesArray, tagToNotesArray); err != nil {
		return err
	}

	return nil
}

// DeleteNotesFromTagToNotesArray removes each notePath from the notes.json file for the given tag.
func DeleteNotesFromTagToNotesArray(projectPath string, tag string, notePaths []string) error {
	if len(notePaths) == 0 {
		return nil
	}
	pathToTagToNotesArray := filepath.Join(projectPath, "tags", tag, "notes.json")

	// Ensure the notes.json file exists.
	if err := CreateTagToNotesArrayIfNotExists(projectPath, tag); err != nil {
		return err
	}

	tagToNotesArray := TagsToNotesArray{}
	if err := util.ReadJsonFromPath(pathToTagToNotesArray, &tagToNotesArray); err != nil {
		return err
	}

	// Filter out the notePaths that should be removed.
	tagToNotesArray.Notes = util.Filter(tagToNotesArray.Notes, func(note string) bool {
		return !slices.Contains(notePaths, note)
	})

	if err := util.WriteJsonToPath(pathToTagToNotesArray, tagToNotesArray); err != nil {
		return err
	}

	return nil
}

// CreateNoteToTagsMapIfNotExists ensures that the note-to-tags map exists.
func CreateNoteToTagsMapIfNotExists(projectPath string) error {
	pathToNoteToTagsMap := filepath.Join(projectPath, "tags", "notes_to_tags.json")

	// Default empty map structure
	defaultMap := NotesToTagsMap{
		Notes: map[string][]string{},
	}

	_, err := util.ReadOrCreateJSON(pathToNoteToTagsMap, defaultMap)

	return err
}

func GetTagsForNotes(projectPath string, notes []string) (map[string][]string, error) {
	pathToNoteToTagsMap := filepath.Join(projectPath, "tags", "notes_to_tags.json")

	err := CreateNoteToTagsMapIfNotExists(projectPath)

	if err != nil {
		return map[string][]string{}, err
	}

	notesToTagsMap := NotesToTagsMap{}
	if err := util.ReadJsonFromPath(pathToNoteToTagsMap, &notesToTagsMap); err != nil {
		return map[string][]string{}, err
	}
	notesToTagsMapForDesiredNotes := map[string][]string{}
	for _, note := range notes {
		if tags, exists := notesToTagsMap.Notes[note]; exists {
			notesToTagsMapForDesiredNotes[note] = tags
		} else {
			return map[string][]string{}, errors.New("note does not have any tags")
		}
	}

	return notesToTagsMapForDesiredNotes, nil
}

// AddNoteToTagsMap adds key-value pairs to the notes_to_tags.json file.
func AddTagsToNotesToTagsMap(projectPath string, notes []string, tags []string) error {
	pathToNoteToTagsMap := filepath.Join(projectPath, "tags", "notes_to_tags.json")

	err := CreateNoteToTagsMapIfNotExists(projectPath)

	if err != nil {
		return err
	}

	notesToTagsMap := NotesToTagsMap{}
	if err := util.ReadJsonFromPath(pathToNoteToTagsMap, &notesToTagsMap); err != nil {
		return err
	}

	for _, note := range notes {
		if existingTags, exists := notesToTagsMap.Notes[note]; exists {
			newNotes := util.RemoveDuplicates(append(existingTags, tags...))
			notesToTagsMap.Notes[note] = newNotes
		} else {
			notesToTagsMap.Notes[note] = tags
		}
	}

	if err := util.WriteJsonToPath(pathToNoteToTagsMap, notesToTagsMap); err != nil {
		return err
	}

	return nil
}

func DeleteStaleTagsFromNotesToTagsMap(projectPath string, staleTags util.Set[string]) error {
	pathToNoteToTagsMap := filepath.Join(projectPath, "tags", "notes_to_tags.json")

	err := CreateNoteToTagsMapIfNotExists(projectPath)

	if err != nil {
		return err
	}

	notesToTagsMap := NotesToTagsMap{}
	if err := util.ReadJsonFromPath(pathToNoteToTagsMap, &notesToTagsMap); err != nil {
		return err
	}

	for note, tagsForNote := range notesToTagsMap.Notes {
		notesToTagsMap.Notes[note] = util.Filter(
			tagsForNote,
			func(tagName string) bool {
				return !staleTags.Has(tagName)
			},
		)
		if len(notesToTagsMap.Notes[note]) == 0 {
			delete(notesToTagsMap.Notes, note)
		}
	}

	if err := util.WriteJsonToPath(pathToNoteToTagsMap, notesToTagsMap); err != nil {
		return err
	}

	return nil
}

// DeleteNoteFromTagsMap deletes key-value pairs from the notes_to_tags.json file.
func DeleteTagsFromNotesToTagsMap(projectPath string, notes []string, tags []string) error {
	pathToNoteToTagsMap := filepath.Join(projectPath, "tags", "notes_to_tags.json")

	err := CreateNoteToTagsMapIfNotExists(projectPath)

	if err != nil {
		return err
	}

	notesToTagsMap := NotesToTagsMap{}
	if err := util.ReadJsonFromPath(pathToNoteToTagsMap, &notesToTagsMap); err != nil {
		return err
	}

	for _, note := range notes {
		notesToTagsMap.Notes[note] = util.Filter(
			notesToTagsMap.Notes[note],
			func(curTag string) bool {
				return !slices.Contains(tags, curTag)
			},
		)
		if len(notesToTagsMap.Notes[note]) == 0 {
			delete(notesToTagsMap.Notes, note)
		}
	}

	if err := util.WriteJsonToPath(pathToNoteToTagsMap, notesToTagsMap); err != nil {
		return err
	}

	return nil
}
