package notes

import (
	"errors"
	"os"
	"path/filepath"
	"slices"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/util"
)

type TagsToNotesArray struct {
	Notes []string `json:"notes"`
}

const MAX_TAGS_PER_NOTE = 100000

// GetAllTags retrieves all tag names from the project's tags directory.
// It ensures the tags directory exists and returns a list of all tag folder names.
// Parameters:
//   - projectPath: The root path of the project
//
// Returns:
//   - A slice of tag names sorted alphabetically
//   - An error if directory operations fail
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

	// Sort tags alphabetically
	slices.Sort(tags)
	return tags, nil
}

// TagExists checks if a tag exists in the project's tags directory.
// It returns true only if both the tag directory and notes.json file exist.
// Parameters:
//   - projectPath: The root path of the project
//   - tagName: The name of the tag to check
//
// Returns:
//   - A boolean indicating whether the tag exists (both directory and notes.json file)
//   - An error if directory operations fail
func TagExists(projectPath string, tagName string) (bool, error) {
	tagDir := filepath.Join(projectPath, "tags", tagName)

	info, err := os.Stat(tagDir)
	if os.IsNotExist(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	if !info.IsDir() {
		return false, nil
	}

	// Check if notes.json file exists
	notesFile := filepath.Join(tagDir, "notes.json")
	_, err = os.Stat(notesFile)
	if os.IsNotExist(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return true, nil
}

/**
 * GetNotesFromTag retrieves a list of notes associated with a given tag.
 * If the tag doesn't exist, returns an empty array. If a sort option is provided,
 * the notes will be sorted accordingly and stale notes will be cleaned up.
 */
func GetNotesFromTag(projectPath string, tag string, sortOption *string) ([]string, error) {
	// If the tag does not exist, return an empty array
	exists, err := TagExists(projectPath, tag)
	if err != nil {
		return []string{}, err
	}
	if !exists {
		return []string{}, errors.New("tag does not exist")
	}

	pathToTagFile := filepath.Join(projectPath, "tags", tag, "notes.json")
	notesForGivenTagData := TagsToNotesArray{}

	// Gets the JSON notes data
	if err := util.ReadJsonFromPath(pathToTagFile, &notesForGivenTagData); err != nil {
		return nil, err
	}

	if sortOption == nil {
		return notesForGivenTagData.Notes, nil
	}

	notesFileInfo := []util.NoteWithFolder{}
	pathsToDelete := []string{}
	for _, notePath := range notesForGivenTagData.Notes {
		fullNotePath := filepath.Join(projectPath, "notes", notePath)
		fileInfo, err := os.Stat(fullNotePath)
		if err != nil || fileInfo.IsDir() {
			pathsToDelete = append(pathsToDelete, notePath)
			continue
		}
		frontendFileInfo, err := ConvertFileNameForFrontendUrl(notePath)
		if err != nil {
			continue
		}

		notesFileInfo = append(
			notesFileInfo,
			util.NoteWithFolder{
				Folder:  frontendFileInfo.Directory,
				Name:    frontendFileInfo.FileName,
				ModTime: fileInfo.ModTime(),
				Size:    fileInfo.Size(),
				Ext:     frontendFileInfo.Extension,
			},
		)
	}
	// Clean up stale tags in the notes.json file
	if err := deleteNotesFromTagToNotesArray(projectPath, tag, pathsToDelete); err != nil {
		return nil, err
	}

	// Sort the folders appropriately
	util.SortNotesWithFolders(notesFileInfo, *sortOption)
	sortedNotes := util.Map(notesFileInfo, func(noteInfo util.NoteWithFolder) string {
		return noteInfo.Folder + noteInfo.Name + "?ext=" + noteInfo.Ext
	})

	return sortedNotes, nil

}

type TagPreview struct {
	Count int `json:"count"`
}

/*
GetTagPreview retrieves a preview of a tag, which includes the count of notes associated with it.
It calls GetNotesFromTag to get the list of notes and returns the count.
*/
func GetTagPreview(projectPath string, tag string) (TagPreview, error) {
	notesForTag, err := GetNotesFromTag(projectPath, tag, nil)
	if err != nil {
		return TagPreview{Count: 0}, err
	}

	return TagPreview{Count: len(notesForTag)}, nil
}

// CreateTagToNotesArrayIfNotExists creates notes.json file for the given tag.
func CreateTagToNotesArrayIfNotExists(projectPath string, tag string) error {
	tagDir := filepath.Join(projectPath, "tags", tag)
	pathToTagToNotesArray := filepath.Join(tagDir, "notes.json")

	// Ensure the "tags" directory exists
	if err := os.MkdirAll(tagDir, os.ModePerm); err != nil {
		return err
	}

	_, err := util.CreateJSONFileIfNotExists(pathToTagToNotesArray)

	if err != nil {
		return err
	}

	_, err = util.ReadOrCreateJSON(pathToTagToNotesArray, TagsToNotesArray{Notes: []string{}})
	if err != nil {
		return err
	}
	return nil
}

// addNotesToTagNotesArray adds each notePath to the notes.json file for the given tag.
func addNotesToTagNotesArray(projectPath string, tag string, notePaths []string) error {
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

// deleteNotesFromTagToNotesArray removes each notePath from the notes.json file for the given tag.
func deleteNotesFromTagToNotesArray(projectPath string, tag string, notePaths []string) error {
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

// GetTagsForNotes retrieves the tags associated with each note from the notes_to_tags.json file.
// It returns a map where each key is a note path and the value is an array of associated tags.
// If any note in the input array doesn't have any tags, it returns an error.
//
// Parameters:
//   - projectPath: The path to the project directory
//   - notes: An array of note paths to look up tags for
//
// Returns:
//   - A map of note paths to their associated tags
//   - An error if the operation fails or if any note has no tags
func GetTagsForNotes(projectPath string, notes []string) (map[string][]string, error) {
	pathToNoteToTagsMap := filepath.Join(projectPath, "tags", "notes_to_tags.json")

	err := config.CreateNoteToTagsMapIfNotExists(projectPath)

	if err != nil {
		return map[string][]string{}, err
	}

	notesToTagsMap := config.NotesToTagsMap{}
	if err := util.ReadJsonFromPath(pathToNoteToTagsMap, &notesToTagsMap); err != nil {
		return map[string][]string{}, err
	}
	notesToTagsMapForDesiredNotes := map[string][]string{}
	for _, note := range notes {
		if tags, exists := notesToTagsMap.Notes[note]; exists {
			notesToTagsMapForDesiredNotes[note] = tags
		} else {
			// The note does not have any tags
			continue
		}
	}

	return notesToTagsMapForDesiredNotes, nil
}

// AddNoteToTagsMap adds key-value pairs to the notes_to_tags.json file.
func addTagsToNotesToTagsMap(projectPath string, notes []string, tags []string) error {
	pathToNoteToTagsMap := filepath.Join(projectPath, "tags", "notes_to_tags.json")

	err := config.CreateNoteToTagsMapIfNotExists(projectPath)

	if err != nil {
		return err
	}

	notesToTagsMap := config.NotesToTagsMap{}
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

// DeleteStaleTagsFromNotesToTagsMap removes stale tags from the notes_to_tags.json file.
// It filters out any tags that exist in the staleTags set and removes notes that have no remaining tags.
//
// Parameters:
//   - projectPath: The path to the project directory
//   - staleTags: A set of tag names that should be removed from all notes
//
// Returns:
//   - An error if the operation fails, otherwise nil
func DeleteStaleTagsFromNotesToTagsMap(projectPath string, staleTags util.Set[string]) error {
	pathToNoteToTagsMap := filepath.Join(projectPath, "tags", "notes_to_tags.json")

	err := config.CreateNoteToTagsMapIfNotExists(projectPath)

	if err != nil {
		return err
	}

	notesToTagsMap := config.NotesToTagsMap{}
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
func deleteTagsFromNotesToTagsMap(projectPath string, notes []string, tags []string) error {
	pathToNoteToTagsMap := filepath.Join(projectPath, "tags", "notes_to_tags.json")

	err := config.CreateNoteToTagsMapIfNotExists(projectPath)

	if err != nil {
		return err
	}

	notesToTagsMap := config.NotesToTagsMap{}
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

// AddTags adds the specified tags to the given notes.
// It updates both the tag-to-notes mapping (notes.json files) and the notes-to-tags mapping.
//
// Parameters:
//   - projectPath: The path to the project directory
//   - tagNames: A slice of tag names to add
//   - notePaths: A slice of note paths to associate with the tags
//
// Returns:
//   - An error if the operation fails, otherwise nil
func AddTags(projectPath string, tagNames []string, notePaths []string) error {
	// Add notes to each tag's notes.json file
	for _, tagName := range tagNames {
		err := addNotesToTagNotesArray(projectPath, tagName, notePaths)
		if err != nil {
			return err
		}
	}

	// Update the notes-to-tags mapping
	err := addTagsToNotesToTagsMap(projectPath, notePaths, tagNames)
	if err != nil {
		return err
	}

	return nil
}

// DeleteTags removes the specified tags from the given notes.
// It updates both the tag-to-notes mapping (notes.json files) and the notes-to-tags mapping.
//
// Parameters:
//   - projectPath: The path to the project directory
//   - tagNames: A slice of tag names to remove
//   - notePaths: A slice of note paths to disassociate from the tags
//
// Returns:
//   - An error if the operation fails, otherwise nil
func DeleteTags(projectPath string, tagNames []string, notePaths []string) error {
	// Remove notes from each tag's notes.json file
	for _, tagName := range tagNames {
		err := deleteNotesFromTagToNotesArray(projectPath, tagName, notePaths)
		if err != nil {
			return err
		}
	}

	// Update the notes-to-tags mapping
	err := deleteTagsFromNotesToTagsMap(projectPath, notePaths, tagNames)
	if err != nil {
		return err
	}

	return nil
}

// SetTags sets the exact tags for the given notes, replacing any existing tags.
// It updates both the tag-to-notes mapping (notes.json files) and the notes-to-tags mapping.
// This function first removes the notes from all existing tags, then adds them to the specified tags.
//
// Parameters:
//   - projectPath: The path to the project directory
//   - tagNames: A slice of tag names that should be the only tags for these notes
//   - notePaths: A slice of note paths to set tags for
//
// Returns:
//   - An error if the operation fails, otherwise nil
func SetTags(projectPath string, tagNames []string, notePaths []string) error {
	// First, get the current tags for these notes so we can remove them from old tags
	currentTagsMap, err := GetTagsForNotes(projectPath, notePaths)
	if err != nil {
		// If notes don't have any tags currently, that's okay, we'll just add the new ones
		currentTagsMap = make(map[string][]string)
	}

	// Collect all current tags that need to be removed
	currentTagsSet := make(util.Set[string])
	for _, tags := range currentTagsMap {
		for _, tag := range tags {
			currentTagsSet.Add(tag)
		}
	}

	// Remove notes from all current tags using DeleteTags
	if len(currentTagsSet) > 0 {
		currentTagsSlice := currentTagsSet.Elements()
		err := DeleteTags(projectPath, currentTagsSlice, notePaths)
		if err != nil {
			return err
		}
	}

	// Add notes to the new tags using AddTags
	if len(tagNames) > 0 {
		err = AddTags(projectPath, tagNames, notePaths)
		if err != nil {
			return err
		}
	}

	return nil
}

// updateNotesToTagsMapForFolderRename updates the notes_to_tags.json file when a folder is renamed.
// It returns a map of old note paths to their tags for notes that were updated.
//
// Parameters:
//   - projectPath: The path to the project directory
//   - oldFolderName: The current folder name that needs to be updated
//   - newFolderName: The new folder name to replace the old one
//
// Returns:
//   - A map of old note paths to their associated tags for updated notes
//   - An error if the operation fails, otherwise nil
func updateNotesToTagsMapForFolderRename(projectPath string, oldFolderName string, newFolderName string) (map[string][]string, error) {
	pathToNoteToTagsMap := filepath.Join(projectPath, "tags", "notes_to_tags.json")

	err := config.CreateNoteToTagsMapIfNotExists(projectPath)
	if err != nil {
		return nil, err
	}

	notesToTagsMap := config.NotesToTagsMap{}
	if err := util.ReadJsonFromPath(pathToNoteToTagsMap, &notesToTagsMap); err != nil {
		return nil, err
	}

	// Track which notes were updated and their associated tags
	updatedNotes := make(map[string][]string) // old note path -> tags
	newNotesToTagsMap := make(map[string][]string)

	// Update notes_to_tags.json
	for notePath, tags := range notesToTagsMap.Notes {
		if len(notePath) > len(oldFolderName) && notePath[:len(oldFolderName)+1] == oldFolderName+"/" {
			// This note starts with the old folder name
			newNotePath := newFolderName + notePath[len(oldFolderName):]
			updatedNotes[notePath] = tags
			newNotesToTagsMap[newNotePath] = tags
		} else {
			// Keep the note path as is
			newNotesToTagsMap[notePath] = tags
		}
	}

	// Write the updated notes_to_tags.json
	notesToTagsMap.Notes = newNotesToTagsMap
	if err := util.WriteJsonToPath(pathToNoteToTagsMap, notesToTagsMap); err != nil {
		return nil, err
	}

	return updatedNotes, nil
}

// updateTagNotesFilesForFolderRename updates individual tag notes.json files when a folder is renamed.
//
// Parameters:
//   - projectPath: The path to the project directory
//   - oldFolderName: The current folder name that needs to be updated
//   - newFolderName: The new folder name to replace the old one
//   - updatedNotes: A map of old note paths to their tags (from updateNotesToTagsMapForFolderRename)
//
// Returns:
//   - An error if the operation fails, otherwise nil
func updateTagNotesFilesForFolderRename(projectPath string, oldFolderName string, newFolderName string, updatedNotes map[string][]string) error {
	// Update individual tag notes.json files
	allTagsToUpdate := make(util.Set[string])
	for _, tags := range updatedNotes {
		for _, tag := range tags {
			allTagsToUpdate.Add(tag)
		}
	}

	// For each tag that needs updating
	for _, tagName := range allTagsToUpdate.Elements() {
		pathToTagFile := filepath.Join(projectPath, "tags", tagName, "notes.json")

		// Check if tag exists
		exists, err := TagExists(projectPath, tagName)
		if err != nil {
			return err
		}
		if !exists {
			continue // Skip if tag doesn't exist
		}

		notesForGivenTagData := TagsToNotesArray{}
		if err := util.ReadJsonFromPath(pathToTagFile, &notesForGivenTagData); err != nil {
			return err
		}

		// Update notes in this tag's notes.json
		updatedTagNotes := make([]string, 0, len(notesForGivenTagData.Notes))
		for _, notePath := range notesForGivenTagData.Notes {
			if len(notePath) > len(oldFolderName) && notePath[:len(oldFolderName)+1] == oldFolderName+"/" {
				// Update this note path
				newNotePath := newFolderName + notePath[len(oldFolderName):]
				updatedTagNotes = append(updatedTagNotes, newNotePath)
			} else {
				// Keep the note path as is
				updatedTagNotes = append(updatedTagNotes, notePath)
			}
		}

		// Write the updated tag notes.json
		notesForGivenTagData.Notes = updatedTagNotes
		if err := util.WriteJsonToPath(pathToTagFile, notesForGivenTagData); err != nil {
			return err
		}
	}

	return nil
}

// UpdateFolderNameInTags updates all references to notes in the old folder name
// to use the new folder name in both notes_to_tags.json and individual tag notes.json files.
//
// Parameters:
//   - projectPath: The path to the project directory
//   - oldFolderName: The current folder name that needs to be updated
//   - newFolderName: The new folder name to replace the old one
//
// Returns:
//   - An error if the operation fails, otherwise nil
func UpdateFolderNameInTags(projectPath string, oldFolderName string, newFolderName string) error {
	// Update the notes_to_tags.json file
	updatedNotes, err := updateNotesToTagsMapForFolderRename(projectPath, oldFolderName, newFolderName)
	if err != nil {
		return err
	}

	// Update individual tag notes.json files
	err = updateTagNotesFilesForFolderRename(projectPath, oldFolderName, newFolderName, updatedNotes)
	if err != nil {
		return err
	}

	return nil
}

// updateNotesToTagsMapForNoteRename updates the notes_to_tags.json file when a note is renamed.
// It returns the tags associated with the renamed note.
//
// Parameters:
//   - projectPath: The path to the project directory
//   - oldFolderAndNoteName: The current note path that needs to be updated (e.g., "folder/note.md")
//   - newFolderAndNoteName: The new note path to replace the old one (e.g., "folder/new-note.md")
//
// Returns:
//   - A slice of tags associated with the renamed note
//   - An error if the operation fails, otherwise nil
func updateNotesToTagsMapForNoteRename(projectPath string, oldFolderAndNoteName string, newFolderAndNoteName string) ([]string, error) {
	pathToNoteToTagsMap := filepath.Join(projectPath, "tags", "notes_to_tags.json")

	err := config.CreateNoteToTagsMapIfNotExists(projectPath)
	if err != nil {
		return nil, err
	}

	notesToTagsMap := config.NotesToTagsMap{}
	if err := util.ReadJsonFromPath(pathToNoteToTagsMap, &notesToTagsMap); err != nil {
		return nil, err
	}

	// Find the tags for the old note name
	var tagsForNote []string
	newNotesToTagsMap := make(map[string][]string)

	// Update notes_to_tags.json
	for notePath, tags := range notesToTagsMap.Notes {
		if notePath == oldFolderAndNoteName {
			// This is the note we want to rename
			tagsForNote = tags
			newNotesToTagsMap[newFolderAndNoteName] = tags
		} else {
			// Keep the note path as is
			newNotesToTagsMap[notePath] = tags
		}
	}

	// Write the updated notes_to_tags.json
	notesToTagsMap.Notes = newNotesToTagsMap
	if err := util.WriteJsonToPath(pathToNoteToTagsMap, notesToTagsMap); err != nil {
		return nil, err
	}

	return tagsForNote, nil
}

// updateTagNotesFilesForNoteRename updates individual tag notes.json files when a note is renamed.
//
// Parameters:
//   - projectPath: The path to the project directory
//   - oldFolderAndNoteName: The current note path that needs to be updated
//   - newFolderAndNoteName: The new note path to replace the old one
//   - tagsForNote: A slice of tags associated with the renamed note (from updateNotesToTagsMapForNoteRename)
//
// Returns:
//   - An error if the operation fails, otherwise nil
func updateTagNotesFilesForNoteRename(projectPath string, oldFolderAndNoteName string, newFolderAndNoteName string, tagsForNote []string) error {
	// Update individual tag notes.json files
	for _, tagName := range tagsForNote {
		pathToTagFile := filepath.Join(projectPath, "tags", tagName, "notes.json")

		// Check if tag exists
		exists, err := TagExists(projectPath, tagName)
		if err != nil {
			return err
		}
		if !exists {
			continue // Skip if tag doesn't exist
		}

		notesForGivenTagData := TagsToNotesArray{}
		if err := util.ReadJsonFromPath(pathToTagFile, &notesForGivenTagData); err != nil {
			return err
		}

		// Update notes in this tag's notes.json
		updatedTagNotes := make([]string, 0, len(notesForGivenTagData.Notes))
		for _, notePath := range notesForGivenTagData.Notes {
			if notePath == oldFolderAndNoteName {
				// Replace with the new note name
				updatedTagNotes = append(updatedTagNotes, newFolderAndNoteName)
			} else {
				// Keep the note path as is
				updatedTagNotes = append(updatedTagNotes, notePath)
			}
		}

		// Write the updated tag notes.json
		notesForGivenTagData.Notes = updatedTagNotes
		if err := util.WriteJsonToPath(pathToTagFile, notesForGivenTagData); err != nil {
			return err
		}
	}

	return nil
}

// UpdateNoteNameInTags updates all references to a specific note when it is renamed.
// It updates both the notes_to_tags.json file and individual tag notes.json files.
//
// Parameters:
//   - projectPath: The path to the project directory
//   - oldFolderAndNoteName: The current note path that needs to be updated (e.g., "folder/note.md")
//   - newFolderAndNoteName: The new note path to replace the old one (e.g., "folder/new-note.md")
//
// Returns:
//   - An error if the operation fails, otherwise nil
func UpdateNoteNameInTags(projectPath string, oldFolderAndNoteName string, newFolderAndNoteName string) error {
	// Update the notes_to_tags.json file
	tagsForNote, err := updateNotesToTagsMapForNoteRename(projectPath, oldFolderAndNoteName, newFolderAndNoteName)
	if err != nil {
		return err
	}

	// Update individual tag notes.json files
	err = updateTagNotesFilesForNoteRename(projectPath, oldFolderAndNoteName, newFolderAndNoteName, tagsForNote)
	if err != nil {
		return err
	}

	return nil
}
