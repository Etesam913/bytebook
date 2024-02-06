package main

import (
	"context"
	"fmt"
	"os"

	"github.com/etesam913/bytebook/sql_helpers"
	"github.com/jackc/pgx/v4"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}


func InitializeDb(){
	conn, err := pgx.Connect(context.Background(), "postgresql://localhost:5432/postgres")
	if err != nil{
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close(context.Background())
	dbName := "postgres"
	var doesDatabaseExist bool
	err = conn.QueryRow(context.Background(), "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname=$1)", dbName).Scan(&doesDatabaseExist)
	if err != nil{
		fmt.Fprintf(os.Stderr, "Failed to check if database exists: %v\n", err)
		os.Exit(1)
	}

	if !doesDatabaseExist {
		// Database does not exist, attempt to create it
		_, err := conn.Exec(context.Background(), "CREATE DATABASE "+dbName)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to create database: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("Database created successfully.")
	} 
  // Database is now created

	// Creating the folders and notes tables
	if sql_helpers.TableExists(conn, "folders"){
		fmt.Println("Folders table already exists")
	} else{
		fmt.Println("Creating folders table")
		sql_helpers.CreateFoldersTable(conn)
	}

	if sql_helpers.TableExists(conn, "notes"){
		fmt.Println("notes table already exists")
	} else{
		fmt.Println("Creating notes table")
		sql_helpers.CreateNotesTable(conn)
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	InitializeDb()
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

func (a *App) StoreMarkdown(markdown string){
	fmt.Println(markdown)
	testFilename := "test_markdown.md"

	err := os.WriteFile(testFilename, []byte(markdown), 0644)
	if err != nil{
		fmt.Printf("Error writing to %s: %v", testFilename, err)
		return
	}
}
