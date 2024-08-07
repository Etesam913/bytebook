package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/project_helpers"
)

type NoteService struct {
	ProjectPath string
}

type NoteResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	Data    []string `json:"data"`
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

// SortStrings represents the possible sort options as a custom type.
type SortStrings string

// Constants representing each possible sort option.
const (
	DateUpdatedDesc SortStrings = "date-updated-desc"
	DateUpdatedAsc  SortStrings = "date-updated-asc"
	DateCreatedDesc SortStrings = "date-created-desc"
	DateCreatedAsc  SortStrings = "date-created-asc"
	FileNameAZ      SortStrings = "file-name-a-z"
	FileNameZA      SortStrings = "file-name-z-a"
	SizeDesc        SortStrings = "size-desc"
	SizeAsc         SortStrings = "size-asc"
)

func (n *NoteService) GetNotes(folderName string, sortOption SortStrings) NoteResponse {
	folderPath := filepath.Join(n.ProjectPath, "notes", folderName)
	// Ensure the directory exists
	if _, err := os.Stat(folderPath); err != nil {
		fmt.Println(err, fmt.Sprintf(": Cannot get notes from this %s because it does not exist", folderName))
		return NoteResponse{Success: false, Message: err.Error(), Data: []string{}}
	}

	files, err := os.ReadDir(folderPath)
	if err != nil {
		return NoteResponse{Success: false, Message: err.Error(), Data: []string{}}
	}

	var notes []os.DirEntry
	for _, file := range files {
		// Ignore any folders inside a note folder
		if file.IsDir() {
			continue
		} else {
			notes = append(notes, file)
		}
	}

	// Sort notes based on the sort option
	sort.Slice(notes, func(i, j int) bool {
		switch sortOption {
		case DateUpdatedDesc:
			infoI, _ := notes[i].Info()
			infoJ, _ := notes[j].Info()
			return infoI.ModTime().After(infoJ.ModTime())
		case DateUpdatedAsc:
			infoI, _ := notes[i].Info()
			infoJ, _ := notes[j].Info()
			return infoI.ModTime().Before(infoJ.ModTime())
		// TODO: CreatedDate is not correct as the file info does not have this information. Will need to do some frontmatter parsing
		case DateCreatedDesc:
			infoI, _ := notes[i].Info()
			infoJ, _ := notes[j].Info()
			return infoI.ModTime().After(infoJ.ModTime()) // Note: Creation time might not be available, use ModTime as fallback
		case DateCreatedAsc:
			infoI, _ := notes[i].Info()
			infoJ, _ := notes[j].Info()
			return infoI.ModTime().Before(infoJ.ModTime()) // Note: Creation time might not be available, use ModTime as fallback
		case FileNameAZ:
			return strings.ToLower(notes[i].Name()) < strings.ToLower(notes[j].Name())
		case FileNameZA:
			return strings.ToLower(notes[i].Name()) > strings.ToLower(notes[j].Name())
		case SizeDesc:
			infoI, _ := notes[i].Info()
			infoJ, _ := notes[j].Info()
			return infoI.Size() > infoJ.Size()
		case SizeAsc:
			infoI, _ := notes[i].Info()
			infoJ, _ := notes[j].Info()
			return infoI.Size() < infoJ.Size()
		default:
			return false
		}
	})

	var sortedNotes []string
	for _, file := range notes {
		indexOfDot := strings.LastIndex(file.Name(), ".")
		name := file.Name()[:indexOfDot]
		extension := file.Name()[indexOfDot+1:]
		sortedNotes = append(sortedNotes, fmt.Sprintf("%s?ext=%s", name, extension))
	}

	return NoteResponse{Success: true, Message: "", Data: sortedNotes}
}

func (n *NoteService) RenameNote(folderName string, oldNoteTitle string, newNoteTitle string) NoteResponse {
	noteBase := filepath.Join(n.ProjectPath, "notes", folderName)

	doesExist, err := io_helpers.FileOrFolderExists(
		filepath.Join(noteBase, newNoteTitle+".md"),
	)

	if err != nil {
		return NoteResponse{Success: false, Message: err.Error()}
	}

	if doesExist {
		return NoteResponse{
			Success: false,
			Message: fmt.Sprintf("%s already exists in /%s", newNoteTitle, folderName),
		}
	}

	fmt.Println("😂", filepath.Join(noteBase, fmt.Sprintf("%s.md", oldNoteTitle)), filepath.Join(noteBase, fmt.Sprintf("%s.md", newNoteTitle)))

	// Rename the markdown file to match the new note title
	err = os.Rename(
		filepath.Join(noteBase, fmt.Sprintf("%s.md", oldNoteTitle)),
		filepath.Join(noteBase, fmt.Sprintf("%s.md", newNoteTitle)),
	)
	if err != nil {
		return NoteResponse{Success: false, Message: err.Error()}
	}

	return NoteResponse{Success: true, Message: "Note renamed successfully"}
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

		folderName := pathParts[0]
		noteTitle := pathParts[1]

		folderPath := filepath.Join(n.ProjectPath, "notes", folderName)
		noteFilePath := filepath.Join(folderPath, fmt.Sprintf("%s.md", noteTitle))

		// Check if the note file exists
		_, err := os.Stat(noteFilePath)
		if err == nil {
			validPaths = append(validPaths, path)
		}
	}

	return validPaths
}

type MostRecentNoteResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// MoveToTrash moves the specified folders and notes to the trash directory.
// Parameters:
//
//	folderAndNotes: A slice of strings representing the paths of the folders and notes to be moved.
//
// Returns:
//
//	A MostRecentNoteResponse indicating the success or failure of the operation.
func (n *NoteService) MoveToTrash(folderAndNotes []string) MostRecentNoteResponse {
	errors := []string{} // Slice to store any errors encountered during the process.

	// Iterate over each path in the provided folderAndNotes slice.
	for _, path := range folderAndNotes {
		// Split the path into parts using "/" as the delimiter.
		pathParts := strings.Split(path, "/")

		// Extract the filename from the path using a helper function.
		_, fileName, _ := project_helpers.Pop(pathParts)

		// Construct the full path of the file to be moved.
		fullPath := filepath.Join(n.ProjectPath, "notes", path)

		fmt.Println(fileName, fullPath)
		// Attempt to move the file to the trash directory.
		err := io_helpers.MoveFile(fullPath, filepath.Join(n.ProjectPath, "trash", fileName))
		if err != nil {
			// If an error occurs, add the filename to the errors slice.
			errors = append(errors, fileName)
		}
	}

	// If any errors were encountered, return a failure response with the list of errors.
	if len(errors) > 0 {
		return MostRecentNoteResponse{
			Success: false,
			Message: fmt.Sprintf("Could not move %s to trash", strings.Join(errors, ", ")),
		}
	}

	// If no errors were encountered, return a success response.
	return MostRecentNoteResponse{
		Success: true,
		Message: "Successfully moved to trash",
	}
}

type NoteCountResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    int    `json:"data"`
}

func (n *NoteService) GetNoteCount(folderName string) NoteCountResponse {
	count, err := io_helpers.CountFilesInDirectory(filepath.Join(n.ProjectPath, "notes", folderName))
	if err != nil {
		return NoteCountResponse{
			Success: false,
			Message: err.Error(),
			Data:    0,
		}
	}
	return NoteCountResponse{
		Success: true,
		Message: "",
		Data:    count,
	}
}
