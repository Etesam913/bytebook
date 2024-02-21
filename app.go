package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/lib/git_helpers"
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

	project_path, err := project_helpers.GetProjectPath()
	if err != nil {
		log.Fatalf("Error getting project path: %v", err)
	}
	a.projectPath = project_path

	notesPath := filepath.Join(project_path, "notes")
	if err := os.MkdirAll(notesPath, os.ModePerm); err != nil {
		log.Fatalf("Failed to create notes directory: %v", err)
	}

	git_helpers.InitalizeGitRepo()
	git_helpers.SetRepoOrigin("https://github.com/Etesam913/bytebook-test.git")
}

func (a *App) shutdown(ctx context.Context) {
}

func (a *App) WriteNote(noteTitle string, markdown string) bool {
	noteFilePath := filepath.Join(a.projectPath, "notes", fmt.Sprintf("%s.md", noteTitle))

	err := os.WriteFile(noteFilePath, []byte(markdown), 0644)

	if err != nil {
		fmt.Printf("Error writing to %s: %v", noteFilePath, err)
		return false
	}
	return true
}

func (a *App) GetFolderNames() []string {
	folderNames, err := project_helpers.GetFolders(a.projectPath)

	if err != nil {
		log.Fatalf("Error getting folder names: %v", err)
	}
	return folderNames
}

func (a *App) AddFolderUsingName(folderName string) project_helpers.FileReturnStruct {
	addFolderReq := project_helpers.AddFolder(a.projectPath, folderName)

	return addFolderReq
}

func (a *App) AddNoteToFolder(folderName string, noteTitle string) project_helpers.FileReturnStruct {
	addNoteReq := project_helpers.AddNoteToFolder(a.projectPath, folderName, noteTitle)

	return addNoteReq
}

func (a *App) GetNoteTitles(folderName string) []string {
	noteTitles, err := project_helpers.GetNotesFromFolder(a.projectPath, folderName)

	if err != nil {
		log.Fatalf("Error getting note titles: %v", err)
	}
	return noteTitles
}

func (a *App) GetNoteMarkdown(folderName string, noteTitle string) string {
	noteMarkdown, err := project_helpers.GetNoteMarkdown(a.projectPath, folderName, noteTitle)

	if err != nil {
		log.Fatalf("Error getting note markdown: %v", err)
	}
	return noteMarkdown
}

func (a *App) SetNoteMarkdown(folderName string, noteTitle string, markdown string) error {
	setNoteReq := project_helpers.SetNoteMarkdown(a.projectPath, folderName, noteTitle, markdown)

	return setNoteReq
}

func (a *App) DeleteNote(folderName string) error {
	deleteFolderReq := project_helpers.DeleteNoteFolder(a.projectPath, folderName)

	return deleteFolderReq
}
