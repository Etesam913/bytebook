package services

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/util"
)

type NoteService struct {
	ProjectPath string
	SearchIndex *bleve.Index
}

const PageSize = 200

type NotesPageResponseData struct {
	Notes            []config.FolderAndNote `json:"notes"`
	TotalCount       int                    `json:"totalCount"`
	InitialItemIndex int                    `json:"initialItemIndex"`
}

// GetNotesInPage returns a paginated list of note filenames (with extension) in the specified folder,
// sorted according to the provided sortOption. Only files (not directories or hidden files) are included.
// Returns a BackendResponseWithData containing the notes for the page, total count, and initial item index.
func (n *NoteService) GetNotesInPage(folderName string, sortOption string, pageIndex int) config.BackendResponseWithData[NotesPageResponseData] {
	folderPath := filepath.Join(n.ProjectPath, "notes", folderName)
	// Ensure the directory exists
	exists, err := util.FileOrFolderExists(folderPath)
	if !exists || err != nil {
		return config.BackendResponseWithData[NotesPageResponseData]{
			Success: false,
			Message: "Could not get notes from " + folderPath,
			Data:    NotesPageResponseData{Notes: []config.FolderAndNote{}, TotalCount: 0, InitialItemIndex: 0},
		}
	}

	files, err := os.ReadDir(folderPath)
	if err != nil {
		return config.BackendResponseWithData[NotesPageResponseData]{
			Success: false,
			Message: err.Error(),
			Data:    NotesPageResponseData{Notes: []config.FolderAndNote{}, TotalCount: 0, InitialItemIndex: 0},
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

	totalCount := len(notes)
	startIndex := pageIndex * PageSize
	endIndex := startIndex + PageSize

	if startIndex > totalCount {
		startIndex = totalCount
	}
	if endIndex > totalCount {
		endIndex = totalCount
	}

	var paginatedNotes []config.FolderAndNote

	// Using the query param syntax that the app supports
	for i := startIndex; i < endIndex; i++ {
		paginatedNotes = append(paginatedNotes, config.FolderAndNote{
			Folder: folderName,
			Note:   notes[i].Name(),
		})
	}

	return config.BackendResponseWithData[NotesPageResponseData]{
		Success: true,
		Message: "",
		Data: NotesPageResponseData{
			Notes:            paginatedNotes,
			TotalCount:       totalCount,
			InitialItemIndex: startIndex,
		},
	}
}

// GetPageForNote returns the page index where a specific note is located.
// It finds the note's position in the sorted list and calculates the page.
func (n *NoteService) GetPageForNote(folderName string, sortOption string, noteName string) config.BackendResponseWithData[int] {
	folderPath := filepath.Join(n.ProjectPath, "notes", folderName)
	// Ensure the directory exists
	exists, err := util.FileOrFolderExists(folderPath)
	if !exists || err != nil {
		return config.BackendResponseWithData[int]{
			Success: false,
			Message: "Could not get notes from " + folderPath,
			Data:    0,
		}
	}

	files, err := os.ReadDir(folderPath)
	if err != nil {
		return config.BackendResponseWithData[int]{
			Success: false,
			Message: err.Error(),
			Data:    0,
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

	// Find the note's index
	for i, file := range notes {
		if file.Name() == noteName {
			pageIndex := i / PageSize
			return config.BackendResponseWithData[int]{
				Success: true,
				Message: "",
				Data:    pageIndex,
			}
		}
	}

	// Note not found, return page 0
	return config.BackendResponseWithData[int]{
		Success: true,
		Message: "",
		Data:    0,
	}
}

// RenameFile renames a file or folder from oldFolderNotePath to newFolderNotePath.
// Both paths should be relative to the notes directory (e.g., "folder/note.ext" or "folder").
// Returns a BackendResponseWithData containing the new path or an error message.
func (n *NoteService) RenameFile(oldFolderNotePath string, newFolderNotePath string) config.BackendResponseWithData[string] {
	oldPath := filepath.Join(n.ProjectPath, "notes", oldFolderNotePath)
	newPath := filepath.Join(n.ProjectPath, "notes", newFolderNotePath)

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
// Returns a BackendResponseWithData indicating success or failure.
func (n *NoteService) SetNoteMarkdown(
	folderName string,
	noteTitle string,
	markdown string,
) config.BackendResponseWithData[string] {
	noteName := fmt.Sprintf("%s.md", noteTitle)
	noteFilePath := filepath.Join(n.ProjectPath, "notes", folderName, noteName)

	err := os.WriteFile(noteFilePath, []byte(markdown), 0644)
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
// that currently exist in the notes directory in the same format.
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
			validPaths = append(validPaths, path)
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
