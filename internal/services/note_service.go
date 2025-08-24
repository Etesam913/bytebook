package services

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
)

type NoteService struct {
	ProjectPath string
	SearchIndex bleve.Index
}

// GetNotes returns a list of note filenames (with extension as a query param) in the specified folder,
// sorted according to the provided sortOption. Only files (not directories or hidden files) are included.
// Returns a BackendResponseWithData containing the sorted note names or an error message.
func (n *NoteService) GetNotes(folderName string, sortOption string) config.BackendResponseWithData[[]config.FolderAndNote] {
	folderPath := filepath.Join(n.ProjectPath, "notes", folderName)
	// Ensure the directory exists
	exists, err := util.FileOrFolderExists(folderPath)
	if !exists || err != nil {
		return config.BackendResponseWithData[[]config.FolderAndNote]{
			Success: false,
			Message: "Could not get notes from " + folderPath,
			Data:    []config.FolderAndNote{},
		}
	}

	files, err := os.ReadDir(folderPath)
	if err != nil {
		return config.BackendResponseWithData[[]config.FolderAndNote]{
			Success: false,
			Message: err.Error(),
			Data:    []config.FolderAndNote{},
		}
	}
	var notes []os.DirEntry
	for _, file := range files {
		// Ignore any folders inside a note folder and hidden files
		if file.IsDir() || strings.HasPrefix(file.Name(), ".") {
			continue
		} else {
			notes = append(notes, file)
		}
	}

	// Sort notes based on the sort option
	util.SortNotes(notes, sortOption)

	var sortedNotes []config.FolderAndNote

	// Using the query param syntax that the app supports
	for _, file := range notes {
		sortedNotes = append(sortedNotes, config.FolderAndNote{
			Folder: folderName,
			Note:   file.Name(),
		})
	}

	return config.BackendResponseWithData[[]config.FolderAndNote]{
		Success: true,
		Message: "",
		Data:    sortedNotes,
	}
}

// RenameNote renames a note file within a folder from oldNoteTitle to newNoteTitle (both without extension).
// Returns a BackendResponseWithoutData indicating success or failure.
func (n *NoteService) RenameNote(folderName string, oldNoteTitle string, newNoteTitle string) config.BackendResponseWithoutData {
	noteBase := filepath.Join(n.ProjectPath, "notes", folderName)
	pathToNewNote := filepath.Join(noteBase, newNoteTitle+".md")
	doesExist, err := util.FileOrFolderExists(
		pathToNewNote,
	)

	if err != nil {
		return config.BackendResponseWithoutData{Success: false, Message: err.Error()}
	}

	if doesExist {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("%s already exists in /%s", newNoteTitle, folderName),
		}
	}

	// Rename the markdown file to match the new note title
	err = os.Rename(
		filepath.Join(noteBase, fmt.Sprintf("%s.md", oldNoteTitle)),
		filepath.Join(noteBase, fmt.Sprintf("%s.md", newNoteTitle)),
	)
	if err != nil {
		return config.BackendResponseWithoutData{Success: false, Message: err.Error()}
	}

	return config.BackendResponseWithoutData{Success: true, Message: "Note renamed successfully"}
}

// RenameFile renames a file from oldFolderNotePath to newFolderNotePath.
// Both paths should be relative to the notes directory (e.g., "folder/note.ext").
// Returns a BackendResponseWithData containing the new path or an error message.
func (n *NoteService) RenameFile(oldFolderNotePath string, newFolderNotePath string) config.BackendResponseWithData[string] {
	oldPath := filepath.Join(n.ProjectPath, "notes", oldFolderNotePath)
	newPath := filepath.Join(n.ProjectPath, "notes", newFolderNotePath)

	// Check if the old file exists
	exists, err := util.FileOrFolderExists(oldPath)
	if !exists || err != nil {
		return config.BackendResponseWithData[string]{
			Success: false,
			Message: "Source file does not exist",
			Data:    "",
		}
	}

	// Check if the new file already exists
	newExists, err := util.FileOrFolderExists(newPath)
	if err != nil {
		return config.BackendResponseWithData[string]{
			Success: false,
			Message: err.Error(),
			Data:    "",
		}
	}

	if newExists {
		return config.BackendResponseWithData[string]{
			Success: false,
			Message: "A file with the new name already exists",
			Data:    "",
		}
	}

	// Ensure the destination directory exists
	newDir := filepath.Dir(newPath)
	if err := os.MkdirAll(newDir, os.ModePerm); err != nil {
		return config.BackendResponseWithData[string]{
			Success: false,
			Message: err.Error(),
			Data:    "",
		}
	}

	// Rename the file
	err = os.Rename(oldPath, newPath)
	if err != nil {
		return config.BackendResponseWithData[string]{
			Success: false,
			Message: err.Error(),
			Data:    "",
		}
	}

	return config.BackendResponseWithData[string]{
		Success: true,
		Message: "File renamed successfully",
		Data:    newFolderNotePath,
	}
}

// GetNoteMarkdown reads and returns the markdown content of a note at the given path (relative to project root).
// Returns a BackendResponseWithData containing the markdown string or an error message.
func (n *NoteService) GetNoteMarkdown(path string) config.BackendResponseWithData[string] {
	noteFilePath := filepath.Join(n.ProjectPath, path)

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
// It also indexes the note in the search index.
// Returns a BackendResponseWithData indicating success or failure.
func (n *NoteService) SetNoteMarkdown(
	folderName string,
	noteTitle string,
	markdown string,
) config.BackendResponseWithData[string] {
	noteName := fmt.Sprintf("%s.md", noteTitle)
	noteFilePath := filepath.Join(n.ProjectPath, "notes", folderName, noteName)
	noteId := filepath.Join(folderName, noteName)

	err := os.WriteFile(noteFilePath, []byte(markdown), 0644)
	if err != nil {
		return config.BackendResponseWithData[string]{
			Success: false,
			Message: err.Error(),
			Data:    "",
		}
	}

	bleveMarkdownDocument := search.CreateMarkdownNoteBleveDocument(
		markdown,
		folderName,
		noteName,
	)

	err = n.SearchIndex.Index(noteId, bleveMarkdownDocument)
	if err != nil {
		return config.BackendResponseWithData[string]{
			Success: false,
			Message: fmt.Sprintf("Error indexing note %s: %v", noteId, err),
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
	noteFolderPath := filepath.Join(n.ProjectPath, "notes", folderName)
	pathToNote := filepath.Join(noteFolderPath, fmt.Sprintf("%s.md", noteName))

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
// that currently exist in the notes directory, formatted as "folder/note?ext=ext".
// Used to filter out recently used notes that have been deleted or moved.
func (n *NoteService) ValidateMostRecentNotes(paths []string) []string {
	var validPaths []string

	for _, path := range paths {
		pathParts := strings.Split(path, "/")
		if len(pathParts) != 2 {
			// Invalid path format
			continue
		}

		folder := pathParts[0]
		note := pathParts[1]

		notePath := filepath.Join(n.ProjectPath, "notes", folder, note)

		exists, err := util.FileOrFolderExists(notePath)
		if exists && err == nil {
			lastIndexOfDot := -1
			pathAsRunes := []rune(path)
			for i := len(pathAsRunes) - 1; i > -1; i-- {
				if pathAsRunes[i] == '.' {
					lastIndexOfDot = i
					break
				}
			}
			if lastIndexOfDot == -1 {
				continue
			}
			folderAndNote := pathAsRunes[0:lastIndexOfDot]
			extension := pathAsRunes[lastIndexOfDot+1:]

			fullPath := string(folderAndNote) + "?ext=" + string(extension)
			validPaths = append(validPaths, fullPath)
		}

	}
	return validPaths
}

// MoveToTrash moves the specified folders and notes to the trash directory.
// Parameters:
//
//	folderAndNotes: A slice of strings representing the paths of the folders and notes to be moved.
//
// Returns:
//
//	A MostRecentNoteResponse indicating the success or failure of the operation.
func (n *NoteService) MoveToTrash(folderAndNotes []string) config.BackendResponseWithoutData {
	err := util.MoveNotesToTrash(n.ProjectPath, folderAndNotes)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: err.Error(),
		}
	}
	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully moved notes to trash",
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
		path = filepath.Join(n.ProjectPath, pathToFolderOrFile)
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
	for _, pathToNote := range notePaths {
		fullPathToNote := filepath.Join(n.ProjectPath, "notes", pathToNote)
		fullPathWithNewFolder := filepath.Join(n.ProjectPath, "notes", newFolder, filepath.Base(pathToNote))
		err := util.MoveFile(fullPathToNote, fullPathWithNewFolder)

		if err != nil {
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

// GetNotePreview retrieves preview data for a note at the given path, including the first line,
// first image source, file size, and last updated timestamp. If there is an error reading the note,
// it will still return any metadata that could be retrieved, with Success=false.
func (n *NoteService) GetNotePreview(path string) config.BackendResponseWithData[NotePreviewData] {
	noteFilePath := filepath.Join(n.ProjectPath, path)

	processedData, err := notes.ProcessNoteContent(noteFilePath)

	if err != nil {
		// This error comes from notes.ProcessNoteContent if reading a .md file failed.
		// We still return any data that might have been populated (e.g., Size, LastUpdated if os.Stat succeeded).
		return config.BackendResponseWithData[NotePreviewData]{
			Success: false,
			Message: err.Error(),
			Data: NotePreviewData{
				FirstLine:     processedData.FirstLine,     // Will be empty if .md read failed
				FirstImageSrc: processedData.FirstImageSrc, // Will be empty if .md read failed
				Size:          processedData.Size,
				LastUpdated:   processedData.LastUpdated,
			},
		}
	}

	return config.BackendResponseWithData[NotePreviewData]{
		Success: true,
		Message: "Successfully retrieved note preview",
		Data: NotePreviewData{
			FirstLine:     processedData.FirstLine,
			FirstImageSrc: processedData.FirstImageSrc,
			Size:          processedData.Size,
			LastUpdated:   processedData.LastUpdated,
		},
	}
}

// DoesNoteExist checks if a note exists at the given path relative to the project's notes directory.
// Returns true if the note exists, false otherwise.
func (n *NoteService) DoesNoteExist(path string) bool {
	fullPath := filepath.Join(n.ProjectPath, "notes", path)
	doesExist, _ := util.FileOrFolderExists(fullPath)
	return doesExist
}
