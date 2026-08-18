package services

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes/sidecar"
	"github.com/etesam913/bytebook/internal/util"
)

type NoteService struct {
	ProjectPath string
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
			Message: fmt.Sprintf("A %s with that name already exists", itemType),
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

	if !isDir {
		oldSidecarPath := sidecar.PathFor(oldPath)
		if sidecarExists, err := util.FileOrFolderExists(oldSidecarPath); err != nil {
			return config.BackendResponseWithData[string]{
				Success: false,
				Message: err.Error(),
				Data:    "",
			}
		} else if sidecarExists {
			newSidecarPath := sidecar.PathFor(newPath)
			if newSidecarExists, err := util.FileOrFolderExists(newSidecarPath); err != nil {
				return config.BackendResponseWithData[string]{
					Success: false,
					Message: err.Error(),
					Data:    "",
				}
			} else if newSidecarExists {
				return config.BackendResponseWithData[string]{
					Success: false,
					Message: "Sidecar already exists at destination",
					Data:    "",
				}
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

	if !isDir {
		if err := sidecar.Move(oldPath, newPath); err != nil {
			return config.BackendResponseWithData[string]{
				Success: false,
				Message: err.Error(),
				Data:    "",
			}
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

// GetNoteMarkdownWithCodeResults reads markdown and its Bytebook code-result sidecar.
func (n *NoteService) GetNoteMarkdownWithCodeResults(path string) config.BackendResponseWithData[sidecar.NoteWithCodeResults] {
	noteFilePath, err := util.SafeJoin(n.ProjectPath, path)
	if err != nil {
		return config.BackendResponseWithData[sidecar.NoteWithCodeResults]{Success: false, Message: err.Error()}
	}

	noteContent, err := os.ReadFile(noteFilePath)
	if err != nil {
		return config.BackendResponseWithData[sidecar.NoteWithCodeResults]{
			Success: false,
			Message: err.Error(),
		}
	}

	codeResults, err := sidecar.ReadCodeResults(noteFilePath)
	if err != nil {
		return config.BackendResponseWithData[sidecar.NoteWithCodeResults]{
			Success: false,
			Message: err.Error(),
		}
	}

	return config.BackendResponseWithData[sidecar.NoteWithCodeResults]{
		Success: true,
		Message: "Successfully retrieved note markdown and code results",
		Data: sidecar.NoteWithCodeResults{
			Markdown:    string(noteContent),
			CodeResults: codeResults,
		},
	}
}

// SetNoteMarkdownWithCodeResults writes markdown and stores code results in a hidden sidecar.
func (n *NoteService) SetNoteMarkdownWithCodeResults(
	folderName string,
	noteTitle string,
	markdown string,
	codeResults sidecar.CodeResults,
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

	// The file watcher can see the markdown write, but it cannot access the
	// new in-memory code results payload, so the sidecar must be updated here.
	if err := sidecar.WriteCodeResults(noteFilePath, codeResults); err != nil {
		return config.BackendResponseWithData[string]{
			Success: false,
			Message: err.Error(),
			Data:    "",
		}
	}

	return config.BackendResponseWithData[string]{
		Success: true,
		Message: "Successfully set note markdown and code results",
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
		log.Printf("Error writing to %s: %v", noteFolderPath, err)
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

// MoveToTrash moves the specified folders and notes to the trash directory.
// It returns restore metadata for app-level undo support.
func (n *NoteService) MoveToTrash(folderAndNotes []string) config.BackendResponseWithData[[]util.TrashRestoreInfo] {
	restoreItems, err := util.MoveNotesToTrash(n.ProjectPath, folderAndNotes)
	if err != nil {
		return config.BackendResponseWithData[[]util.TrashRestoreInfo]{
			Success: false,
			Message: err.Error(),
			Data:    []util.TrashRestoreInfo{},
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

// RevealFolderOrFileInFinder reveals the given folder or file in the Finder.
// When shouldPrefixWithProjectPath is true, pathToFolderOrFile is treated as
// relative to the project directory; otherwise it is used as-is.
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
