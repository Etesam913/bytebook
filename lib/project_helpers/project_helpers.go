package project_helpers

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
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

type AddFolderRequest struct {
	Success bool
	Message string
}

func AddFolder(projectPath string, folderName string) AddFolderRequest {
	pathToFolder := filepath.Join(projectPath, "notes", folderName)

	fmt.Println(pathToFolder)

	info, err := os.Stat(pathToFolder)
	if err == nil {
		if info.IsDir() {
			return AddFolderRequest{Success: false, Message: fmt.Sprintf("Folder name, \"%s\", already exists, please choose a different name", folderName)}
		}
	}

	// Ensure the directory exists
	if err := os.MkdirAll(pathToFolder, os.ModePerm); err != nil {
		return AddFolderRequest{Success: false, Message: err.Error()}
	}
	return AddFolderRequest{Success: true, Message: ""}
}
