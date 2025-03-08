package services

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/list_helpers"
	"github.com/etesam913/bytebook/lib/note_helpers"
	"github.com/etesam913/bytebook/lib/project_helpers"
	"github.com/etesam913/bytebook/lib/project_types"
)

type NoteService struct {
	ProjectPath string
}

type NoteMarkdownResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    string `json:"data"`
}

type AddFolderResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func (n *NoteService) GetNotes(folderName string, sortOption string) project_types.NoteResponse {
	folderPath := filepath.Join(n.ProjectPath, "notes", folderName)
	// Ensure the directory exists
	if _, err := os.Stat(folderPath); err != nil {
		return project_types.NoteResponse{Success: false, Message: err.Error(), Data: []string{}}
	}

	files, err := os.ReadDir(folderPath)
	if err != nil {
		return project_types.NoteResponse{Success: false, Message: err.Error(), Data: []string{}}
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
	list_helpers.SortNotes(notes, sortOption)

	var sortedNotes []string

	// Using the query param syntax that the app supports
	for _, file := range notes {
		indexOfDot := strings.LastIndex(file.Name(), ".")
		name := file.Name()[:indexOfDot]
		extension := file.Name()[indexOfDot+1:]
		sortedNotes = append(sortedNotes, fmt.Sprintf("%s?ext=%s", name, extension))
	}

	return project_types.NoteResponse{Success: true, Message: "", Data: sortedNotes}
}

func (n *NoteService) RenameNote(folderName string, oldNoteTitle string, newNoteTitle string) project_types.BackendResponseWithoutData {
	noteBase := filepath.Join(n.ProjectPath, "notes", folderName)

	doesExist, err := io_helpers.FileOrFolderExists(
		filepath.Join(noteBase, newNoteTitle+".md"),
	)

	if err != nil {
		return project_types.BackendResponseWithoutData{Success: false, Message: err.Error()}
	}

	if doesExist {
		return project_types.BackendResponseWithoutData{
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
		return project_types.BackendResponseWithoutData{Success: false, Message: err.Error()}
	}

	return project_types.BackendResponseWithoutData{Success: true, Message: "Note renamed successfully"}
}

func (n *NoteService) GetNoteMarkdown(path string) NoteMarkdownResponse {
	noteFilePath := filepath.Join(n.ProjectPath, path)

	noteContent, err := os.ReadFile(noteFilePath)
	if err != nil {
		return NoteMarkdownResponse{Success: false, Message: err.Error(), Data: ""}
	}
	return NoteMarkdownResponse{Success: true, Message: "Successfully Retrieved Note Markdown", Data: string(noteContent)}
}

func (n *NoteService) SetNoteMarkdown(folderName string, noteTitle string, markdown string) NoteMarkdownResponse {
	noteFilePath := filepath.Join(n.ProjectPath, "notes", folderName, fmt.Sprintf("%s.md", noteTitle))

	err := os.WriteFile(noteFilePath, []byte(markdown), 0644)

	if err != nil {
		return NoteMarkdownResponse{Success: false, Message: err.Error(), Data: ""}
	}
	return NoteMarkdownResponse{Success: true, Message: "Successfully set note markdown", Data: ""}
}

func AddFolder(folderName string, projectPath string) AddFolderResponse {
	pathToFolder := filepath.Join(projectPath, "notes", folderName)

	info, err := os.Stat(pathToFolder)
	if err == nil {
		if info.IsDir() {
			return AddFolderResponse{
				Success: false,
				Message: fmt.Sprintf("Folder name, \"%s\", already exists, please choose a different name", folderName),
			}
		}
	}

	// Ensure the directory exists
	if err := os.MkdirAll(pathToFolder, os.ModePerm); err != nil {
		return AddFolderResponse{Success: false, Message: err.Error()}
	}
	return AddFolderResponse{Success: true, Message: ""}
}

func (n *NoteService) AddNoteToFolder(folderName string, noteName string) AddFolderResponse {
	noteFolderPath := filepath.Join(n.ProjectPath, "notes", folderName)
	pathToNote := filepath.Join(noteFolderPath, fmt.Sprintf("%s.md", noteName))

	info, err := os.Stat(pathToNote)

	if err == nil && info.Mode().IsRegular() {
		return AddFolderResponse{
			Success: false,
			Message: fmt.Sprintf("Note name, \"%s\", already exists, please choose a different name", noteName),
		}
	}

	// Create an empty markdown file at the location
	err = os.WriteFile(pathToNote, []byte(""), 0644)

	if err != nil {
		fmt.Printf("Error writing to %s: %v", noteFolderPath, err)
		return AddFolderResponse{Success: false, Message: err.Error()}
	}

	return AddFolderResponse{Success: true, Message: ""}
}

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

		exists, err := io_helpers.FileOrFolderExists(notePath)
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
func (n *NoteService) MoveToTrash(folderAndNotes []string) project_types.BackendResponseWithoutData {
	return io_helpers.MoveNotesToTrash(n.ProjectPath, folderAndNotes)
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
func (n *NoteService) RevealNoteInFinder(folderName, noteName string) project_types.BackendResponseWithoutData {
	notePath := filepath.Join(n.ProjectPath, "notes", folderName, noteName)
	err := io_helpers.RevealInFinder(notePath)
	if err != nil {
		return project_types.BackendResponseWithoutData{Success: false, Message: "Could not reveal folder in finder"}
	}
	return project_types.BackendResponseWithoutData{Success: true, Message: ""}
}

type NotePreviewData struct {
	FirstLine     string `json:"firstLine"`
	FirstImageSrc string `json:"firstImageSrc"`
	Size          int64  `json:"size"`
	LastUpdated   string `json:"lastUpdated"`
}

func (n *NoteService) MoveNoteToFolder(notePaths []string, newFolder string) project_types.BackendResponseWithoutData {
	failedNoteNames := []string{}
	for _, pathToNote := range notePaths {
		fullPathToNote := filepath.Join(n.ProjectPath, "notes", pathToNote)
		fullPathWithNewFolder := filepath.Join(n.ProjectPath, "notes", newFolder, filepath.Base(pathToNote))
		err := io_helpers.MoveFile(fullPathToNote, fullPathWithNewFolder)

		if err != nil {
			failedNoteNames = append(failedNoteNames, pathToNote)
		}
	}

	if len(failedNoteNames) > 0 {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf(
				"Failed to move %s into %s", project_helpers.FormatStringListForErrorMessage(failedNoteNames, 3), newFolder,
			),
		}
	}

	return project_types.BackendResponseWithoutData{Success: true, Message: ""}
}

func (n *NoteService) GetNotePreview(path string) project_types.BackendResponseWithData[NotePreviewData] {
	fileExtension := filepath.Ext(path)
	noteFilePath := filepath.Join(n.ProjectPath, path)
	noteSize := int64(0)
	lastUpdated := ""
	firstLine := ""
	firstImageSrc := ""
	fileInfo, err := os.Stat(noteFilePath)
	if err == nil {
		noteSize = fileInfo.Size()
		lastUpdated = fileInfo.ModTime().Format(time.RFC3339)
	}
	if fileExtension == ".md" {
		noteContent, err := os.ReadFile(noteFilePath)
		if err != nil {
			return project_types.BackendResponseWithData[NotePreviewData]{
				Success: false,
				Message: err.Error(),
				Data: NotePreviewData{
					FirstLine:     "",
					FirstImageSrc: "",
					Size:          noteSize,
					LastUpdated:   lastUpdated,
				},
			}
		}
		firstLine = note_helpers.GetFirstLine(string(noteContent))
		firstImageSrc = note_helpers.GetFirstImageSrc(string(noteContent))
	}
	return project_types.BackendResponseWithData[NotePreviewData]{
		Success: true,
		Message: "Successfully retrieved note preview",
		Data:    NotePreviewData{FirstLine: firstLine, FirstImageSrc: firstImageSrc, Size: noteSize, LastUpdated: lastUpdated},
	}
}
