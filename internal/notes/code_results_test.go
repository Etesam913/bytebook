package notes

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConstructCodeResultsSidecarPath(t *testing.T) {
	notePath := filepath.Join("notes", "folder", "note.md")
	assert.Equal(t, filepath.Join("notes", "folder", ".note.json"), ConstructCodeResultsSidecarPath(notePath))
}

func TestWriteCodeResultsSidecar(t *testing.T) {
	t.Run("writes only persisted code block state", func(t *testing.T) {
		notePath := filepath.Join(t.TempDir(), "note.md")
		require.NoError(t, os.WriteFile(notePath, []byte("# Note"), 0644))

		require.NoError(t, WriteCodeResultsSidecar(notePath, CodeResultsSidecar{
			CodeBlocks: []CodeBlockResult{
				{CodeBlockID: "empty"},
				{CodeBlockID: "hidden", AreResultsHidden: true},
				{CodeBlockID: "result", ResultHTML: "<div>ok</div>", LastRan: "2026-05-03T18:42:10Z"},
			},
		}))

		sidecar, err := ReadCodeResultsSidecar(notePath)
		require.NoError(t, err)
		require.Len(t, sidecar.CodeBlocks, 1)
		assert.Equal(t, CodeResultsSidecarVersion, sidecar.Version)
		assert.Equal(t, "result", sidecar.CodeBlocks[0].CodeBlockID)
	})

	t.Run("preserves other sidecar fields", func(t *testing.T) {
		notePath := filepath.Join(t.TempDir(), "note.md")
		require.NoError(t, os.WriteFile(notePath, []byte("# Note"), 0644))
		require.NoError(t, util.WriteJsonToPath(ConstructCodeResultsSidecarPath(notePath), FileSidecar{
			Tags: []string{"keep"},
		}))

		require.NoError(t, WriteCodeResultsSidecar(notePath, CodeResultsSidecar{
			CodeBlocks: []CodeBlockResult{{CodeBlockID: "result", ResultHTML: "<div>ok</div>"}},
		}))

		var fileSidecar FileSidecar
		require.NoError(t, util.ReadJsonFromPath(ConstructCodeResultsSidecarPath(notePath), &fileSidecar))
		assert.Equal(t, []string{"keep"}, fileSidecar.Tags)
		require.NotNil(t, fileSidecar.CodeResults)
		assert.Len(t, fileSidecar.CodeResults.CodeBlocks, 1)
	})

	t.Run("deletes sidecar when no code block state remains", func(t *testing.T) {
		notePath := filepath.Join(t.TempDir(), "note.md")
		require.NoError(t, os.WriteFile(notePath, []byte("# Note"), 0644))
		require.NoError(t, WriteCodeResultsSidecar(notePath, CodeResultsSidecar{
			CodeBlocks: []CodeBlockResult{{CodeBlockID: "result", ResultHTML: "<div>ok</div>"}},
		}))

		require.NoError(t, WriteCodeResultsSidecar(notePath, CodeResultsSidecar{
			CodeBlocks: []CodeBlockResult{{CodeBlockID: "result"}},
		}))

		_, err := os.Stat(ConstructCodeResultsSidecarPath(notePath))
		assert.ErrorIs(t, err, os.ErrNotExist)
	})
}
