package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

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

	a.db = sql_helpers.InitializeDb(filepath.Join(project_path, sql_helpers.DbName))
}

func (a *App) shutdown(ctx context.Context) {
	a.db.Close()
}

func (a *App) StoreMarkdown(markdown string) {
	fmt.Println(markdown)
	testFilename := "test_markdown.md"

	err := os.WriteFile(testFilename, []byte(markdown), 0644)
	if err != nil {
		fmt.Printf("Error writing to %s: %v", testFilename, err)
		return
	}
}
