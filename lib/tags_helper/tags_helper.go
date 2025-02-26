package tags_helper

import (
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/lib/io_helpers"
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
