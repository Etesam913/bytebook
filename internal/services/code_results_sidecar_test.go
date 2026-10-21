package services

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/etesam913/bytebook/internal/notes/sidecar"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func writeServiceTestNote(t *testing.T, projectPath, relativePath string) string {
	notePath := filepath.Join(projectPath, "notes", relativePath)
	require.NoError(t, os.MkdirAll(filepath.Dir(notePath), 0755))
	require.NoError(t, os.WriteFile(notePath, []byte("# Note"), 0644))
	return notePath
}

func writeServiceTestSidecar(t *testing.T, notePath string) {
	require.NoError(t, sidecar.WriteCodeResults(notePath, sidecar.CodeResults{
		CodeBlocks: []sidecar.CodeBlock{{
			CodeBlockID:      "block-1",
			LastRan:          "2026-05-03T18:42:10Z",
			AreResultsHidden: true,
			ResultHTML:       "<div>ok</div>",
		}},
	}))
}

func TestNoteServiceCodeResultsSidecar(t *testing.T) {
	t.Run("saves reads and deletes code result sidecar state", func(t *testing.T) {
		projectPath := t.TempDir()
		writeServiceTestNote(t, projectPath, "folder/note.md")
		service := NoteService{ProjectPath: projectPath}

		res := service.SetNoteMarkdownWithCodeResults("folder", "note", "# Updated", sidecar.CodeResults{
			CodeBlocks: []sidecar.CodeBlock{{
				CodeBlockID:      "block-1",
				LastRan:          "2026-05-03T18:42:10Z",
				AreResultsHidden: true,
				ResultHTML:       "<div>ok</div>",
			}},
		})
		require.True(t, res.Success, res.Message)

		getRes := service.GetNoteMarkdownWithCodeResults("notes/folder/note.md")
		require.True(t, getRes.Success, getRes.Message)
		assert.Equal(t, "# Updated", getRes.Data.Markdown)
		require.Len(t, getRes.Data.CodeResults.CodeBlocks, 1)
		assert.Equal(t, "block-1", getRes.Data.CodeResults.CodeBlocks[0].CodeBlockID)

		res = service.SetNoteMarkdownWithCodeResults("folder", "note", "# Updated", sidecar.CodeResults{})
		require.True(t, res.Success, res.Message)
		_, err := os.Stat(sidecar.PathFor(filepath.Join(projectPath, "notes", "folder", "note.md")))
		assert.ErrorIs(t, err, os.ErrNotExist)
	})

	t.Run("renames sidecar with note", func(t *testing.T) {
		projectPath := t.TempDir()
		oldNotePath := writeServiceTestNote(t, projectPath, "folder/old.md")
		writeServiceTestSidecar(t, oldNotePath)
		service := NoteService{ProjectPath: projectPath}

		res := service.RenameFile("folder/old.md", "folder/new.md")
		require.True(t, res.Success, res.Message)

		_, err := os.Stat(sidecar.PathFor(oldNotePath))
		assert.ErrorIs(t, err, os.ErrNotExist)
		newNotePath := filepath.Join(projectPath, "notes", "folder", "new.md")
		_, err = os.Stat(sidecar.PathFor(newNotePath))
		assert.NoError(t, err)
	})
}

func TestFileTreeServiceMovesCodeResultsSidecar(t *testing.T) {
	projectPath := t.TempDir()
	oldNotePath := writeServiceTestNote(t, projectPath, "from/note.md")
	writeServiceTestSidecar(t, oldNotePath)
	require.NoError(t, os.MkdirAll(filepath.Join(projectPath, "notes", "to"), 0755))
	service := FileTreeService{ProjectPath: projectPath}

	res := service.MoveItemsToFolder([]string{"from/note.md"}, "to")
	require.True(t, res.Success, res.Message)

	_, err := os.Stat(sidecar.PathFor(oldNotePath))
	assert.ErrorIs(t, err, os.ErrNotExist)
	newNotePath := filepath.Join(projectPath, "notes", "to", "note.md")
	_, err = os.Stat(sidecar.PathFor(newNotePath))
	assert.NoError(t, err)
}

func TestMoveRejectsDestinationSidecarCollision(t *testing.T) {
	t.Run("leaves the source note and both sidecars untouched", func(t *testing.T) {
		projectPath := t.TempDir()
		source := writeServiceTestNote(t, projectPath, "from/note.md")
		writeServiceTestSidecar(t, source)
		sourceMetadata, err := os.ReadFile(sidecar.PathFor(source))
		require.NoError(t, err)
		destination := filepath.Join(projectPath, "notes", "to", "note.md")
		require.NoError(t, os.MkdirAll(filepath.Dir(destination), 0755))
		require.NoError(t, os.WriteFile(sidecar.PathFor(destination), []byte("orphan metadata"), 0644))
		service := FileTreeService{ProjectPath: projectPath}

		res := service.MoveItemsToFolder([]string{"from/note.md"}, "to")

		assert.False(t, res.Success)
		content, err := os.ReadFile(source)
		require.NoError(t, err)
		assert.Equal(t, "# Note", string(content))
		metadata, err := os.ReadFile(sidecar.PathFor(source))
		require.NoError(t, err)
		assert.Equal(t, sourceMetadata, metadata)
		metadata, err = os.ReadFile(sidecar.PathFor(destination))
		require.NoError(t, err)
		assert.Equal(t, "orphan metadata", string(metadata))
		_, err = os.Lstat(destination)
		assert.ErrorIs(t, err, os.ErrNotExist)
	})
}

func TestRenameFileWithSidecarRecovery(t *testing.T) {
	t.Run("rolls back the note when the sidecar rename fails", func(t *testing.T) {
		projectPath := t.TempDir()
		source := writeServiceTestNote(t, projectPath, "from/note.md")
		writeServiceTestSidecar(t, source)
		metadata, err := os.ReadFile(sidecar.PathFor(source))
		require.NoError(t, err)
		destination := filepath.Join(filepath.Dir(source), "new.md")
		renameFailure := errors.New("sidecar rename failed")
		rename := func(oldPath, newPath string) error {
			if oldPath == sidecar.PathFor(source) {
				return renameFailure
			}
			return os.Rename(oldPath, newPath)
		}

		err = renameFileWithSidecar(source, destination, rename)

		assert.ErrorIs(t, err, renameFailure)
		content, err := os.ReadFile(source)
		require.NoError(t, err)
		assert.Equal(t, "# Note", string(content))
		actualMetadata, err := os.ReadFile(sidecar.PathFor(source))
		require.NoError(t, err)
		assert.Equal(t, metadata, actualMetadata)
		_, err = os.Lstat(destination)
		assert.ErrorIs(t, err, os.ErrNotExist)
		_, err = os.Lstat(sidecar.PathFor(destination))
		assert.ErrorIs(t, err, os.ErrNotExist)
	})

	t.Run("rolls back if destination metadata appears after preflight", func(t *testing.T) {
		projectPath := t.TempDir()
		source := writeServiceTestNote(t, projectPath, "from/note.md")
		writeServiceTestSidecar(t, source)
		destination := filepath.Join(filepath.Dir(source), "new.md")
		rename := func(oldPath, newPath string) error {
			if err := os.Rename(oldPath, newPath); err != nil {
				return err
			}
			if oldPath == source {
				return os.WriteFile(sidecar.PathFor(destination), []byte("other metadata"), 0644)
			}
			return nil
		}

		err := renameFileWithSidecar(source, destination, rename)

		assert.ErrorIs(t, err, os.ErrExist)
		assert.FileExists(t, source)
		assert.FileExists(t, sidecar.PathFor(source))
		assert.NoFileExists(t, destination)
		content, err := os.ReadFile(sidecar.PathFor(destination))
		require.NoError(t, err)
		assert.Equal(t, "other metadata", string(content))
	})

	t.Run("reports the actual destination when rollback cannot restore the source", func(t *testing.T) {
		projectPath := t.TempDir()
		source := writeServiceTestNote(t, projectPath, "from/note.md")
		writeServiceTestSidecar(t, source)
		destination := filepath.Join(filepath.Dir(source), "new.md")
		renameFailure := errors.New("sidecar rename failed")
		rename := func(oldPath, newPath string) error {
			if oldPath == sidecar.PathFor(source) {
				require.NoError(t, os.WriteFile(source, []byte("new source occupant"), 0644))
				return renameFailure
			}
			return os.Rename(oldPath, newPath)
		}

		err := renameFileWithSidecar(source, destination, rename)

		assert.ErrorIs(t, err, renameFailure)
		assert.ErrorIs(t, err, os.ErrExist)
		assert.ErrorContains(t, err, destination)
		content, err := os.ReadFile(source)
		require.NoError(t, err)
		assert.Equal(t, "new source occupant", string(content))
		content, err = os.ReadFile(destination)
		require.NoError(t, err)
		assert.Equal(t, "# Note", string(content))
		assert.FileExists(t, sidecar.PathFor(source))
	})

	t.Run("accepts a sidecar already moved by the watcher", func(t *testing.T) {
		projectPath := t.TempDir()
		source := writeServiceTestNote(t, projectPath, "from/note.md")
		writeServiceTestSidecar(t, source)
		destination := filepath.Join(filepath.Dir(source), "new.md")
		rename := func(oldPath, newPath string) error {
			if err := os.Rename(oldPath, newPath); err != nil {
				return err
			}
			if oldPath == source {
				return sidecar.Move(source, destination)
			}
			return nil
		}

		err := renameFileWithSidecar(source, destination, rename)

		require.NoError(t, err)
		assert.FileExists(t, destination)
		assert.FileExists(t, sidecar.PathFor(destination))
		assert.NoFileExists(t, source)
		assert.NoFileExists(t, sidecar.PathFor(source))
		assert.NoError(t, sidecar.Move(source, destination))
	})
}

func TestPairedFileMoves(t *testing.T) {
	t.Run("moves uppercase Markdown metadata to the unique destination name", func(t *testing.T) {
		projectPath := t.TempDir()
		source := writeServiceTestNote(t, projectPath, "from/note.MD")
		writeServiceTestSidecar(t, source)
		occupied := writeServiceTestNote(t, projectPath, "to/note.MD")
		writeServiceTestSidecar(t, occupied)
		service := FileTreeService{ProjectPath: projectPath}

		res := service.MoveItemsToFolder([]string{"from/note.MD"}, "to")

		require.True(t, res.Success, res.Message)
		destination := filepath.Join(filepath.Dir(occupied), "note 1.MD")
		assert.FileExists(t, destination)
		assert.FileExists(t, sidecar.PathFor(destination))
		assert.FileExists(t, occupied)
		assert.FileExists(t, sidecar.PathFor(occupied))
		assert.NoFileExists(t, source)
		assert.NoFileExists(t, sidecar.PathFor(source))
	})

	t.Run("moves attachment metadata with its file", func(t *testing.T) {
		projectPath := t.TempDir()
		source := writeServiceTestNote(t, projectPath, "from/photo.png")
		require.NoError(t, os.WriteFile(sidecar.PathFor(source), []byte(`{"tags":["photo"]}`), 0644))
		require.NoError(t, os.MkdirAll(filepath.Join(projectPath, "notes", "to"), 0755))
		service := FileTreeService{ProjectPath: projectPath}

		res := service.MoveItemsToFolder([]string{"from/photo.png"}, "to")

		require.True(t, res.Success, res.Message)
		destination := filepath.Join(projectPath, "notes", "to", "photo.png")
		assert.FileExists(t, destination)
		metadata, err := os.ReadFile(sidecar.PathFor(destination))
		require.NoError(t, err)
		assert.JSONEq(t, `{"tags":["photo"]}`, string(metadata))
		assert.NoFileExists(t, sidecar.PathFor(source))
	})

	t.Run("rejects orphan metadata during inline rename even without source metadata", func(t *testing.T) {
		projectPath := t.TempDir()
		source := writeServiceTestNote(t, projectPath, "folder/old.md")
		destination := filepath.Join(filepath.Dir(source), "new.md")
		require.NoError(t, os.WriteFile(sidecar.PathFor(destination), []byte("orphan"), 0644))
		service := NoteService{ProjectPath: projectPath}

		res := service.RenameFile("folder/old.md", "folder/new.md")

		assert.False(t, res.Success)
		assert.FileExists(t, source)
		assert.NoFileExists(t, destination)
		metadata, err := os.ReadFile(sidecar.PathFor(destination))
		require.NoError(t, err)
		assert.Equal(t, "orphan", string(metadata))
	})
}

func TestPairedMovesPreserveOtherMoveBehavior(t *testing.T) {
	t.Run("moves files without sidecars to a unique name without overwriting bytes", func(t *testing.T) {
		projectPath := t.TempDir()
		source := writeServiceTestNote(t, projectPath, "from/note.txt")
		occupied := writeServiceTestNote(t, projectPath, "to/note.txt")
		require.NoError(t, os.WriteFile(occupied, []byte("existing file"), 0644))
		service := FileTreeService{ProjectPath: projectPath}

		res := service.MoveItemsToFolder([]string{"from/note.txt"}, "to")

		require.True(t, res.Success, res.Message)
		content, err := os.ReadFile(filepath.Join(filepath.Dir(occupied), "note 1.txt"))
		require.NoError(t, err)
		assert.Equal(t, "# Note", string(content))
		content, err = os.ReadFile(occupied)
		require.NoError(t, err)
		assert.Equal(t, "existing file", string(content))
		assert.NoFileExists(t, source)
	})

	t.Run("keeps successful directory moves when another item fails", func(t *testing.T) {
		projectPath := t.TempDir()
		source := writeServiceTestNote(t, projectPath, "from/bad.md")
		writeServiceTestSidecar(t, source)
		nested := writeServiceTestNote(t, projectPath, "from/folder/nested.md")
		writeServiceTestSidecar(t, nested)
		target := filepath.Join(projectPath, "notes", "to")
		require.NoError(t, os.MkdirAll(target, 0755))
		require.NoError(t, os.WriteFile(sidecar.PathFor(filepath.Join(target, "bad.md")), []byte("orphan"), 0644))
		service := FileTreeService{ProjectPath: projectPath}

		res := service.MoveItemsToFolder([]string{"from/folder", "from/bad.md"}, "to")

		assert.False(t, res.Success)
		assert.FileExists(t, filepath.Join(target, "folder", "nested.md"))
		assert.FileExists(t, sidecar.PathFor(filepath.Join(target, "folder", "nested.md")))
		assert.NoDirExists(t, filepath.Dir(nested))
		assert.FileExists(t, source)
		assert.FileExists(t, sidecar.PathFor(source))
	})

	t.Run("supports case-only renames of the file and sidecar", func(t *testing.T) {
		projectPath := t.TempDir()
		source := writeServiceTestNote(t, projectPath, "folder/note.md")
		writeServiceTestSidecar(t, source)
		service := NoteService{ProjectPath: projectPath}

		res := service.RenameFile("folder/note.md", "folder/NOTE.md")

		require.True(t, res.Success, res.Message)
		entries, err := os.ReadDir(filepath.Dir(source))
		require.NoError(t, err)
		names := make([]string, 0, len(entries))
		for _, entry := range entries {
			names = append(names, entry.Name())
		}
		assert.ElementsMatch(t, []string{"NOTE.md", ".NOTE.md.json"}, names)
	})
}
