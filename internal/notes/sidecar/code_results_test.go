package sidecar

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWriteCodeResults(t *testing.T) {
	t.Run("writes only persisted code block state", func(t *testing.T) {
		notePath := filepath.Join(t.TempDir(), "note.md")
		require.NoError(t, os.WriteFile(notePath, []byte("# Note"), 0644))

		require.NoError(t, WriteCodeResults(notePath, CodeResults{
			CodeBlocks: []CodeBlock{
				{CodeBlockID: "empty"},
				{CodeBlockID: "hidden", AreResultsHidden: true},
				{CodeBlockID: "result", ResultHTML: "<div>ok</div>", LastRan: "2026-05-03T18:42:10Z"},
			},
		}))

		results, err := ReadCodeResults(notePath)
		require.NoError(t, err)
		require.Len(t, results.CodeBlocks, 1)
		assert.Equal(t, CodeResultsVersion, results.Version)
		assert.Equal(t, "result", results.CodeBlocks[0].CodeBlockID)
	})

	t.Run("preserves other sidecar fields", func(t *testing.T) {
		notePath := filepath.Join(t.TempDir(), "note.md")
		require.NoError(t, os.WriteFile(notePath, []byte("# Note"), 0644))
		require.NoError(t, util.WriteJsonToPath(PathFor(notePath), Data{
			Tags: []string{"keep"},
		}))

		require.NoError(t, WriteCodeResults(notePath, CodeResults{
			CodeBlocks: []CodeBlock{{CodeBlockID: "result", ResultHTML: "<div>ok</div>"}},
		}))

		var data Data
		require.NoError(t, util.ReadJsonFromPath(PathFor(notePath), &data))
		assert.Equal(t, []string{"keep"}, data.Tags)
		require.NotNil(t, data.CodeResults)
		assert.Len(t, data.CodeResults.CodeBlocks, 1)
	})

	t.Run("deletes sidecar when no code block state remains", func(t *testing.T) {
		notePath := filepath.Join(t.TempDir(), "note.md")
		require.NoError(t, os.WriteFile(notePath, []byte("# Note"), 0644))
		require.NoError(t, WriteCodeResults(notePath, CodeResults{
			CodeBlocks: []CodeBlock{{CodeBlockID: "result", ResultHTML: "<div>ok</div>"}},
		}))

		require.NoError(t, WriteCodeResults(notePath, CodeResults{
			CodeBlocks: []CodeBlock{{CodeBlockID: "result"}},
		}))

		_, err := os.Stat(PathFor(notePath))
		assert.ErrorIs(t, err, os.ErrNotExist)
	})
}
