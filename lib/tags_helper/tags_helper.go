package tags_helper

import (
	"os"
	"path/filepath"
	"slices"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/list_helpers"
)

type NotesToTagsMap struct {
	Tags map[string][]string `json:"tags"`
}

type TagsToNotesArray struct {
	Notes []string `json:"notes"`
}

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
			NotesToTagsMap{Tags: map[string][]string{}},
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
		if existingTags, exists := notesToTagsMap.Tags[note]; exists {
			notesToTagsMap.Tags[note] = append(existingTags, tags...)
		} else {
			notesToTagsMap.Tags[note] = tags
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
		notesToTagsMap.Tags[note] = list_helpers.Filter(
			notesToTagsMap.Tags[note],
			func(curTag string) bool {
				return !slices.Contains(tags, curTag)
			},
		)
		if len(notesToTagsMap.Tags[note]) == 0 {
			delete(notesToTagsMap.Tags, note)
		}
	}

	if err := io_helpers.WriteJsonToPath(pathToNoteToTagsMap, notesToTagsMap); err != nil {
		return err
	}

	return nil
}
