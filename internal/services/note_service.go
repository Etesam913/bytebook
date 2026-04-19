package services

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/util"
)

type NoteService struct {
	ProjectPath string
	SearchIndex *bleve.Index
}

// RenameFile renames a file or folder from oldFolderNotePath to newFolderNotePath.
// Both paths should be relative to the notes directory (e.g., "folder/note.ext" or "folder").
// Returns a BackendResponseWithData containing the new path or an error message.
func (n *NoteService) RenameFile(oldFolderNotePath string, newFolderNotePath string) config.BackendResponseWithData[string] {
	notesRoot := filepath.Join(n.ProjectPath, "notes")
	oldPath, err := util.SafeJoin(notesRoot, oldFolderNotePath)
	if err != nil {
		return config.BackendResponseWithData[string]{Success: false, Message: err.Error(), Data: ""}
	}
	newPath, err := util.SafeJoin(notesRoot, newFolderNotePath)
	if err != nil {
		return config.BackendResponseWithData[string]{Success: false, Message: err.Error(), Data: ""}
	}

	// Check if the old file or folder exists
	exists, err := util.FileOrFolderExists(oldPath)
	if !exists || err != nil {
		return config.BackendResponseWithData[string]{
			Success: false,
			Message: "Source file or folder does not exist",
			Data:    "",
		}
	}

	// Get file info to determine if it's a directory or file
	oldInfo, err := os.Stat(oldPath)
	if err != nil {
		return config.BackendResponseWithData[string]{
			Success: false,
			Message: err.Error(),
			Data:    "",
		}
	}
	isDir := oldInfo.IsDir()

	// Check if the new path already exists
	newExists, err := util.FileOrFolderExists(newPath)
	if err != nil {
		return config.BackendResponseWithData[string]{
			Success: false,
			Message: err.Error(),
			Data:    "",
		}
	}

	if newExists {
		itemType := "file"
		if isDir {
			itemType = "folder"
		}
		return config.BackendResponseWithData[string]{
			Success: false,
			Message: fmt.Sprintf("A %s with the new name already exists", itemType),
			Data:    "",
		}
	}

	// For files, ensure the destination directory exists
	// For folders, os.Rename will handle directory creation if needed
	if !isDir {
		newDir := filepath.Dir(newPath)
		if err := os.MkdirAll(newDir, os.ModePerm); err != nil {
			return config.BackendResponseWithData[string]{
				Success: false,
				Message: err.Error(),
				Data:    "",
			}
		}
	}

	// Rename the file or folder
	err = os.Rename(oldPath, newPath)
	if err != nil {
		return config.BackendResponseWithData[string]{
			Success: false,
			Message: err.Error(),
			Data:    "",
		}
	}

	itemType := "File"
	if isDir {
		itemType = "Folder"
	}
	return config.BackendResponseWithData[string]{
		Success: true,
		Message: fmt.Sprintf("%s renamed successfully", itemType),
		Data:    newFolderNotePath,
	}
}

// GetNoteMarkdown reads and returns the markdown content of a note at the given path (relative to project root).
// Returns a BackendResponseWithData containing the markdown string or an error message.
func (n *NoteService) GetNoteMarkdown(path string) config.BackendResponseWithData[string] {
	noteFilePath, err := util.SafeJoin(n.ProjectPath, path)
	if err != nil {
		return config.BackendResponseWithData[string]{Success: false, Message: err.Error(), Data: ""}
	}

	noteContent, err := os.ReadFile(noteFilePath)
	if err != nil {
		return config.BackendResponseWithData[string]{
			Success: false,
			Message: err.Error(),
			Data:    "",
		}
	}
	return config.BackendResponseWithData[string]{
		Success: true,
		Message: "Successfully Retrieved Note Markdown",
		Data:    string(noteContent),
	}
}

// SetNoteMarkdown writes the provided markdown string to the note file specified by folderName and noteTitle.
// Returns a BackendResponseWithData indicating success or failure.
func (n *NoteService) SetNoteMarkdown(
	folderName string,
	noteTitle string,
	markdown string,
) config.BackendResponseWithData[string] {
	noteName := fmt.Sprintf("%s.md", noteTitle)
	noteFilePath, err := util.SafeJoin(filepath.Join(n.ProjectPath, "notes"), filepath.Join(folderName, noteName))
	if err != nil {
		return config.BackendResponseWithData[string]{Success: false, Message: err.Error(), Data: ""}
	}

	err = os.WriteFile(noteFilePath, []byte(markdown), 0644)
	if err != nil {
		return config.BackendResponseWithData[string]{
			Success: false,
			Message: err.Error(),
			Data:    "",
		}
	}

	return config.BackendResponseWithData[string]{
		Success: true,
		Message: "Successfully set note markdown",
		Data:    "",
	}
}

// AddNoteToFolder creates a new empty markdown note with the given noteName in the specified folder.
// Returns a BackendResponseWithoutData indicating success or failure.
func (n *NoteService) AddNoteToFolder(folderName string, noteName string) config.BackendResponseWithoutData {
	notesRoot := filepath.Join(n.ProjectPath, "notes")
	pathToNote, err := util.SafeJoin(notesRoot, filepath.Join(folderName, fmt.Sprintf("%s.md", noteName)))
	if err != nil {
		return config.BackendResponseWithoutData{Success: false, Message: err.Error()}
	}
	noteFolderPath := filepath.Dir(pathToNote)

	info, err := os.Stat(pathToNote)

	if err == nil && info.Mode().IsRegular() {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf(
				"Note name, \"%s\", already exists, please choose a different name",
				noteName,
			),
		}
	}

	// Create an empty markdown file at the location
	err = os.WriteFile(pathToNote, []byte(""), 0644)

	if err != nil {
		fmt.Printf("Error writing to %s: %v", noteFolderPath, err)
		return config.BackendResponseWithoutData{
			Success: false,
			Message: err.Error(),
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "",
	}
}

// ValidateMostRecentNotes takes a slice of note paths (in the form "folder/note.ext") and returns only those
// that currently exist in the notes directory in the same format.
// Used to filter out recently used notes that have been deleted or moved.
func (n *NoteService) ValidateMostRecentNotes(paths []string) []string {
	var validPaths []string
	notesRoot := filepath.Join(n.ProjectPath, "notes")

	for _, path := range paths {
		pathParts := strings.Split(path, "/")
		if len(pathParts) != 2 {
			// Invalid path format
			continue
		}

		notePath, err := util.SafeJoin(notesRoot, filepath.Join(pathParts[0], pathParts[1]))
		if err != nil {
			continue
		}

		exists, err := util.FileOrFolderExists(notePath)
		if exists && err == nil {
			validPaths = append(validPaths, path)
		}
	}
	return validPaths
}

// MoveToTrash moves the specified folders and notes to the trash directory.
// It returns restore metadata for app-level undo support.
func (n *NoteService) MoveToTrash(folderAndNotes []string) config.BackendResponseWithData[[]util.TrashRestoreInfo] {
	restoreItems, err := util.MoveNotesToTrash(n.ProjectPath, folderAndNotes)
	if err != nil {
		return config.BackendResponseWithData[[]util.TrashRestoreInfo]{
			Success: false,
			Message: err.Error(),
			Data:    nil,
		}
	}
	return config.BackendResponseWithData[[]util.TrashRestoreInfo]{
		Success: true,
		Message: "Successfully moved notes to trash",
		Data:    restoreItems,
	}
}

// RestoreFromTrash restores previously trashed notes and folders back to their original paths.
func (n *NoteService) RestoreFromTrash(restoreItems []util.TrashRestoreInfo) config.BackendResponseWithoutData {
	err := util.RestoreNotesFromTrash(n.ProjectPath, restoreItems)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: err.Error(),
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully restored notes from trash",
	}
}

// RevealNoteInFinder reveals the specified note in the Finder.
// Parameters:
//
//	folderName: The name of the folder containing the note.
//	noteName: The name of the note to be revealed.
//
// Returns:
//
//	A BackendResponseWithoutData indicating the success or failure of the operation.
func (n *NoteService) RevealFolderOrFileInFinder(
	pathToFolderOrFile string,
	shouldPrefixWithProjectPath bool,
) config.BackendResponseWithoutData {
	path := pathToFolderOrFile

	if shouldPrefixWithProjectPath {
		safePath, err := util.SafeJoin(n.ProjectPath, pathToFolderOrFile)
		if err != nil {
			return config.BackendResponseWithoutData{Success: false, Message: err.Error()}
		}
		path = safePath
	}
	err := util.RevealInFinder(path)
	if err != nil {
		fileInfo, statErr := os.Stat(path)
		if statErr != nil {
			return config.BackendResponseWithoutData{
				Success: false,
				Message: "Could not reveal item in finder",
			}
		}
		if fileInfo.IsDir() {
			return config.BackendResponseWithoutData{
				Success: false,
				Message: "Could not reveal folder in finder",
			}
		}
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Could not reveal file in finder",
		}
	}
	return config.BackendResponseWithoutData{
		Success: true,
		Message: "",
	}
}

// MoveNoteToFolder moves one or more notes to a new folder within the notes directory.
// It takes a slice of note paths relative to the notes directory and the name of the destination folder.
// If any notes fail to move, their names will be included in an error message.
// Returns a BackendResponseWithoutData indicating success or failure of the operation.
func (n *NoteService) MoveNoteToFolder(notePaths []string, newFolder string) config.BackendResponseWithoutData {
	failedNoteNames := []string{}
	notesRoot := filepath.Join(n.ProjectPath, "notes")
	for _, pathToNote := range notePaths {
		fullPathToNote, err := util.SafeJoin(notesRoot, pathToNote)
		if err != nil {
			failedNoteNames = append(failedNoteNames, pathToNote)
			continue
		}
		fullPathWithNewFolder, err := util.SafeJoin(notesRoot, filepath.Join(newFolder, filepath.Base(pathToNote)))
		if err != nil {
			failedNoteNames = append(failedNoteNames, pathToNote)
			continue
		}
		if err := util.MoveFile(fullPathToNote, fullPathWithNewFolder); err != nil {
			failedNoteNames = append(failedNoteNames, pathToNote)
		}
	}

	if len(failedNoteNames) > 0 {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf(
				"Failed to move %s into %s", util.FormatStringListForErrorMessage(failedNoteNames, 3), newFolder,
			),
		}
	}

	return config.BackendResponseWithoutData{Success: true, Message: ""}
}

type NotePreviewData struct {
	FirstLine     string `json:"firstLine"`
	FirstImageSrc string `json:"firstImageSrc"`
	Size          int64  `json:"size"`
	LastUpdated   string `json:"lastUpdated"`
}

// DoesNoteExist checks if a note exists at the given path relative to the project's notes directory.
// Returns true if the note exists, false otherwise.
func (n *NoteService) DoesNoteExist(path string) bool {
	fullPath, err := util.SafeJoin(filepath.Join(n.ProjectPath, "notes"), path)
	if err != nil {
		return false
	}
	doesExist, _ := util.FileOrFolderExists(fullPath)
	return doesExist
}
