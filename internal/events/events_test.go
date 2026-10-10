package events

import (
	"fmt"
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// addBatchDocs queues n documents on batch without committing them
func addBatchDocs(t *testing.T, batch *bleve.Batch, n int) {
	for i := range n {
		require.NoError(t, batch.Index(fmt.Sprintf("doc-%d", i), map[string]string{"text": "x"}))
	}
}

func TestFlushBatchIfFull(t *testing.T) {
	t.Run("leaves a batch below the threshold uncommitted", func(t *testing.T) {
		idx := createTestIndex(t)
		batch := idx.NewBatch()
		addBatchDocs(t, batch, 3)

		require.NoError(t, flushBatchIfFull(idx, batch))

		assert.EqualValues(t, 3, batch.Size())
		count, err := idx.DocCount()
		require.NoError(t, err)
		assert.Zero(t, count)
	})

	t.Run("commits and resets a batch at the threshold", func(t *testing.T) {
		idx := createTestIndex(t)
		batch := idx.NewBatch()
		addBatchDocs(t, batch, search.DefaultBatchSize)

		require.NoError(t, flushBatchIfFull(idx, batch))

		assert.Zero(t, batch.Size())
		count, err := idx.DocCount()
		require.NoError(t, err)
		assert.EqualValues(t, search.DefaultBatchSize, count)
	})

	t.Run("resets the batch and returns the error when the commit fails", func(t *testing.T) {
		idx, err := search.OpenOrCreateIndex(t.TempDir())
		require.NoError(t, err)
		batch := idx.NewBatch()
		addBatchDocs(t, batch, search.DefaultBatchSize)
		require.NoError(t, idx.Close())

		assert.Error(t, flushBatchIfFull(idx, batch))
		assert.Zero(t, batch.Size())
	})
}
