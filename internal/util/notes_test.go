package util

import (
	"io/fs"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// mockDirEntry implements fs.DirEntry and fs.FileInfo for testing
type mockDirEntry struct {
	name    string
	size    int64
	modTime time.Time
	isDir   bool
}

func (m mockDirEntry) Name() string               { return m.name }
func (m mockDirEntry) IsDir() bool                { return m.isDir }
func (m mockDirEntry) Type() fs.FileMode          { return 0 }
func (m mockDirEntry) Info() (fs.FileInfo, error) { return m, nil }
func (m mockDirEntry) Size() int64                { return m.size }
func (m mockDirEntry) Mode() fs.FileMode          { return 0 }
func (m mockDirEntry) ModTime() time.Time         { return m.modTime }
func (m mockDirEntry) Sys() interface{}           { return nil }

func TestSortNotes(t *testing.T) {
	// Create test data
	now := time.Now()
	notes := []fs.DirEntry{
		mockDirEntry{name: "note1.md", size: 100, modTime: now.Add(-1 * time.Hour)},
		mockDirEntry{name: "note2.md", size: 200, modTime: now.Add(-2 * time.Hour)},
		mockDirEntry{name: "note3.txt", size: 50, modTime: now},
		mockDirEntry{name: "Bnote.md", size: 150, modTime: now.Add(-3 * time.Hour)},
		mockDirEntry{name: "Anote.md", size: 300, modTime: now.Add(-4 * time.Hour)},
	}

	t.Run("DateUpdatedDesc", func(t *testing.T) {
		testNotes := make([]fs.DirEntry, len(notes))
		copy(testNotes, notes)
		SortNotes(testNotes, DateUpdatedDesc)
		assert.Equal(t, "note3.txt", testNotes[0].Name())
		assert.Equal(t, "note1.md", testNotes[1].Name())
		assert.Equal(t, "note2.md", testNotes[2].Name())
	})

	t.Run("DateUpdatedAsc", func(t *testing.T) {
		testNotes := make([]fs.DirEntry, len(notes))
		copy(testNotes, notes)
		SortNotes(testNotes, DateUpdatedAsc)
		assert.Equal(t, "Anote.md", testNotes[0].Name())
		assert.Equal(t, "Bnote.md", testNotes[1].Name())
		assert.Equal(t, "note2.md", testNotes[2].Name())
	})

	t.Run("FileNameAZ", func(t *testing.T) {
		testNotes := make([]fs.DirEntry, len(notes))
		copy(testNotes, notes)
		SortNotes(testNotes, FileNameAZ)
		assert.Equal(t, "Anote.md", testNotes[0].Name())
		assert.Equal(t, "Bnote.md", testNotes[1].Name())
		assert.Equal(t, "note1.md", testNotes[2].Name())
	})

	t.Run("FileNameZA", func(t *testing.T) {
		testNotes := make([]fs.DirEntry, len(notes))
		copy(testNotes, notes)
		SortNotes(testNotes, FileNameZA)
		assert.Equal(t, "note3.txt", testNotes[0].Name())
		assert.Equal(t, "note2.md", testNotes[1].Name())
		assert.Equal(t, "note1.md", testNotes[2].Name())
	})

	t.Run("SizeDesc", func(t *testing.T) {
		testNotes := make([]fs.DirEntry, len(notes))
		copy(testNotes, notes)
		SortNotes(testNotes, SizeDesc)
		assert.Equal(t, "Anote.md", testNotes[0].Name())
		assert.Equal(t, "note2.md", testNotes[1].Name())
		assert.Equal(t, "Bnote.md", testNotes[2].Name())
	})

	t.Run("SizeAsc", func(t *testing.T) {
		testNotes := make([]fs.DirEntry, len(notes))
		copy(testNotes, notes)
		SortNotes(testNotes, SizeAsc)
		assert.Equal(t, "note3.txt", testNotes[0].Name())
		assert.Equal(t, "note1.md", testNotes[1].Name())
		assert.Equal(t, "Bnote.md", testNotes[2].Name())
	})

	t.Run("FileType", func(t *testing.T) {
		testNotes := make([]fs.DirEntry, len(notes))
		copy(testNotes, notes)
		SortNotes(testNotes, FileType)
		// First all .md files in alphabetical order, then .txt files
		assert.Equal(t, ".md", testNotes[0].Name()[len(testNotes[0].Name())-3:])
		assert.Equal(t, ".txt", testNotes[4].Name()[len(testNotes[4].Name())-4:])
	})

	t.Run("DefaultSort", func(t *testing.T) {
		testNotes := make([]fs.DirEntry, len(notes))
		copy(testNotes, notes)
		SortNotes(testNotes, "invalid-option")
		// Should not change the order
		assert.Equal(t, notes[0].Name(), testNotes[0].Name())
		assert.Equal(t, notes[1].Name(), testNotes[1].Name())
	})
}

func TestSortNotesWithFolders(t *testing.T) {
	// Create test data
	now := time.Now()
	notes := []NoteWithFolder{
		{Folder: "folder1", Name: "note1.md", Size: 100, ModTime: now.Add(-1 * time.Hour), Ext: ".md"},
		{Folder: "folder2", Name: "note2.md", Size: 200, ModTime: now.Add(-2 * time.Hour), Ext: ".md"},
		{Folder: "folder1", Name: "note3.txt", Size: 50, ModTime: now, Ext: ".txt"},
		{Folder: "folder3", Name: "Bnote.md", Size: 150, ModTime: now.Add(-3 * time.Hour), Ext: ".md"},
		{Folder: "folder2", Name: "Anote.md", Size: 300, ModTime: now.Add(-4 * time.Hour), Ext: ".md"},
	}

	t.Run("DateUpdatedDesc", func(t *testing.T) {
		testNotes := make([]NoteWithFolder, len(notes))
		copy(testNotes, notes)
		SortNotesWithFolders(testNotes, DateUpdatedDesc)
		assert.Equal(t, "note3.txt", testNotes[0].Name)
		assert.Equal(t, "note1.md", testNotes[1].Name)
		assert.Equal(t, "note2.md", testNotes[2].Name)
	})

	t.Run("DateUpdatedAsc", func(t *testing.T) {
		testNotes := make([]NoteWithFolder, len(notes))
		copy(testNotes, notes)
		SortNotesWithFolders(testNotes, DateUpdatedAsc)
		assert.Equal(t, "Anote.md", testNotes[0].Name)
		assert.Equal(t, "Bnote.md", testNotes[1].Name)
		assert.Equal(t, "note2.md", testNotes[2].Name)
	})

	t.Run("FileNameAZ", func(t *testing.T) {
		testNotes := make([]NoteWithFolder, len(notes))
		copy(testNotes, notes)
		SortNotesWithFolders(testNotes, FileNameAZ)
		assert.Equal(t, "Anote.md", testNotes[0].Name)
		assert.Equal(t, "Bnote.md", testNotes[1].Name)
		assert.Equal(t, "note1.md", testNotes[2].Name)
	})

	t.Run("FileNameZA", func(t *testing.T) {
		testNotes := make([]NoteWithFolder, len(notes))
		copy(testNotes, notes)
		SortNotesWithFolders(testNotes, FileNameZA)
		assert.Equal(t, "note3.txt", testNotes[0].Name)
		assert.Equal(t, "note2.md", testNotes[1].Name)
		assert.Equal(t, "note1.md", testNotes[2].Name)
	})

	t.Run("SizeDesc", func(t *testing.T) {
		testNotes := make([]NoteWithFolder, len(notes))
		copy(testNotes, notes)
		SortNotesWithFolders(testNotes, SizeDesc)
		assert.Equal(t, "Anote.md", testNotes[0].Name)
		assert.Equal(t, "note2.md", testNotes[1].Name)
		assert.Equal(t, "Bnote.md", testNotes[2].Name)
	})

	t.Run("SizeAsc", func(t *testing.T) {
		testNotes := make([]NoteWithFolder, len(notes))
		copy(testNotes, notes)
		SortNotesWithFolders(testNotes, SizeAsc)
		assert.Equal(t, "note3.txt", testNotes[0].Name)
		assert.Equal(t, "note1.md", testNotes[1].Name)
		assert.Equal(t, "Bnote.md", testNotes[2].Name)
	})

	t.Run("FileType", func(t *testing.T) {
		testNotes := make([]NoteWithFolder, len(notes))
		copy(testNotes, notes)
		SortNotesWithFolders(testNotes, FileType)
		// First all .md files in alphabetical order, then .txt files
		assert.Equal(t, ".md", testNotes[0].Ext)
		assert.Equal(t, ".txt", testNotes[4].Ext)
	})

	t.Run("DefaultSort", func(t *testing.T) {
		testNotes := make([]NoteWithFolder, len(notes))
		copy(testNotes, notes)
		SortNotesWithFolders(testNotes, "invalid-option")
		// Should not change the order
		assert.Equal(t, notes[0].Name, testNotes[0].Name)
		assert.Equal(t, notes[1].Name, testNotes[1].Name)
	})
}
