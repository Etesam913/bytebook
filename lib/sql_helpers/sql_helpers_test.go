package sql_helpers

import (
	"os"
	"testing"
)

func TestIntializeDb(t *testing.T) {
	db := InitializeDb()

	defer db.Close()

	defer os.Remove("./bytebook.db")

	// Test if the folders table exists and can be queried.
	if _, err := db.Query("SELECT 1 FROM folders LIMIT 1"); err != nil {
		t.Fatalf("folders table does not exist or is not queryable: %v", err)
	}

	// Test if the notes table exists and can be queried.
	if _, err := db.Query("SELECT 1 FROM notes LIMIT 1"); err != nil {
		t.Fatalf("notes table does not exist or is not queryable: %v", err)
	}

	// Test if the trigger for cascading delete exists and is queryable.
	// Note: This is a simplistic check just to ensure something exists; it does not verify trigger logic.
	if _, err := db.Query("SELECT name FROM sqlite_master WHERE type='trigger' AND name='fk_notes_folder_id'"); err != nil {
		t.Fatalf("trigger for cascading delete does not exist or is not queryable: %v", err)
	}

	if _, err := db.Exec("DELETE FROM folders WHERE folder_id=$1", 1); err != nil {
		t.Fatalf("deleting folder with id 1 failed: %v", err)
	}

	// Testing if the cascade delete works
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM notes").Scan(&count)

	if err != nil {
		t.Fatalf("Getting counts from notes failed %v", err)
	}
	if count != 0 {
		t.Fatalf("Did not get 0 notes from notes table, the cascade failed %v", err)
	}

}
