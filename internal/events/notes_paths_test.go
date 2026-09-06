package events

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/wailsapp/wails/v3/pkg/application"
)

func assertIndexedPaths(t *testing.T, params EventParams, expected map[string]string) {
	t.Helper()
	request := bleve.NewSearchRequest(bleve.NewMatchAllQuery())
	request.Fields = []string{search.FieldFolder}
	result, err := rawIndex(params).Search(request)
	require.NoError(t, err)
	folders := make(map[string]string)
	for _, hit := range result.Hits {
		folder, ok := hit.Fields[search.FieldFolder].(string)
		require.True(t, ok, "missing folder for %s", hit.ID)
		folders[hit.ID] = folder
	}
	assert.Equal(t, expected, folders)
}

func TestFileEventsCanonicalPaths(t *testing.T) {
	t.Run("create indexes root notes and attachments with an empty folder", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := setupNotesDir(t, params.ProjectPath)
		createNoteFile(t, notesDir, "", "root.md", "# Root")
		createNoteFile(t, notesDir, "", "image.png", "image bytes")
		createNoteFile(t, notesDir, "nested/deep", "note.md", "# Nested")

		handleFileCreateEvent(params, &application.CustomEvent{Data: []util.FileCreateEventData{
			{FilePath: "root.md"}, {FilePath: "image.png"}, {FilePath: "nested/deep/note.md"},
		}})

		assertIndexedPaths(t, params, map[string]string{"root.md": "", "image.png": "", "nested/deep/note.md": "nested/deep"})
	})

	t.Run("write indexes root paths and uses the supplied markdown", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := setupNotesDir(t, params.ProjectPath)
		createNoteFile(t, notesDir, "", "root.md", "# Stale")
		createNoteFile(t, notesDir, "", "image.png", "image bytes")

		handleFileWriteEvent(params, &application.CustomEvent{Data: []util.FileWriteEventData{
			{FilePath: "root.md", Markdown: "# Updated"}, {FilePath: "image.png"},
		}})

		assertIndexedPaths(t, params, map[string]string{"root.md": "", "image.png": ""})
		query := bleve.NewMatchQuery("updated")
		query.SetField(search.FieldTextContent)
		result, err := rawIndex(params).Search(bleve.NewSearchRequest(query))
		require.NoError(t, err)
		require.Len(t, result.Hits, 1)
		assert.Equal(t, "root.md", result.Hits[0].ID)
	})

	t.Run("rename moves into and out of root and delete removes the new entry", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := setupNotesDir(t, params.ProjectPath)
		createNoteFile(t, notesDir, "nested", "note.md", "# Note")
		handleFileCreateEvent(params, &application.CustomEvent{Data: []util.FileCreateEventData{{FilePath: "nested/note.md"}}})
		require.NoError(t, os.Rename(filepath.Join(notesDir, "nested/note.md"), filepath.Join(notesDir, "root.md")))

		handleFileRenameEvent(params, &application.CustomEvent{Data: []util.FileRenameEventData{{OldFilePath: "nested/note.md", NewFilePath: "root.md"}}})

		assertIndexedPaths(t, params, map[string]string{"root.md": ""})

		require.NoError(t, os.Rename(filepath.Join(notesDir, "root.md"), filepath.Join(notesDir, "nested/moved.md")))
		handleFileRenameEvent(params, &application.CustomEvent{Data: []util.FileRenameEventData{{OldFilePath: "root.md", NewFilePath: "nested/moved.md"}}})

		assertIndexedPaths(t, params, map[string]string{"nested/moved.md": "nested"})

		require.NoError(t, os.Remove(filepath.Join(notesDir, "nested/moved.md")))
		handleFileDeleteEvent(params, &application.CustomEvent{Data: []util.FileDeleteEventData{{FilePath: "nested/moved.md"}}})

		assertIndexedPaths(t, params, map[string]string{})
	})

	t.Run("rename rewrites links between root and nested paths", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := setupNotesDir(t, params.ProjectPath)
		createNoteFile(t, notesDir, "", "root.md", "# Root")
		createNoteFile(t, notesDir, "refs", "links.md", "[target](/notes/root.md)")
		handleFileCreateEvent(params, &application.CustomEvent{Data: []util.FileCreateEventData{{FilePath: "root.md"}, {FilePath: "refs/links.md"}}})
		require.NoError(t, os.MkdirAll(filepath.Join(notesDir, "nested/My Folder"), 0755))
		require.NoError(t, os.Rename(filepath.Join(notesDir, "root.md"), filepath.Join(notesDir, "nested/My Folder/new.md")))

		handleFileRenameEvent(params, &application.CustomEvent{Data: []util.FileRenameEventData{{OldFilePath: "root.md", NewFilePath: "nested/My Folder/new.md"}}})

		content, err := os.ReadFile(filepath.Join(notesDir, "refs/links.md"))
		require.NoError(t, err)
		assert.Equal(t, "[target](/notes/nested/My%20Folder/new.md)", string(content))

		handleFileWriteEvent(params, &application.CustomEvent{Data: []util.FileWriteEventData{{FilePath: "refs/links.md", Markdown: string(content)}}})
		require.NoError(t, os.Rename(filepath.Join(notesDir, "nested/My Folder/new.md"), filepath.Join(notesDir, "root.md")))
		handleFileRenameEvent(params, &application.CustomEvent{Data: []util.FileRenameEventData{{OldFilePath: "nested/My Folder/new.md", NewFilePath: "root.md"}}})

		content, err = os.ReadFile(filepath.Join(notesDir, "refs/links.md"))
		require.NoError(t, err)
		assert.Equal(t, "[target](/notes/root.md)", string(content))
	})
}
