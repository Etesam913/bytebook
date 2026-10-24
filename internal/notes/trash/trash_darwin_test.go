//go:build darwin

package trash

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/etesam913/bytebook/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidatePathInsideNotes(t *testing.T) {
	projectPath := t.TempDir()
	notesPath := filepath.Join(projectPath, "notes")

	t.Run("Accepts the notes directory and its descendants", func(t *testing.T) {
		assert.NoError(t, validatePathInsideNotes(notesPath, notesPath))
		assert.NoError(t, validatePathInsideNotes(notesPath, filepath.Join(notesPath, "folder", "note.md")))
	})

	t.Run("Rejects a sibling directory with the same name prefix", func(t *testing.T) {
		err := validatePathInsideNotes(notesPath, filepath.Join(projectPath, "notes2"))

		assert.Error(t, err)
	})

	t.Run("Rejects a file inside a sibling directory with the same name prefix", func(t *testing.T) {
		err := validatePathInsideNotes(notesPath, filepath.Join(projectPath, "notes2", "note.md"))

		assert.Error(t, err)
	})

	t.Run("Rejects the parent directory", func(t *testing.T) {
		err := validatePathInsideNotes(notesPath, projectPath)

		assert.Error(t, err)
	})
}

func TestRestoreNotesFromTrash(t *testing.T) {
	t.Run("Restores the note and matching sidecar", func(t *testing.T) {
		setupTrash(t)
		project := t.TempDir()
		root := filepath.Join(project, "notes")
		note := testutil.WriteFile(t, root, "folder/note.md", []byte("# Note"))
		metadata := testutil.WriteFile(t, root, "folder/.note.md.json", []byte(`{"tags":["keep"]}`))
		items, err := MoveNotesToTrash(project, []string{"folder/note.md"})
		require.NoError(t, err)

		require.NoError(t, RestoreNotesFromTrash(project, items))

		assert.FileExists(t, note)
		content, err := os.ReadFile(metadata)
		require.NoError(t, err)
		assert.Equal(t, `{"tags":["keep"]}`, string(content))
		assert.NoFileExists(t, items[0].TrashedPath)
		assert.NoFileExists(t, items[0].RelatedItems[0].TrashedPath)
	})
	t.Run("Rejects restoring outside the project notes directory", func(t *testing.T) {
		project := t.TempDir()
		trashed := testutil.WriteFile(t, t.TempDir(), "note.md", []byte("# Note"))

		err := RestoreNotesFromTrash(project, []TrashRestoreInfo{{
			OriginalPath: filepath.Join(project, "notes2", "note.md"), TrashedPath: trashed,
		}})

		assert.Error(t, err)
		assert.FileExists(t, trashed)
		assert.NoDirExists(t, filepath.Join(project, "notes2"))
	})
	t.Run("Preserves the existing destination and trashed copy on collision", func(t *testing.T) {
		project := t.TempDir()
		destination := testutil.WriteFile(t, filepath.Join(project, "notes"), "note.md", []byte("keep"))
		trashed := testutil.WriteFile(t, t.TempDir(), "note.md", []byte("old"))

		err := RestoreNotesFromTrash(project, []TrashRestoreInfo{{OriginalPath: destination, TrashedPath: trashed}})

		assert.Error(t, err)
		assert.FileExists(t, trashed)
		content, err := os.ReadFile(destination)
		require.NoError(t, err)
		assert.Equal(t, "keep", string(content))
	})
}
