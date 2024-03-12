package project_helpers

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/project_types"
	wails_runtime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const ProjectName = "Bytebook-Dev"

func GetProjectPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "Could not get user's home directory", err
	}

	// Customize the folder and database name as needed
	var projectPath string

	err = io_helpers.CompleteCustomActionForOS(
		io_helpers.ActionStruct{
			WindowsAction: func() {
				projectPath = filepath.Join(homeDir, "AppData", "Local", ProjectName)
			},
			MacAction: func() {
				projectPath = filepath.Join(homeDir, "Library", "Application Support", ProjectName)
			},
			LinuxAction: func() {
				projectPath = filepath.Join(homeDir, ".local", "share", ProjectName)
			},
		},
	)

	if err != nil {
		return "Could not get the project path", err
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

func DeleteFolder(projectPath string, folderName string) error {
	folderPath := filepath.Join(projectPath, "notes", folderName)
	err := os.RemoveAll(folderPath)
	if err != nil {
		return err
	}
	return nil
}

// Updates the folder name and the metadata.json file if it exists
func RenameFolder(projectPath string, oldFolderName string, newFolderName string) error {
	folderBase := filepath.Join(projectPath, "notes")
	err := os.Rename(filepath.Join(folderBase, oldFolderName), filepath.Join(folderBase, newFolderName))
	if err != nil {
		return err
	}
	_, err = os.Stat(filepath.Join(folderBase, newFolderName, "metadata.json"))
	// if metadata.json exists we should update the title property
	if err == nil {
		var folderMetadata project_types.FolderMetadata
		err := io_helpers.ReadJsonFromPath(filepath.Join(folderBase, newFolderName, "metadata.json"), &folderMetadata)
		if err != nil {
			return err
		}
		folderMetadata.Title = newFolderName
		folderMetadata.Updated = UpdateTime()
		err = io_helpers.WriteJsonToPath(filepath.Join(folderBase, newFolderName, "metadata.json"), folderMetadata)
		if err != nil {
			return err
		}
	}

	return err
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
	err := os.WriteFile(noteFilePath, []byte(""), 0644)

	if err != nil {
		fmt.Printf("Error writing to %s: %v", noteFolderPath, err)
		return FileReturnStruct{Success: false, Message: err.Error()}
	}

	createdDate := time.Now().UTC().Format("2006-01-02 15:04")
	err = io_helpers.WriteJsonToPath(filepath.Join(noteFolderPath, noteTitle, "metadata.json"), map[string]string{"title": noteTitle, "created": createdDate, "updated": createdDate})
	if err != nil {
		return FileReturnStruct{Success: false, Message: err.Error()}
	}
	return FileReturnStruct{Success: true, Message: ""}
}

// TODO: Make this run concurrently
func GetNotesFromFolder(projectPath string, folderName string) (notes []string, err error) {
	folderPath := filepath.Join(projectPath, "notes", folderName)
	// Ensure the directory exists
	if _, err := os.Stat(folderPath); err != nil {
		fmt.Println(err, fmt.Sprintf(": Cannot get notes from this %s because it does not exist", folderName))
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

func RenameNote(projectPath string, folderName string, oldNoteTitle string, newNoteTitle string) error {
	noteBase := filepath.Join(projectPath, "notes", folderName)
	oldNotePath := filepath.Join(noteBase, oldNoteTitle)
	newNotePath := filepath.Join(noteBase, newNoteTitle)

	err := os.Rename(oldNotePath, newNotePath)
	if err != nil {
		return err
	}

	// Rename the markdown file to match the new note title
	err = os.Rename(
		filepath.Join(noteBase, newNoteTitle, fmt.Sprintf("%s.md", oldNoteTitle)),
		filepath.Join(noteBase, newNoteTitle, fmt.Sprintf("%s.md", newNoteTitle)),
	)
	if err != nil {
		return err
	}

	// Update the metadata.json file
	noteMetadata := project_types.NoteMetadata{}
	err = io_helpers.ReadJsonFromPath(
		filepath.Join(noteBase, newNoteTitle, "metadata.json"),
		&noteMetadata,
	)
	if err != nil {
		return err
	}
	noteMetadata.Title = newNoteTitle
	noteMetadata.Updated = UpdateTime()
	err = io_helpers.WriteJsonToPath(
		filepath.Join(noteBase, newNoteTitle, "metadata.json"),
		noteMetadata,
	)

	if err != nil {
		return err
	}
	return nil
}
func GetNoteMarkdown(projectPath string, folderName string, noteTitle string) (string, error) {
	noteFilePath := filepath.Join(projectPath, "notes", folderName, noteTitle, fmt.Sprintf("%s.md", noteTitle))

	noteContent, err := os.ReadFile(noteFilePath)
	if err != nil {
		return "", err
	}
	return string(noteContent), nil
}

func SetNoteMarkdown(projectPath string, folderName string, noteTitle string, markdown string) error {
	noteFilePath := filepath.Join(projectPath, "notes", folderName, noteTitle, fmt.Sprintf("%s.md", noteTitle))

	err := os.WriteFile(noteFilePath, []byte(markdown), 0644)

	if err != nil {
		return err
	}
	return nil
}

func DoesFolderExist(projectPath string, folderName string) bool {
	_, err := os.Stat(filepath.Join(projectPath, folderName))
	return err == nil
}

func UploadImage(ctx context.Context, projectPath string, folderPath string, notePath string) ([]string, error) {
	defaultDirectory := ""
	err := io_helpers.CompleteCustomActionForOS(io_helpers.ActionStruct{
		WindowsAction: func() {
			defaultDirectory = "C:\\"
		},
		MacAction: func() {
			defaultDirectory = "/Users"
		},
		LinuxAction: func() {
			defaultDirectory = "/home/"
		}})
	if err != nil {
		return nil, err
	}

	filePaths, err := wails_runtime.OpenMultipleFilesDialog(
		ctx,
		wails_runtime.OpenDialogOptions{
			DefaultDirectory: defaultDirectory,
			Filters: []wails_runtime.FileFilter{
				{
					DisplayName: "Image Files",
					Pattern:     "*.png;*.jpg;*.jpeg;*.webp",
				},
			},
		},
	)
	if err != nil {
		return nil, err
	}
	newFilePaths := make([]string, 0)
	// Process the selected file
	if len(filePaths) > 0 {
		// runtime.LogInfo(ctx, "Selected file: "+filename)
		for _, file := range filePaths {
			wails_runtime.LogInfo(ctx, "Selected file: "+file)
			cleanedFileName := io_helpers.CleanFileName(filepath.Base(file))
			newFilePath := filepath.Join(projectPath, "notes", folderPath, notePath, cleanedFileName)
			fileServerPath := filepath.Join("notes", folderPath, notePath, cleanedFileName)

			newFilePaths = append(newFilePaths, fileServerPath)
			io_helpers.CopyFile(file, newFilePath)
		}
	} else {
		wails_runtime.LogInfo(ctx, "No file was selected.")
	}

	return newFilePaths, nil
}

func UpdateTime() string {
	return time.Now().UTC().Format("2006-01-02 15:04")
}
