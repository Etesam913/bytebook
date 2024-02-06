package sql_helpers

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v4"
)

func TableExists(conn *pgx.Conn, tableName string) bool {
	var exists bool
	err := conn.QueryRow(context.Background(), "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = $1)", tableName).Scan(&exists)
	if err != nil {
			fmt.Fprintf(os.Stderr, "Error checking if table exists: %v\n", err)
			return false
	}
	return exists
}

func CreateFoldersTable(conn *pgx.Conn){
	conn.Exec(context.Background(), 
	"CREATE TABLE folders(folder_id SERIAL PRIMARY KEY, folder_name VARCHAR(48) NOT NULL, created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())")
}

func CreateNotesTable(conn *pgx.Conn){
	conn.Exec(context.Background(), 
	"CREATE TABLE notes(note_id UUID PRIMARY KEY, folder_id INTEGER REFERENCES folders(folder_id) on DELETE CASCADE, note_content TEXT NOT NULL, created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())")
}
