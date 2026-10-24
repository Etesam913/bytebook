package search

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildDocument(t *testing.T) {
	t.Run("supplied Markdown takes precedence over disk", func(t *testing.T) {
		projectPath, notesPath := setupTempNotesDir(t)
		writeFilesRelative(t, notesPath, map[string]string{"note.md": "disk content"})
		markdown := "watcher content"

		document, err := buildDocument(projectPath, "", "note.md", &markdown)

		require.NoError(t, err)
		assert.Equal(t, CreateNoteBleveDocument(markdown, "", "note.md"), document)
	})

	t.Run("explicit empty Markdown does not require a file", func(t *testing.T) {
		markdown := ""

		document, err := buildDocument(t.TempDir(), "", "note.md", &markdown)

		require.NoError(t, err)
		assert.Equal(t, CreateNoteBleveDocument("", "", "note.md"), document)
	})

	t.Run("missing attachment returns stat error without queuing a phantom", func(t *testing.T) {
		env := setupTestEnv(t)
		batch := env.Index.NewBatch()

		err := IndexFile(batch, env.TmpDir, "", "missing.png", nil)

		assert.ErrorIs(t, err, os.ErrNotExist)
		assert.Zero(t, batch.Size())

		env.createFile(env.NotesDir, "missing.png", "attachment")

		require.NoError(t, IndexFile(batch, env.TmpDir, "", "missing.png", nil))
		require.NoError(t, env.Index.Batch(batch))
		env.verifyDocumentExists("missing.png")
	})

}
