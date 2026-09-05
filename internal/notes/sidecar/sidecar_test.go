package sidecar

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPathFor(t *testing.T) {
	notePath := filepath.Join("notes", "folder", "note.md")
	assert.Equal(t, filepath.Join("notes", "folder", ".note.md.json"), PathFor(notePath))
	assert.Equal(t, filepath.Join("notes", ".Makefile.json"), PathFor(filepath.Join("notes", "Makefile")))
}

func TestPathForFile(t *testing.T) {
	tests := []struct {
		name        string
		projectPath string
		folder      string
		fileName    string
		expected    string
	}{
		{
			name:        "simple file",
			projectPath: "/project",
			folder:      "folder1",
			fileName:    "photo.jpg",
			expected:    filepath.Join("/project", "notes", "folder1", ".photo.jpg.json"),
		},
		{
			name:        "file with multiple dots",
			projectPath: "/project",
			folder:      "docs",
			fileName:    "file.name.png",
			expected:    filepath.Join("/project", "notes", "docs", ".file.name.png.json"),
		},
		{
			name:        "empty folder",
			projectPath: "/project",
			folder:      "",
			fileName:    "image.gif",
			expected:    filepath.Join("/project", "notes", ".image.gif.json"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := PathForFile(tt.projectPath, tt.folder, tt.fileName)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestIsFileName(t *testing.T) {
	assert.True(t, IsFileName(".note.md.json"))
	assert.True(t, IsFileName(".file.name.png.json"))
	assert.True(t, IsFileName(".Makefile.json"))
	assert.False(t, IsFileName("note.json"))
	assert.False(t, IsFileName(".json"))
	assert.False(t, IsFileName(".note.txt"))
}

func TestNotePathFromPath(t *testing.T) {
	assert.Equal(
		t,
		filepath.Join("folder", "note.md"),
		NotePathFromPath(filepath.Join("folder", ".note.md.json")),
	)
	assert.Equal(t, filepath.Join("folder", "note.name.MD"), NotePathFromPath(filepath.Join("folder", ".note.name.MD.json")))
	assert.Empty(t, NotePathFromPath(filepath.Join("folder", ".note.pdf.json")))
	assert.Empty(t, NotePathFromPath(filepath.Join("folder", ".note.json")))
	assert.Empty(t, NotePathFromPath(filepath.Join("folder", ".Makefile.json")))
	assert.Empty(t, NotePathFromPath(filepath.Join("folder", "note.json")))
}

func setupSameStemFiles(t *testing.T) string {
	t.Helper()
	projectPath := setupTestDir(t)
	for _, name := range []string{"report.md", "report.pdf", "report.png"} {
		filePath := filepath.Join(projectPath, "notes", "testfolder", name)
		require.NoError(t, os.WriteFile(filePath, []byte(name), 0644))
		require.NoError(t, WriteTags(projectPath, "testfolder", name, []string{name}))
	}
	require.NoError(t, WriteCodeResults(filepath.Join(projectPath, "notes", "testfolder", "report.md"), CodeResults{
		CodeBlocks: []CodeBlock{{CodeBlockID: "result", ResultHTML: "<div>saved</div>"}},
	}))
	return projectPath
}

func TestSameStemFiles(t *testing.T) {
	t.Run("keep separate tags and note results", func(t *testing.T) {
		projectPath := setupSameStemFiles(t)

		for _, name := range []string{"report.md", "report.pdf", "report.png"} {
			tags, err := ReadTags(projectPath, "testfolder", name)
			require.NoError(t, err)
			assert.Equal(t, []string{name}, tags)
			assert.FileExists(t, filepath.Join(projectPath, "notes", "testfolder", "."+name+".json"))
		}
		results, err := ReadCodeResults(filepath.Join(projectPath, "notes", "testfolder", "report.md"))
		require.NoError(t, err)
		require.Len(t, results.CodeBlocks, 1)
		assert.Equal(t, "<div>saved</div>", results.CodeBlocks[0].ResultHTML)
	})

	t.Run("deleting attachment metadata preserves its siblings", func(t *testing.T) {
		projectPath := setupSameStemFiles(t)

		require.NoError(t, Delete(projectPath, "testfolder", "report.pdf"))

		assert.NoFileExists(t, filepath.Join(projectPath, "notes", "testfolder", ".report.pdf.json"))
		for _, name := range []string{"report.md", "report.png"} {
			tags, err := ReadTags(projectPath, "testfolder", name)
			require.NoError(t, err)
			assert.Equal(t, []string{name}, tags)
		}
		results, err := ReadCodeResults(filepath.Join(projectPath, "notes", "testfolder", "report.md"))
		require.NoError(t, err)
		assert.Len(t, results.CodeBlocks, 1)
	})

	t.Run("renaming note metadata preserves its siblings", func(t *testing.T) {
		projectPath := setupSameStemFiles(t)
		oldPath := filepath.Join(projectPath, "notes", "testfolder", "report.md")
		newPath := filepath.Join(projectPath, "notes", "testfolder", "renamed.md")

		require.NoError(t, Move(oldPath, newPath))

		assert.NoFileExists(t, filepath.Join(projectPath, "notes", "testfolder", ".report.md.json"))
		tags, err := ReadTags(projectPath, "testfolder", "renamed.md")
		require.NoError(t, err)
		assert.Equal(t, []string{"report.md"}, tags)
		results, err := ReadCodeResults(newPath)
		require.NoError(t, err)
		assert.Len(t, results.CodeBlocks, 1)
		for _, name := range []string{"report.pdf", "report.png"} {
			tags, err := ReadTags(projectPath, "testfolder", name)
			require.NoError(t, err)
			assert.Equal(t, []string{name}, tags)
		}
	})
}

func setupTestDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	notesDir := filepath.Join(dir, "notes", "testfolder")
	require.NoError(t, os.MkdirAll(notesDir, 0755))
	return dir
}

func TestEnsure(t *testing.T) {
	t.Run("creates sidecar if missing", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := Ensure(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)

		sidecarPath := PathForFile(projectPath, "testfolder", "photo.jpg")
		_, err = os.Stat(sidecarPath)
		assert.NoError(t, err)
	})

	t.Run("does not overwrite existing sidecar", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteTags(projectPath, "testfolder", "photo.jpg", []string{"existing"})
		require.NoError(t, err)

		err = Ensure(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)

		tags, err := ReadTags(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"existing"}, tags)
	})
}

func TestDelete(t *testing.T) {
	t.Run("deletes existing sidecar", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteTags(projectPath, "testfolder", "photo.jpg", []string{"tag1"})
		require.NoError(t, err)

		err = Delete(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)

		sidecarPath := PathForFile(projectPath, "testfolder", "photo.jpg")
		_, err = os.Stat(sidecarPath)
		assert.True(t, os.IsNotExist(err))
	})

	t.Run("returns nil if sidecar does not exist", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := Delete(projectPath, "testfolder", "missing.jpg")
		assert.NoError(t, err)
	})
}

func TestMove(t *testing.T) {
	t.Run("moves entire sidecar (tags and code results)", func(t *testing.T) {
		projectPath := setupTestDir(t)
		require.NoError(t, os.MkdirAll(filepath.Join(projectPath, "notes", "newfolder"), 0755))

		oldNotePath := filepath.Join(projectPath, "notes", "testfolder", "note.md")
		newNotePath := filepath.Join(projectPath, "notes", "newfolder", "renamed.md")
		require.NoError(t, os.WriteFile(oldNotePath, []byte("# Note"), 0644))
		require.NoError(t, WriteTags(projectPath, "testfolder", "note.md", []string{"tag1"}))
		require.NoError(t, WriteCodeResults(oldNotePath, CodeResults{
			CodeBlocks: []CodeBlock{{CodeBlockID: "x", ResultHTML: "<div>ok</div>"}},
		}))

		require.NoError(t, Move(oldNotePath, newNotePath))

		_, err := os.Stat(PathFor(oldNotePath))
		assert.True(t, os.IsNotExist(err))

		tags, err := ReadTags(projectPath, "newfolder", "renamed.md")
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1"}, tags)

		results, err := ReadCodeResults(newNotePath)
		require.NoError(t, err)
		assert.Len(t, results.CodeBlocks, 1)
	})

	t.Run("no-op when source sidecar does not exist", func(t *testing.T) {
		projectPath := setupTestDir(t)
		require.NoError(t, os.MkdirAll(filepath.Join(projectPath, "notes", "newfolder"), 0755))

		oldFilePath := filepath.Join(projectPath, "notes", "testfolder", "missing.jpg")
		newFilePath := filepath.Join(projectPath, "notes", "newfolder", "new.jpg")
		require.NoError(t, Move(oldFilePath, newFilePath))

		_, err := os.Stat(PathFor(newFilePath))
		assert.True(t, os.IsNotExist(err))
	})

	t.Run("errors when destination sidecar already exists", func(t *testing.T) {
		projectPath := setupTestDir(t)
		require.NoError(t, os.MkdirAll(filepath.Join(projectPath, "notes", "newfolder"), 0755))

		require.NoError(t, WriteTags(projectPath, "testfolder", "old.jpg", []string{"tag1"}))
		require.NoError(t, WriteTags(projectPath, "newfolder", "new.jpg", []string{"existing"}))

		oldFilePath := filepath.Join(projectPath, "notes", "testfolder", "old.jpg")
		newFilePath := filepath.Join(projectPath, "notes", "newfolder", "new.jpg")
		err := Move(oldFilePath, newFilePath)
		assert.Error(t, err)
	})

	t.Run("succeeds on case-only sidecar rename", func(t *testing.T) {
		projectPath := setupTestDir(t)
		oldFilePath := filepath.Join(projectPath, "notes", "testfolder", "photo.jpg")
		newFilePath := filepath.Join(projectPath, "notes", "testfolder", "Photo.jpg")
		require.NoError(t, os.WriteFile(oldFilePath, []byte("image"), 0644))
		require.NoError(t, WriteTags(projectPath, "testfolder", "photo.jpg", []string{"tag1"}))

		err := Move(oldFilePath, newFilePath)
		assert.NoError(t, err)

		tags, err := ReadTags(projectPath, "testfolder", "Photo.jpg")
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1"}, tags)
	})
}
