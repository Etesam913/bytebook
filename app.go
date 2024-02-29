package main

import (
	"context"
	"log"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/lib/file_server"
	"github.com/etesam913/bytebook/lib/git_helpers"
	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/project_helpers"
	"github.com/etesam913/bytebook/lib/project_types"
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
	return project_helpers.GetFolders(a.projectPath)
}

func (a *App) AddFolderUsingName(folderName string) project_helpers.FileReturnStruct {
	addFolderReq := project_helpers.AddFolder(a.projectPath, folderName)
	if !addFolderReq.Success {
		return addFolderReq
	}

	// Create the metadata json file for the folder
	metadataPath := filepath.Join(a.projectPath, "notes", folderName, "metadata.json")
	createdDate := project_helpers.UpdateTime()
	err := io_helpers.WriteJsonToPath(metadataPath, project_types.FolderMetadata{Title: folderName, Created: createdDate, Updated: createdDate})
	if err != nil {
		return project_helpers.FileReturnStruct{Success: false, Message: err.Error()}
	}

	return project_helpers.FileReturnStruct{Success: true, Message: ""}
}
func (a *App) RenameFolder(oldFolderName string, newFolderName string) error {
	return project_helpers.RenameFolder(a.projectPath, oldFolderName, newFolderName)
}

func (a *App) DeleteFolder(folderName string) error {
	return project_helpers.DeleteFolder(a.projectPath, folderName)
}

func (a *App) AddNoteToFolder(folderName string, noteTitle string) project_helpers.FileReturnStruct {
	return project_helpers.AddNoteToFolder(a.projectPath, folderName, noteTitle)
}

func (a *App) GetNoteTitles(folderName string) ([]string, error) {
	return project_helpers.GetNotesFromFolder(a.projectPath, folderName)
}

func (a *App) GetNoteMarkdown(folderName string, noteTitle string) (string, error) {
	return project_helpers.GetNoteMarkdown(a.projectPath, folderName, noteTitle)
}

func (a *App) SetNoteMarkdown(folderName string, noteTitle string, markdown string) error {
	setNoteReq := project_helpers.SetNoteMarkdown(a.projectPath, folderName, noteTitle, markdown)

	return setNoteReq
}

func (a *App) UploadImagesToFolder(folderName string, noteTitle string) ([]string, error) {
	return project_helpers.UploadImage(a.ctx, a.projectPath, folderName, noteTitle)
}

func (a *App) SyncChangesWithRepo() git_helpers.GitReponse {
	return git_helpers.CommitAndPushChanges(a.projectPath)
}

func (a *App) RenameNoteTitle(folderName string, oldNoteTitle string, newNoteTitle string) error {
	return project_helpers.RenameNote(a.projectPath, folderName, oldNoteTitle, newNoteTitle)
}
