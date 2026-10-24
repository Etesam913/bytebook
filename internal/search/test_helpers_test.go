package search

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type TestEnv struct {
	TmpDir   string
	NotesDir string
	Index    bleve.Index
	t        *testing.T
}

func setupTestEnv(t *testing.T) *TestEnv {
	t.Helper()
	project, notes := setupTempNotesDir(t)
	index, err := OpenOrCreateIndex(project)
	require.NoError(t, err)
	env := &TestEnv{TmpDir: project, NotesDir: notes, Index: index, t: t}
	t.Cleanup(func() {
		if env.Index != nil {
			assert.NoError(t, env.Index.Close())
		}
	})
	return env
}

// createTestFolder creates a folder structure for testing
func (env *TestEnv) createTestFolder(folderName string) string {
	env.t.Helper()
	folderPath := filepath.Join(env.NotesDir, folderName)
	err := os.MkdirAll(folderPath, 0755)
	require.NoError(env.t, err)
	return folderPath
}

func (env *TestEnv) createFile(folderPath, filename, content string) string {
	env.t.Helper()
	return testutil.WriteFile(env.t, folderPath, filename, []byte(content))
}

// verifyDocumentExists checks if a document exists in the index
func (env *TestEnv) verifyDocumentExists(docId string) {
	env.t.Helper()
	doc, err := env.Index.Document(docId)
	assert.NoError(env.t, err, "Document %s should exist", docId)
	assert.NotNil(env.t, doc, "Document %s should not be nil", docId)
}

func indexFolderAndFlush(t *testing.T, idx bleve.Index, projectPath, folderPath, folderName string) error {
	batch := idx.NewBatch()
	if err := IndexFilesInFolderWithBatch(projectPath, folderPath, folderName, idx, batch); err != nil {
		return err
	}

	if batch.Size() == 0 {
		return nil
	}

	return idx.Batch(batch)
}

func setupTempNotesDir(t *testing.T) (projectDir, notesDir string) {
	t.Helper()
	projectDir = t.TempDir()
	notesDir = filepath.Join(projectDir, "notes")
	err := os.MkdirAll(notesDir, 0755)
	require.NoError(t, err)
	return
}

func createFolderWithFiles(t *testing.T, notesDir, folderName string, files map[string]string) string {
	t.Helper()
	folderPath := filepath.Join(notesDir, folderName)
	err := os.MkdirAll(folderPath, 0755)
	require.NoError(t, err)

	for fileName, content := range files {
		testutil.WriteFile(t, folderPath, fileName, []byte(content))
	}
	return folderPath
}

func writeFilesRelative(t *testing.T, baseDir string, files map[string]string) {
	t.Helper()
	for relativePath, content := range files {
		testutil.WriteFile(t, baseDir, relativePath, []byte(content))
	}
}

func createTempIndex(t *testing.T, projectDir string) bleve.Index {
	t.Helper()
	index, err := OpenOrCreateIndex(projectDir)
	require.NoError(t, err)
	t.Cleanup(func() { assert.NoError(t, index.Close()) })
	return index
}
