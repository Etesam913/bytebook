package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/lib/git_helpers"
	"github.com/etesam913/bytebook/lib/project_helpers"
	"github.com/etesam913/bytebook/lib/sql_helpers"
)

// App struct
type App struct {
	ctx context.Context
	db  *sql.DB
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

	notesPath := filepath.Join(project_path, "notes")
	if err := os.MkdirAll(notesPath, os.ModePerm); err != nil {
		log.Fatalf("Failed to create notes directory: %v", err)
	}

	a.db = sql_helpers.InitializeDb(filepath.Join(project_path, sql_helpers.DbName))

	git_helpers.InitalizeGitRepo()
	git_helpers.SetRepoOrigin("https://github.com/Etesam913/bytebook-test.git")
}

func (a *App) shutdown(ctx context.Context) {
	a.db.Close()
}

func (a *App) WriteNote(noteTitle string, markdown string) bool {
	project_path, err := project_helpers.GetProjectPath()
	if err != nil {
		log.Fatalf("Error getting project path: %v", err)
	}
	noteFilePath := filepath.Join(project_path, "notes", fmt.Sprintf("%s.md", noteTitle))

	err = os.WriteFile(noteFilePath, []byte(markdown), 0644)

	if err != nil {
		fmt.Printf("Error writing to %s: %v", noteFilePath, err)
		return false
	}
	return true
}
