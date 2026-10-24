//go:build !darwin

package trash

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/etesam913/bytebook/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestXDGTrash(t *testing.T) {
	t.Run("Writes metadata and removes it when a paired move is rolled back", func(t *testing.T) {
		setupTrash(t)
		source := testutil.WriteFile(t, t.TempDir(), "file.txt", []byte("content"))
		item, err := MoveToTrash(source)
		require.NoError(t, err)
		info := filepath.Join(os.Getenv("XDG_DATA_HOME"), "Trash", "info", filepath.Base(item.TrashedPath)+".trashinfo")
		content, err := os.ReadFile(info)
		require.NoError(t, err)
		assert.Contains(t, string(content), "[Trash Info]\nPath="+source+"\nDeletionDate=")

		require.NoError(t, restoreFromTrash(item.TrashedPath, item.OriginalPath))

		assert.FileExists(t, source)
		assert.NoFileExists(t, item.TrashedPath)
		assert.NoFileExists(t, info)
	})
	t.Run("Public restore remains unsupported", func(t *testing.T) {
		assert.ErrorContains(t, RestoreNotesFromTrash(t.TempDir(), nil), "only supported on macOS")
	})
}
