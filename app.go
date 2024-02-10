package main

import (
	"context"
	"fmt"
	"os"

	"github.com/etesam913/bytebook/sql_helpers"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	sql_helpers.InitializeDb()
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
