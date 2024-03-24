package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
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

func (n *NoteService) GetNotes(folderName string) NoteResponse {
	folderPath := filepath.Join(n.ProjectPath, "notes", folderName)
	// Ensure the directory exists
	if _, err := os.Stat(folderPath); err != nil {
		fmt.Println(err, fmt.Sprintf(": Cannot get notes from this %s because it does not exist", folderName))
		return NoteResponse{Success: false, Message: err.Error()}
	}

	// Get the folders present in the notes directory
	files, err := os.ReadDir(folderPath)
	if err != nil {
		return NoteResponse{Success: false, Message: err.Error()}
	}

	notes := []string{}
	for _, file := range files {
		// Go through the folders and check if they have a markdown file
		if file.IsDir() {
			// Check if the markdown file exists for the folder
			noteFilePath := filepath.Join(folderPath, file.Name(), fmt.Sprintf("%s.md", file.Name()))
			_, err := os.Stat(noteFilePath)
			if err != nil {
				continue
			}
			notes = append(notes, file.Name())
		}
	}
	return NoteResponse{Success: true, Message: "", Data: notes}
}

func (n *NoteService) RenameNote(folderName string, oldNoteTitle string, newNoteTitle string) NoteResponse {
	noteBase := filepath.Join(n.ProjectPath, "notes", folderName)
	oldNotePath := filepath.Join(noteBase, oldNoteTitle)
	newNotePath := filepath.Join(noteBase, newNoteTitle)

	err := os.Rename(oldNotePath, newNotePath)
	if err != nil {
		return NoteResponse{Success: false, Message: err.Error()}
	}

	// Rename the markdown file to match the new note title
	err = os.Rename(
		filepath.Join(noteBase, newNoteTitle, fmt.Sprintf("%s.md", oldNoteTitle)),
		filepath.Join(noteBase, newNoteTitle, fmt.Sprintf("%s.md", newNoteTitle)),
	)
	if err != nil {
		return NoteResponse{Success: false, Message: err.Error()}
	}

	return NoteResponse{Success: true, Message: "Note renamed successfully"}
}

func (n *NoteService) GetNoteMarkdown(folderName string, noteTitle string) NoteMarkdownResponse {
	noteFilePath := filepath.Join(n.ProjectPath, "notes", folderName, noteTitle, fmt.Sprintf("%s.md", noteTitle))

	noteContent, err := os.ReadFile(noteFilePath)
	if err != nil {
		return NoteMarkdownResponse{Success: false, Message: err.Error(), Data: ""}
	}
	return NoteMarkdownResponse{Success: true, Message: "Successfully Retrieved Note Markdown", Data: string(noteContent)}
}

func (n *NoteService) SetNoteMarkdown(folderName string, noteTitle string, markdown string) NoteMarkdownResponse {
	noteFilePath := filepath.Join(n.ProjectPath, "notes", folderName, noteTitle, fmt.Sprintf("%s.md", noteTitle))

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
			return AddFolderResponse{Success: false, Message: fmt.Sprintf("Folder name, \"%s\", already exists, please choose a different name", folderName)}
		}
	}

	// Ensure the directory exists
	if err := os.MkdirAll(pathToFolder, os.ModePerm); err != nil {
		return AddFolderResponse{Success: false, Message: err.Error()}
	}
	return AddFolderResponse{Success: true, Message: ""}
}

func (n *NoteService) AddNoteToFolder(folderName string, noteTitle string) AddFolderResponse {
	noteFolderPath := filepath.Join(n.ProjectPath, "notes", folderName)
	/*
		A new folder should be created for the noteTitle
		This is where the markdown, images, and other files will be stored for the note
	*/
	req := AddFolder(filepath.Join(folderName, noteTitle), n.ProjectPath)
	if !req.Success {
		// If the folder already exists, return the a more readable message
		if strings.Contains(req.Message, "already exists") {
			return AddFolderResponse{Success: false, Message: fmt.Sprintf("Note, \"%s\", already exists, please choose a different name", noteTitle)}
		}
		return req
	}
	noteFilePath := filepath.Join(noteFolderPath, noteTitle, fmt.Sprintf("%s.md", noteTitle))

	// Create an empty markdown file at the location
	err := os.WriteFile(noteFilePath, []byte(""), 0644)

	if err != nil {
		fmt.Printf("Error writing to %s: %v", noteFolderPath, err)
		return AddFolderResponse{Success: false, Message: err.Error()}
	}

	return AddFolderResponse{Success: true, Message: ""}
}
