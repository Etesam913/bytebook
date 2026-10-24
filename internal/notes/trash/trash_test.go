package trash

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/etesam913/bytebook/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTrash(t *testing.T) {
	t.Helper()
	root := t.TempDir()
	t.Setenv("BYTEBOOK_TRASH_DIR", filepath.Join(root, "trash"))
	t.Setenv("XDG_DATA_HOME", root)
}

func TestMoveToTrash(t *testing.T) {
	t.Run("Moves a file into a newly created trash directory", func(t *testing.T) {
		setupTrash(t)
		source := testutil.WriteFile(t, t.TempDir(), "file.txt", []byte("content"))

		item, err := MoveToTrash(source)

		require.NoError(t, err)
		assert.Equal(t, source, item.OriginalPath)
		assert.False(t, item.IsFolder)
		assert.NoFileExists(t, source)
		content, err := os.ReadFile(item.TrashedPath)
		require.NoError(t, err)
		assert.Equal(t, "content", string(content))
	})
	t.Run("Moves a folder and its contents", func(t *testing.T) {
		setupTrash(t)
		source := t.TempDir()
		testutil.WriteFile(t, source, "nested/file.txt", []byte("content"))

		item, err := MoveToTrash(source)

		require.NoError(t, err)
		assert.True(t, item.IsFolder)
		assert.NoDirExists(t, source)
		content, err := os.ReadFile(filepath.Join(item.TrashedPath, "nested", "file.txt"))
		require.NoError(t, err)
		assert.Equal(t, "content", string(content))
	})
	t.Run("Preserves files with the same basename", func(t *testing.T) {
		setupTrash(t)
		first := testutil.WriteFile(t, t.TempDir(), "file.txt", []byte("first"))
		second := testutil.WriteFile(t, t.TempDir(), "file.txt", []byte("second"))

		firstItem, err := MoveToTrash(first)
		require.NoError(t, err)
		secondItem, err := MoveToTrash(second)
		require.NoError(t, err)

		assert.NotEqual(t, firstItem.TrashedPath, secondItem.TrashedPath)
		for path, expected := range map[string]string{firstItem.TrashedPath: "first", secondItem.TrashedPath: "second"} {
			content, err := os.ReadFile(path)
			require.NoError(t, err)
			assert.Equal(t, expected, string(content))
		}
	})
	t.Run("Reports a missing source", func(t *testing.T) {
		setupTrash(t)

		_, err := MoveToTrash(filepath.Join(t.TempDir(), "missing"))

		assert.ErrorIs(t, err, os.ErrNotExist)
	})
}

func TestMoveNotesToTrash(t *testing.T) {
	t.Run("Moves only the matching sidecar and returns successful items on partial failure", func(t *testing.T) {
		setupTrash(t)
		project := t.TempDir()
		notes := filepath.Join(project, "notes")
		note := testutil.WriteFile(t, notes, "report.md", []byte("# Report"))
		sidecar := testutil.WriteFile(t, notes, ".report.md.json", []byte(`{"codeResults":{"codeBlocks":[]}}`))
		sibling := testutil.WriteFile(t, notes, ".report.pdf.json", []byte(`{"tags":["attachment"]}`))

		items, err := MoveNotesToTrash(project, []string{"missing.md", "report.md"})

		assert.ErrorIs(t, err, os.ErrNotExist)
		require.Len(t, items, 1)
		assert.Equal(t, note, items[0].OriginalPath)
		assert.FileExists(t, items[0].TrashedPath)
		require.Len(t, items[0].RelatedItems, 1)
		assert.Equal(t, sidecar, items[0].RelatedItems[0].OriginalPath)
		assert.FileExists(t, items[0].RelatedItems[0].TrashedPath)
		assert.NoFileExists(t, note)
		assert.NoFileExists(t, sidecar)
		assert.FileExists(t, sibling)
	})
	t.Run("Rejects traversal without moving files outside notes", func(t *testing.T) {
		setupTrash(t)
		project := t.TempDir()
		source := testutil.WriteFile(t, project, "outside.md", []byte("keep"))

		items, err := MoveNotesToTrash(project, []string{"../outside.md"})

		assert.Error(t, err)
		assert.Empty(t, items)
		assert.FileExists(t, source)
	})
	t.Run("Trashes a selected folder once when its child is also selected", func(t *testing.T) {
		setupTrash(t)
		project := t.TempDir()
		testutil.WriteFile(t, filepath.Join(project, "notes"), "folder/note.md", []byte("# Note"))

		items, err := MoveNotesToTrash(project, []string{"folder/", "folder/note.md", "folder"})

		require.NoError(t, err)
		require.Len(t, items, 1)
		assert.True(t, items[0].IsFolder)
		assert.FileExists(t, filepath.Join(items[0].TrashedPath, "note.md"))
	})
}

func TestUniqueTrashName(t *testing.T) {
	t.Run("Preserves dangling symlinks at the destination", func(t *testing.T) {
		dir := t.TempDir()
		first, err := uniqueTrashName(dir, "file.txt")
		require.NoError(t, err)
		require.NoError(t, os.Symlink(filepath.Join(dir, "missing"), first))

		second, err := uniqueTrashName(dir, "file.txt")

		require.NoError(t, err)
		assert.NotEqual(t, first, second)
		_, err = os.Lstat(first)
		assert.NoError(t, err)
	})
	t.Run("Returns destination access errors", func(t *testing.T) {
		file := testutil.WriteFile(t, t.TempDir(), "file", nil)

		_, err := uniqueTrashName(file, "note.md")

		assert.Error(t, err)
		assert.False(t, errors.Is(err, os.ErrNotExist))
	})
}
