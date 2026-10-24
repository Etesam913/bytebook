package search

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReconcileDocuments(t *testing.T) {
	t.Run("Removes missing folders but preserves discovered and newly created folders and files", func(t *testing.T) {
		// Arrange
		env := setupTestEnv(t)

		discovered := env.createTestFolder("discovered")
		env.createTestFolder("created-after-discovery")
		batch := env.Index.NewBatch()
		for _, folder := range []string{"discovered", "created-after-discovery", "missing", "replaced-by-file"} {
			require.NoError(t, AddFolderToBatch(batch, folder))
		}
		require.NoError(t, batch.Index("note.md", CreateNoteBleveDocument("content", "", "note.md")))
		require.NoError(t, FlushBatch(env.Index, batch))
		require.NoError(t, os.WriteFile(filepath.Join(env.NotesDir, "replaced-by-file"), []byte("attachment"), 0o644))

		// Act
		err := ReconcileDocuments(env.TmpDir, []string{discovered}, []string{filepath.Join(env.NotesDir, "note.md")}, env.Index)

		// Assert
		require.NoError(t, err)

		for _, id := range []string{"discovered/", "created-after-discovery/", "note.md"} {
			doc, err := env.Index.Document(id)
			require.NoError(t, err)
			assert.NotNil(t, doc, id)
		}
		for _, id := range []string{"missing/", "replaced-by-file/"} {
			doc, err := env.Index.Document(id)
			require.NoError(t, err)
			assert.Nil(t, doc, id)
		}
	})
}

func TestReconcileFiles(t *testing.T) {
	t.Run("Preserves discovered and newly created files and prunes missing files across pages", func(t *testing.T) {
		// Arrange
		project, root := setupTempNotesDir(t)
		index := createTempIndex(t, project)

		batch := index.NewBatch()
		for i := range DefaultBatchSize + 1 {
			name := fmt.Sprintf("missing-%04d.md", i)
			require.NoError(t, batch.Index(name, CreateNoteBleveDocument("stale", "", name)))
		}
		for _, name := range []string{"discovered.md", "later.md", "replaced.md", "parent/child.md"} {
			require.NoError(t, batch.Index(name, CreateNoteBleveDocument("content", "", name)))
		}
		require.NoError(t, batch.Index("later.png", AttachmentBleveDocument{Type: ATTACHMENT_TYPE, FileName: "later.png"}))
		require.NoError(t, index.Batch(batch))
		writeFilesRelative(t, root, map[string]string{"later.md": "new note", "later.png": "new attachment", "parent": "replaces directory"})
		require.NoError(t, os.Mkdir(filepath.Join(root, "replaced.md"), 0755))

		// Act
		err := ReconcileDocuments(project, nil, []string{filepath.Join(root, "discovered.md")}, index)

		// Assert
		require.NoError(t, err)

		count, err := index.DocCount()
		require.NoError(t, err)
		assert.Equal(t, uint64(3), count)
		for _, id := range []string{"discovered.md", "later.md", "later.png"} {
			doc, err := index.Document(id)
			require.NoError(t, err)
			assert.NotNil(t, doc, id)
		}
	})

	t.Run("Returns filesystem errors without deleting the affected document", func(t *testing.T) {
		// Arrange
		project, root := setupTempNotesDir(t)
		index := createTempIndex(t, project)

		require.NoError(t, index.Index("loop.md", CreateNoteBleveDocument("content", "", "loop.md")))
		require.NoError(t, os.Symlink("loop.md", filepath.Join(root, "loop.md")))

		// Act
		err := ReconcileDocuments(project, nil, nil, index)

		// Assert
		require.ErrorContains(t, err, "stat indexed path")

		doc, err := index.Document("loop.md")
		require.NoError(t, err)
		assert.NotNil(t, doc)
	})
}
