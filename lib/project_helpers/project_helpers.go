package project_helpers

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

const ProjectName = "Bytebook"

func GetProjectPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "Could not get user's home directory", err
	}

	// Customize the folder and database name as needed
	var projectPath string
	switch os := runtime.GOOS; os {
	case "windows":
		projectPath = filepath.Join(homeDir, "AppData", "Local", ProjectName)
	case "darwin":
		projectPath = filepath.Join(homeDir, "Library", "Application Support", ProjectName)
	case "linux":
		projectPath = filepath.Join(homeDir, ".local", "share", ProjectName)
	default:
		// Fallback for other OS or as a default (can also decide to return an error instead)
		projectPath = filepath.Join(homeDir, ProjectName)
	}
	// Ensure the directory exists
	if err := os.MkdirAll(filepath.Dir(projectPath), os.ModePerm); err != nil {
		return "Could not create the dbPath directory", err
	}
	return projectPath, nil
}

// TODO: Make this run concurrently
func GetFolders(projectPath string) (folders []string, err error) {
	notesPath := filepath.Join(projectPath, "notes")
	// Ensure the directory exists
	if err := os.MkdirAll(notesPath, os.ModePerm); err != nil {
		return nil, err
	}

	// Get the folders present in the notes directory
	files, err := os.ReadDir(notesPath)
	if err != nil {
		return nil, err
	}

	for _, file := range files {
		if file.IsDir() {
			folders = append(folders, file.Name())
		}
	}

	return folders, nil
}

type FileReturnStruct struct {
	Success bool
	Message string
}

func AddFolder(projectPath string, folderName string) FileReturnStruct {
	pathToFolder := filepath.Join(projectPath, "notes", folderName)

	fmt.Println(pathToFolder)

	info, err := os.Stat(pathToFolder)
	if err == nil {
		if info.IsDir() {
			return FileReturnStruct{Success: false, Message: fmt.Sprintf("Folder name, \"%s\", already exists, please choose a different name", folderName)}
		}
	}

	// Ensure the directory exists
	if err := os.MkdirAll(pathToFolder, os.ModePerm); err != nil {
		return FileReturnStruct{Success: false, Message: err.Error()}
	}
	return FileReturnStruct{Success: true, Message: ""}
}

func AddNoteToFolder(projectPath string, folderName string, noteTitle string) FileReturnStruct {
	noteFolderPath := filepath.Join(projectPath, "notes", folderName)
	/*
		A new folder should be created for the noteTitle
		This is where the markdown, images, and other files will be stored for the note
	*/
	req := AddFolder(projectPath, filepath.Join(folderName, noteTitle))
	if !req.Success {
		// If the folder already exists, return the a more readable message
		if strings.Contains(req.Message, "already exists") {
			return FileReturnStruct{Success: false, Message: fmt.Sprintf("Note, \"%s\", already exists, please choose a different name", noteTitle)}
		}
		return req
	}
	noteFilePath := filepath.Join(noteFolderPath, noteTitle, fmt.Sprintf("%s.md", noteTitle))

	// Create an empty markdown file at the location
	err := os.WriteFile(noteFilePath, []byte("Test"), 0644)

	if err != nil {
		fmt.Printf("Error writing to %s: %v", noteFolderPath, err)
		return FileReturnStruct{Success: false, Message: err.Error()}
	}
	return FileReturnStruct{Success: true, Message: ""}
}

// TODO: Make this run concurrently
func GetNotesFromFolder(projectPath string, folderName string) (notes []string, err error) {
	folderPath := filepath.Join(projectPath, "notes", folderName)
	// Ensure the directory exists
	if err := os.MkdirAll(folderPath, os.ModePerm); err != nil {
		fmt.Println(err)
		return nil, err
	}

	// Get the folders present in the notes directory
	files, err := os.ReadDir(folderPath)
	if err != nil {
		return nil, err
	}
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

	return notes, nil
}

func GetNoteMarkdown(projectPath string, folderName string, noteTitle string) (string, error) {
	noteFilePath := filepath.Join(projectPath, "notes", folderName, noteTitle, fmt.Sprintf("%s.md", noteTitle))

	noteContent, err := os.ReadFile(noteFilePath)
	if err != nil {
		return "", err
	}
	return string(noteContent), nil
}
