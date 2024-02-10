package sql_helpers

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

func InitializeDb() *sql.DB {
	db, err := sql.Open("sqlite3", "./bytebook.db")
	if err != nil {
		log.Fatalf("Error creating database %v", err)
	}
	CreateFoldersTable(db)
	CreateNotesTable(db)

	// defer db.Close()
	return db
}

func CreateFoldersTable(db *sql.DB) {
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

func CreateNotesTable(db *sql.DB) {
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
