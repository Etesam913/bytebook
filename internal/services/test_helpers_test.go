package services

import (
	"path/filepath"
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/notes/sidecar"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createTestSearchIndex(t *testing.T) bleve.Index {
	t.Helper()
	index, err := search.OpenOrCreateIndex(t.TempDir())
	require.NoError(t, err)
	t.Cleanup(func() {
		assert.NoError(t, index.Close())
	})
	return index
}

func writeTestNote(t *testing.T, projectPath, relativePath, content string) string {
	t.Helper()
	return testutil.WriteFile(t, filepath.Join(projectPath, "notes"), relativePath, []byte(content))
}

func indexTestNotes(t *testing.T, projectPath string, index bleve.Index, relativePaths ...string) {
	t.Helper()
	discoveredPaths := make([]string, 0, len(relativePaths))
	for _, relativePath := range relativePaths {
		discoveredPaths = append(discoveredPaths, filepath.Join(projectPath, "notes", relativePath))
	}

	require.NoError(t, search.IndexDiscoveredFiles(projectPath, discoveredPaths, index, 1))
}

func writeServiceTestSidecar(t *testing.T, notePath string) {
	t.Helper()
	require.NoError(t, sidecar.WriteCodeResults(notePath, sidecar.CodeResults{
		CodeBlocks: []sidecar.CodeBlock{{
			CodeBlockID:      "block-1",
			LastRan:          "2026-05-03T18:42:10Z",
			AreResultsHidden: true,
			ResultHTML:       "<div>ok</div>",
		}},
	}))
}

func writeTestNoteWithCodeResults(t *testing.T, projectPath, relativePath string) string {
	t.Helper()
	path := writeTestNote(t, projectPath, relativePath, "# Note")
	writeServiceTestSidecar(t, path)
	return path
}
