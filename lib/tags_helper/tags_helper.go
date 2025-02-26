package tags_helper

import (
	"os"
	"path/filepath"
	"slices"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/list_helpers"
)

type NotesToTagsMap struct {
	Data map[string][]string
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
			NotesToTagsMap{Data: map[string][]string{}},
		)

		if err != nil {
			return err
		}
	}

	return nil
}

// AddNoteToTagsMap adds key-value pairs to the notes_to_tags.json file.
func AddNotesToTagsMap(projectPath string, notes []string, tags []string) error {
	pathToNoteToTagsMap := filepath.Join(projectPath, "tags", "notes_to_tags.json")

	notesToTagsMap := NotesToTagsMap{}
	if err := io_helpers.ReadJsonFromPath(pathToNoteToTagsMap, &notesToTagsMap); err != nil {
		return err
	}

	for _, note := range notes {
		if existingTags, exists := notesToTagsMap.Data[note]; exists {
			notesToTagsMap.Data[note] = append(existingTags, tags...)
		} else {
			notesToTagsMap.Data[note] = tags
		}
	}

	if err := io_helpers.WriteJsonToPath(pathToNoteToTagsMap, notesToTagsMap); err != nil {
		return err
	}

	return nil
}

// DeleteNoteFromTagsMap deletes key-value pairs from the notes_to_tags.json file.
func DeleteNotesFromTagsMap(projectPath string, notes []string, tags []string) error {
	pathToNoteToTagsMap := filepath.Join(projectPath, "tags", "notes_to_tags.json")

	notesToTagsMap := NotesToTagsMap{}
	if err := io_helpers.ReadJsonFromPath(pathToNoteToTagsMap, &notesToTagsMap); err != nil {
		return err
	}

	for _, note := range notes {
		notesToTagsMap.Data[note] = list_helpers.Filter(
			notesToTagsMap.Data[note],
			func(curTag string) bool {
				return !slices.Contains(tags, curTag)
			},
		)
		if len(notesToTagsMap.Data[note]) == 0 {
			delete(notesToTagsMap.Data, note)
		}
	}

	if err := io_helpers.WriteJsonToPath(pathToNoteToTagsMap, notesToTagsMap); err != nil {
		return err
	}

	return nil
}
