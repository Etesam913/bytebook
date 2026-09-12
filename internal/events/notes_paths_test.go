package events

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes/sidecar"
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

func TestBatchRenamePreservesMetadataPinsAndLinks(t *testing.T) {
	// Start with a note and attachment that have sidecars, pins, and incoming links.
	params := createTestParams(t)
	root := setupNotesDir(t, params.ProjectPath)
	require.NoError(t, os.Mkdir(filepath.Join(root, "dest"), 0755))
	metadata := []byte(`{"tags":["keep"],"codeResults":{"version":1,"codeBlocks":[]}}`)
	for _, name := range []string{"note.md", "image.png"} {
		createNoteFile(t, root, "", name, "content")
		require.NoError(t, os.WriteFile(sidecar.PathFor(filepath.Join(root, name)), metadata, 0644))
	}
	createNoteFile(t, root, "", "links.md", "[note](/notes/note.md) [image](/notes/image.png)")
	settingsPath := filepath.Join(params.ProjectPath, "settings", "settings.json")
	require.NoError(t, os.MkdirAll(filepath.Dir(settingsPath), 0755))
	require.NoError(t, util.WriteJsonToPath(settingsPath, config.ProjectSettingsJson{PinnedNotes: []string{"note.md", "image.png"}}))
	handleFileCreateEvent(params, &application.CustomEvent{Data: []util.FileCreateEventData{{FilePath: "note.md"}, {FilePath: "image.png"}, {FilePath: "links.md"}}})
	// Finder moves the visible files; the rename handler must move their sidecars.
	for _, name := range []string{"note.md", "image.png"} {
		require.NoError(t, os.Rename(filepath.Join(root, name), filepath.Join(root, "dest", name)))
	}

	// Deliver both moves together, as one watcher debounce batch.
	handleFileRenameEvent(params, &application.CustomEvent{Data: []util.FileRenameEventData{
		{OldFilePath: "note.md", NewFilePath: "dest/note.md"},
		{OldFilePath: "image.png", NewFilePath: "dest/image.png"},
	}})

	// Metadata follows each file, and every stored reference uses its new path.
	for _, name := range []string{"note.md", "image.png"} {
		actual, err := os.ReadFile(sidecar.PathFor(filepath.Join(root, "dest", name)))
		require.NoError(t, err)
		assert.Equal(t, metadata, actual)
		assert.NoFileExists(t, sidecar.PathFor(filepath.Join(root, name)))
	}
	var settings config.ProjectSettingsJson
	require.NoError(t, util.ReadJsonFromPath(settingsPath, &settings))
	assert.Equal(t, []string{"dest/note.md", "dest/image.png"}, settings.PinnedNotes)
	content, err := os.ReadFile(filepath.Join(root, "links.md"))
	require.NoError(t, err)
	assert.Equal(t, "[note](/notes/dest/note.md) [image](/notes/dest/image.png)", string(content))
	assertIndexedPaths(t, params, map[string]string{"dest/note.md": "dest", "dest/image.png": "dest", "links.md": ""})
}
