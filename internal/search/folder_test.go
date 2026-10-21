package search

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAddFolderToBatch(t *testing.T) {
	t.Run("Indexes a normalized folder with searchable and stored names", func(t *testing.T) {
		env := setupTestEnv(t)
		defer env.Close()
		batch := env.Index.NewBatch()
		parentQuery := bleve.NewMatchQuery("projects")
		parentQuery.SetField(FieldFolder)
		nameQuery := bleve.NewMatchQuery("research")
		nameQuery.SetField(FieldFileName)
		request := bleve.NewSearchRequest(bleve.NewConjunctionQuery(parentQuery, nameQuery))
		request.Fields = []string{FieldType, FieldFolder, FieldFileName}

		require.NoError(t, AddFolderToBatch(batch, "Projects/Old/../Research/"))
		require.NoError(t, FlushBatch(env.Index, batch))
		result, err := env.Index.Search(request)

		require.NoError(t, err)
		require.Len(t, result.Hits, 1)
		assert.Equal(t, "Projects/Research/", result.Hits[0].ID)
		assert.Equal(t, FOLDER_TYPE, result.Hits[0].Fields[FieldType])
		assert.Equal(t, "Projects", result.Hits[0].Fields[FieldFolder])
		assert.Equal(t, "Research", result.Hits[0].Fields[FieldFileName])
	})

	t.Run("Skips the notes root and hidden path components", func(t *testing.T) {
		env := setupTestEnv(t)
		defer env.Close()
		batch := env.Index.NewBatch()

		require.NoError(t, AddFolderToBatch(batch, "."))
		require.NoError(t, AddFolderToBatch(batch, ".hidden/child"))
		require.NoError(t, AddFolderToBatch(batch, "visible/.hidden"))

		assert.Zero(t, batch.Size())
	})

	t.Run("Rejects absolute paths", func(t *testing.T) {
		env := setupTestEnv(t)
		defer env.Close()
		batch := env.Index.NewBatch()

		err := AddFolderToBatch(batch, t.TempDir())

		require.ErrorContains(t, err, "folder path must be relative")
		assert.Zero(t, batch.Size())
	})
}

func TestIndexDiscoveredFolders(t *testing.T) {
	t.Run("Indexes folders across batch boundaries while excluding hidden folders", func(t *testing.T) {
		env := setupTestEnv(t)
		defer env.Close()
		directories := []string{env.NotesDir, filepath.Join(env.NotesDir, ".hidden")}
		for i := range DefaultBatchSize + 1 {
			directories = append(directories, filepath.Join(env.NotesDir, fmt.Sprintf("folder-%d", i)))
		}

		require.NoError(t, IndexDiscoveredFolders(env.TmpDir, directories, env.Index))

		count, err := env.Index.DocCount()
		require.NoError(t, err)
		assert.Equal(t, uint64(DefaultBatchSize+1), count)
		last, err := env.Index.Document(fmt.Sprintf("folder-%d/", DefaultBatchSize))
		require.NoError(t, err)
		assert.NotNil(t, last)
	})
}

func TestReconcileFolderDocuments(t *testing.T) {
	t.Run("Removes missing folders but preserves discovered and newly created folders and files", func(t *testing.T) {
		env := setupTestEnv(t)
		defer env.Close()
		discovered := env.createTestFolder("discovered")
		env.createTestFolder("created-after-discovery")
		batch := env.Index.NewBatch()
		for _, folder := range []string{"discovered", "created-after-discovery", "missing", "replaced-by-file"} {
			require.NoError(t, AddFolderToBatch(batch, folder))
		}
		require.NoError(t, batch.Index("note.md", CreateNoteBleveDocument("content", "", "note.md")))
		require.NoError(t, FlushBatch(env.Index, batch))
		require.NoError(t, os.WriteFile(filepath.Join(env.NotesDir, "replaced-by-file"), []byte("attachment"), 0o644))

		require.NoError(t, ReconcileFolderDocuments(env.TmpDir, []string{discovered}, env.Index))

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
