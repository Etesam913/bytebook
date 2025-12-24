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

	t.Run("NaturalSorting", func(t *testing.T) {
		// Test natural sorting behavior (macOS-style)
		naturalTestNotes := []fs.DirEntry{
			mockDirEntry{name: "file10.txt", size: 100, modTime: now},
			mockDirEntry{name: "file2.txt", size: 100, modTime: now},
			mockDirEntry{name: "file1.txt", size: 100, modTime: now},
			mockDirEntry{name: "file20.txt", size: 100, modTime: now},
			mockDirEntry{name: "file3.txt", size: 100, modTime: now},
		}

		SortNotes(naturalTestNotes, FileNameAZ)

		// With natural sorting, file1.txt should come before file2.txt, which should come before file3.txt, etc.
		// This is different from lexicographic sorting where file10.txt would come before file2.txt
		assert.Equal(t, "file1.txt", naturalTestNotes[0].Name())
		assert.Equal(t, "file2.txt", naturalTestNotes[1].Name())
		assert.Equal(t, "file3.txt", naturalTestNotes[2].Name())
		assert.Equal(t, "file10.txt", naturalTestNotes[3].Name())
		assert.Equal(t, "file20.txt", naturalTestNotes[4].Name())
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

	t.Run("NaturalSorting", func(t *testing.T) {
		// Test natural sorting behavior (macOS-style) for SortNotesWithFolders
		naturalTestNotes := []NoteWithFolder{
			{Folder: "folder1", Name: "file10.txt", Size: 100, ModTime: now, Ext: ".txt"},
			{Folder: "folder1", Name: "file2.txt", Size: 100, ModTime: now, Ext: ".txt"},
			{Folder: "folder1", Name: "file1.txt", Size: 100, ModTime: now, Ext: ".txt"},
			{Folder: "folder1", Name: "file20.txt", Size: 100, ModTime: now, Ext: ".txt"},
			{Folder: "folder1", Name: "file3.txt", Size: 100, ModTime: now, Ext: ".txt"},
		}

		SortNotesWithFolders(naturalTestNotes, FileNameAZ)

		// With natural sorting, file1.txt should come before file2.txt, which should come before file3.txt, etc.
		assert.Equal(t, "file1.txt", naturalTestNotes[0].Name)
		assert.Equal(t, "file2.txt", naturalTestNotes[1].Name)
		assert.Equal(t, "file3.txt", naturalTestNotes[2].Name)
		assert.Equal(t, "file10.txt", naturalTestNotes[3].Name)
		assert.Equal(t, "file20.txt", naturalTestNotes[4].Name)
	})
}

func TestNaturalCompare(t *testing.T) {
	t.Run("BasicNaturalSorting", func(t *testing.T) {
		// Test that numbers are sorted numerically, not lexicographically
		assert.Equal(t, -1, naturalCompare("file1.txt", "file10.txt"))
		assert.Equal(t, 1, naturalCompare("file10.txt", "file1.txt"))
		assert.Equal(t, 0, naturalCompare("file1.txt", "file1.txt"))
	})

	t.Run("MixedAlphanumeric", func(t *testing.T) {
		// Test mixed alphanumeric strings
		assert.Equal(t, -1, naturalCompare("a1b", "a10b"))
		assert.Equal(t, 1, naturalCompare("a10b", "a1b"))
		assert.Equal(t, -1, naturalCompare("test1", "test2"))
		assert.Equal(t, 1, naturalCompare("test2", "test1"))
	})

	t.Run("CaseInsensitive", func(t *testing.T) {
		// Test case insensitive comparison
		assert.Equal(t, 0, naturalCompare("File1.txt", "file1.txt"))
		assert.Equal(t, 0, naturalCompare("FILE1.TXT", "file1.txt"))
		assert.Equal(t, -1, naturalCompare("a1.txt", "B1.txt"))
		assert.Equal(t, 1, naturalCompare("B1.txt", "a1.txt"))
	})

	t.Run("DifferentLengths", func(t *testing.T) {
		// Test strings of different lengths
		assert.Equal(t, -1, naturalCompare("file1", "file10"))
		assert.Equal(t, 1, naturalCompare("file10", "file1"))
		assert.Equal(t, -1, naturalCompare("a", "b"))
		assert.Equal(t, 1, naturalCompare("b", "a"))
	})

	t.Run("NoNumbers", func(t *testing.T) {
		// Test strings without numbers (should behave like normal string comparison)
		assert.Equal(t, -1, naturalCompare("apple", "banana"))
		assert.Equal(t, 1, naturalCompare("banana", "apple"))
		assert.Equal(t, 0, naturalCompare("apple", "apple"))
	})

	t.Run("MultipleNumbers", func(t *testing.T) {
		// Test strings with multiple numbers
		assert.Equal(t, -1, naturalCompare("file1part2", "file1part10"))
		assert.Equal(t, 1, naturalCompare("file1part10", "file1part2"))
		assert.Equal(t, -1, naturalCompare("file2part1", "file10part1"))
		assert.Equal(t, 1, naturalCompare("file10part1", "file2part1"))
	})
}

func TestSplitFolderAndFile(t *testing.T) {
	tests := []struct {
		name             string
		folderAndFile    string
		expectedFolder   string
		expectedFileName string
	}{
		{
			name:             "file only",
			folderAndFile:    "photo.jpg",
			expectedFolder:   "",
			expectedFileName: "photo.jpg",
		},
		{
			name:             "folder and file",
			folderAndFile:    "folder1/photo.jpg",
			expectedFolder:   "folder1",
			expectedFileName: "photo.jpg",
		},
		{
			name:             "nested folder",
			folderAndFile:    "folder1/subfolder/photo.jpg",
			expectedFolder:   "folder1/subfolder",
			expectedFileName: "photo.jpg",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			folder, fileName := SplitFolderAndFile(tt.folderAndFile)
			assert.Equal(t, tt.expectedFolder, folder)
			assert.Equal(t, tt.expectedFileName, fileName)
		})
	}
}
