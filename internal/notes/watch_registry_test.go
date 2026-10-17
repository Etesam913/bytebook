package notes

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDirectoryWatchRegistryRemove(t *testing.T) {
	t.Run("Removes a and its identities without touching the ab prefix sibling", func(t *testing.T) {
		root := t.TempDir()
		a := filepath.Join(root, "a")
		aChild := filepath.Join(a, "child")
		aFile := filepath.Join(aChild, "note.md")
		ab := filepath.Join(root, "ab")
		abChild := filepath.Join(ab, "child")
		abFile := filepath.Join(abChild, "note.md")
		require.NoError(t, os.MkdirAll(aChild, 0755))
		require.NoError(t, os.MkdirAll(abChild, 0755))
		require.NoError(t, os.WriteFile(aFile, []byte("a"), 0644))
		require.NoError(t, os.WriteFile(abFile, []byte("ab"), 0644))
		registry := NewDirectoryWatchRegistry()
		registry.Add(a)
		registry.Add(aChild)
		registry.Add(ab)
		registry.Add(abChild)
		require.NotNil(t, registry.fileInfo(aFile))
		require.NotNil(t, registry.fileInfo(abFile))

		registry.Remove(a)

		assert.False(t, registry.Has(a))
		assert.Nil(t, registry.fileInfo(a))
		assert.Nil(t, registry.fileInfo(aChild))
		assert.Nil(t, registry.fileInfo(aFile))
		assert.True(t, registry.Has(ab))
		assert.True(t, registry.Has(abChild))
		assert.NotNil(t, registry.fileInfo(ab))
		assert.NotNil(t, registry.fileInfo(abChild))
		assert.NotNil(t, registry.fileInfo(abFile))
	})
}
