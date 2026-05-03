package services

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/etesam913/bytebook/internal/notes"
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
	require.NoError(t, notes.WriteCodeResultsSidecar(notePath, notes.CodeResultsSidecar{
		CodeBlocks: []notes.CodeBlockResult{{
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

		res := service.SetNoteMarkdownWithCodeResults("folder", "note", "# Updated", notes.CodeResultsSidecar{
			CodeBlocks: []notes.CodeBlockResult{{
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

		res = service.SetNoteMarkdownWithCodeResults("folder", "note", "# Updated", notes.CodeResultsSidecar{})
		require.True(t, res.Success, res.Message)
		_, err := os.Stat(notes.ConstructCodeResultsSidecarPath(filepath.Join(projectPath, "notes", "folder", "note.md")))
		assert.ErrorIs(t, err, os.ErrNotExist)
	})

	t.Run("renames sidecar with markdown note", func(t *testing.T) {
		projectPath := t.TempDir()
		oldNotePath := writeServiceTestNote(t, projectPath, "folder/old.md")
		writeServiceTestSidecar(t, oldNotePath)
		service := NoteService{ProjectPath: projectPath}

		res := service.RenameFile("folder/old.md", "folder/new.md")
		require.True(t, res.Success, res.Message)

		_, err := os.Stat(notes.ConstructCodeResultsSidecarPath(oldNotePath))
		assert.ErrorIs(t, err, os.ErrNotExist)
		newNotePath := filepath.Join(projectPath, "notes", "folder", "new.md")
		_, err = os.Stat(notes.ConstructCodeResultsSidecarPath(newNotePath))
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

	_, err := os.Stat(notes.ConstructCodeResultsSidecarPath(oldNotePath))
	assert.ErrorIs(t, err, os.ErrNotExist)
	newNotePath := filepath.Join(projectPath, "notes", "to", "note.md")
	_, err = os.Stat(notes.ConstructCodeResultsSidecarPath(newNotePath))
	assert.NoError(t, err)
}
