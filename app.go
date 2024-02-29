package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/etesam913/bytebook/lib/file_server"
	"github.com/etesam913/bytebook/lib/git_helpers"
	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/project_helpers"
)

// App struct
type App struct {
	ctx         context.Context
	projectPath string
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	projectPath, err := project_helpers.GetProjectPath()
	if err != nil {
		log.Fatalf("Error getting project path: %v", err)
	}
	a.projectPath = projectPath

	notesPath := filepath.Join(projectPath, "notes")
	if err := os.MkdirAll(notesPath, os.ModePerm); err != nil {
		log.Fatalf("Failed to create notes directory: %v", err)
	}

	git_helpers.InitalizeGitRepo(projectPath)
	git_helpers.SetRepoOrigin("https://github.com/Etesam913/bytebook-test.git")

	file_server.LaunchFileServer(projectPath)
}

func (a *App) shutdown(ctx context.Context) {
}

func (a *App) GetFolderNames() ([]string, error) {
	folderNames, err := project_helpers.GetFolders(a.projectPath)

	if err != nil {
		return nil, err
	}

	return folderNames, nil
}

func (a *App) AddFolderUsingName(folderName string) project_helpers.FileReturnStruct {
	addFolderReq := project_helpers.AddFolder(a.projectPath, folderName)
	if !addFolderReq.Success {
		return addFolderReq
	}

	// Create the metadata json file for the folder
	metadataPath := filepath.Join(a.projectPath, "notes", folderName, "metadata.json")
	createdDate := time.Now().UTC().Format("2006-01-02 15:04")
	err := io_helpers.WriteJsonToPath(metadataPath, map[string]string{"title": folderName, "created": createdDate, "updated": createdDate})
	if err != nil {
		return project_helpers.FileReturnStruct{Success: false, Message: err.Error()}
	}

	return project_helpers.FileReturnStruct{Success: true, Message: ""}
}

func (a *App) AddNoteToFolder(folderName string, noteTitle string) project_helpers.FileReturnStruct {
	addNoteReq := project_helpers.AddNoteToFolder(a.projectPath, folderName, noteTitle)

	return addNoteReq
}

func (a *App) GetNoteTitles(folderName string) ([]string, error) {
	noteTitles, err := project_helpers.GetNotesFromFolder(a.projectPath, folderName)
	fmt.Println(noteTitles, err)
	if err != nil {
		return nil, err
	}
	return noteTitles, nil
}

func (a *App) GetNoteMarkdown(folderName string, noteTitle string) (string, error) {
	noteMarkdown, err := project_helpers.GetNoteMarkdown(a.projectPath, folderName, noteTitle)

	if err != nil {
		return "", err
	}
	return noteMarkdown, nil
}

func (a *App) SetNoteMarkdown(folderName string, noteTitle string, markdown string) error {
	setNoteReq := project_helpers.SetNoteMarkdown(a.projectPath, folderName, noteTitle, markdown)

	return setNoteReq
}

func (a *App) DeleteFolder(folderName string) error {
	deleteFolderReq := project_helpers.DeleteFolder(a.projectPath, folderName)

	return deleteFolderReq
}

func (a *App) UploadImagesToFolder(folderName string, noteTitle string) ([]string, error) {
	filePaths, err := project_helpers.UploadImage(a.ctx, a.projectPath, folderName, noteTitle)
	if err != nil {
		return nil, err
	}
	return filePaths, err
}

func (a *App) SyncChangesWithRepo() git_helpers.GitReponse {
	res := git_helpers.CommitAndPushChanges(a.projectPath)
	return res
}
