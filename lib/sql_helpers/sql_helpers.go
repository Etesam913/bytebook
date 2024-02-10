package sql_helpers

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"runtime"

	_ "github.com/mattn/go-sqlite3"
)

const ProjectName = "Bytebook"
const DbName = "bytebook.db"

func InitializeDb() *sql.DB {
	defaultDbPath, err := getDefaultDbPath()
	if err != nil {
		log.Fatalf("Could not get the default db path")
	}
	db, err := sql.Open("sqlite3", defaultDbPath)

	if err != nil {
		log.Fatalf("Error creating database %v", err)
	}
	createFoldersTable(db)
	createNotesTable(db)

	return db
}

func createFoldersTable(db *sql.DB) {
	sqlStmt := `
	CREATE TABLE IF NOT EXISTS folders (
		folder_id INTEGER PRIMARY KEY AUTOINCREMENT,
		folder_name TEXT NOT NULL,
		created_at TEXT DEFAULT (datetime('now')),
		updated_at TEXT DEFAULT (datetime('now'))
	);	
	`
	_, err := db.Exec(sqlStmt)
	if err != nil {
		log.Fatalf("Error creating folder table: %v", err)
	}
}

func getDefaultDbPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "Could not get user's home directory", err
	}

	// Customize the folder and database name as needed
	var dbPath string
	switch os := runtime.GOOS; os {
	case "windows":
		dbPath = filepath.Join(homeDir, "AppData", "Local", ProjectName, DbName)
	case "darwin":
		dbPath = filepath.Join(homeDir, "Library", "Application Support", ProjectName, DbName)
	case "linux":
		dbPath = filepath.Join(homeDir, ".local", "share", ProjectName, DbName)
	default:
		// Fallback for other OS or as a default (can also decide to return an error instead)
		dbPath = filepath.Join(homeDir, ProjectName, DbName)
	}
	// Ensure the directory exists
	if err := os.MkdirAll(filepath.Dir(dbPath), os.ModePerm); err != nil {
		return "Could not create the dbPath directory", err
	}

	return dbPath, nil
}

func createNotesTable(db *sql.DB) {
	sql_stmt := `
	CREATE TABLE IF NOT EXISTS notes (
		note_id INTEGER PRIMARY KEY AUTOINCREMENT,
		folder_id INTEGER,
		note_content TEXT NOT NULL,
		created_at TEXT DEFAULT (datetime('now')),
		updated_at TEXT DEFAULT (datetime('now')),
		FOREIGN KEY (folder_id) REFERENCES folders(folder_id) ON DELETE CASCADE
	);
	`

	_, err := db.Exec(sql_stmt)
	if err != nil {
		log.Fatalf("Error creating notes table: %v", err)
	}

	// Create trigger for cascading delete.
	_, err = db.Exec(`
		CREATE TRIGGER IF NOT EXISTS fk_notes_folder_id
		BEFORE DELETE ON folders
		FOR EACH ROW BEGIN
			DELETE FROM notes WHERE folder_id = OLD.folder_id;
		END;
	`)
	if err != nil {
		log.Fatalf("Error creating trigger: %v", err)
	}
}
