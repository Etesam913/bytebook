package services

import (
	"encoding/json"
	"path/filepath"
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildEncodedNoteURLPath(t *testing.T) {
	assert.Equal(t, "/notes/root.md", buildEncodedNoteURLPath("root.md"))
	assert.Equal(t, "/notes/team/specs/doc.md", buildEncodedNoteURLPath("team/specs/doc.md"))
	assert.Equal(t, "/notes/My%20Folder/doc%20%281%29.md", buildEncodedNoteURLPath("My Folder/doc (1).md"))
	assert.Equal(t, "", buildEncodedNoteURLPath("/"))
}

func TestSplitNotePath(t *testing.T) {
	folder, note, ok := splitNotePath("root.md")
	assert.True(t, ok)
	assert.Equal(t, "", folder)
	assert.Equal(t, "root.md", note)

	folder, note, ok = splitNotePath("team/specs/doc.md")
	assert.True(t, ok)
	assert.Equal(t, "team/specs", folder)
	assert.Equal(t, "doc.md", note)

	_, _, ok = splitNotePath("")
	assert.False(t, ok)
}

func TestGetPathsFromSearchQuery(t *testing.T) {
	newService := func(t *testing.T) (SearchService, string, bleve.Index) {
		projectPath := t.TempDir()
		index := createTestSearchIndex(t)
		return SearchService{ProjectPath: projectPath, Index: search.NewIndexHolder(index)}, projectPath, index
	}

	t.Run("returns paths from IDs without stored fields", func(t *testing.T) {
		mapping := bleve.NewIndexMapping()
		document := bleve.NewDocumentMapping()
		field := bleve.NewTextFieldMapping()
		field.Store = false
		field.Analyzer = "keyword"
		document.AddFieldMappingsAt(search.FieldType, field)
		mapping.DefaultMapping = document
		index, err := bleve.NewMemOnly(mapping)
		require.NoError(t, err)
		t.Cleanup(func() { require.NoError(t, index.Close()) })
		require.NoError(t, index.Index("nested/note.md", map[string]string{"type": search.NOTE_TYPE}))
		require.NoError(t, index.Index("photo.png", map[string]string{"type": search.ATTACHMENT_TYPE}))
		require.NoError(t, index.Index("nested/", map[string]string{"type": search.FOLDER_TYPE}))
		service := SearchService{Index: search.NewIndexHolder(index)}

		response := service.GetPathsFromSearchQuery("t:note OR t:attachment OR t:folder")

		require.True(t, response.Success)
		assert.Equal(t, []string{"nested/note.md", "photo.png"}, response.Data)
	})

	t.Run("matches notes by tag filter", func(t *testing.T) {
		service, projectPath, index := newService(t)
		writeTestNote(t, projectPath, "cooking/pasta.md", "---\ntags:\n  - recipe\n---\n# Pasta")
		writeTestNote(t, projectPath, "cooking/notes.md", "# Plain note")
		indexTestNotes(t, projectPath, index, "cooking/pasta.md", "cooking/notes.md")

		res := service.GetPathsFromSearchQuery("#recipe")

		assert.True(t, res.Success)
		assert.Equal(t, []string{"cooking/pasta.md"}, res.Data)
	})

	t.Run("matches notes by filename filter", func(t *testing.T) {
		service, projectPath, index := newService(t)
		writeTestNote(t, projectPath, "cooking/pasta.md", "# Pasta")
		writeTestNote(t, projectPath, "work/meeting.md", "# Meeting")
		indexTestNotes(t, projectPath, index, "cooking/pasta.md", "work/meeting.md")

		res := service.GetPathsFromSearchQuery("f:pasta")

		assert.True(t, res.Success)
		assert.Equal(t, []string{"cooking/pasta.md"}, res.Data)
	})

	t.Run("type filter returns only attachments", func(t *testing.T) {
		service, projectPath, index := newService(t)
		writeTestNote(t, projectPath, "cooking/pasta.md", "# Pasta")
		writeTestNote(t, projectPath, "cooking/photo.png", "binary-ish")
		indexTestNotes(t, projectPath, index, "cooking/pasta.md", "cooking/photo.png")

		res := service.GetPathsFromSearchQuery("type:attachment")

		assert.True(t, res.Success)
		assert.Equal(t, []string{"cooking/photo.png"}, res.Data)
	})

	t.Run("supports negation and OR operators", func(t *testing.T) {
		service, projectPath, index := newService(t)
		writeTestNote(t, projectPath, "cooking/pasta.md", "---\ntags:\n  - recipe\n---\n# Pasta")
		writeTestNote(t, projectPath, "cooking/soup.md", "---\ntags:\n  - recipe\n  - draft\n---\n# Soup")
		writeTestNote(t, projectPath, "work/meeting.md", "# Meeting")
		indexTestNotes(t, projectPath, index, "cooking/pasta.md", "cooking/soup.md", "work/meeting.md")

		negated := service.GetPathsFromSearchQuery("#recipe -#draft")
		assert.Equal(t, []string{"cooking/pasta.md"}, negated.Data)

		ored := service.GetPathsFromSearchQuery("f:soup OR f:meeting")
		assert.ElementsMatch(t, []string{"cooking/soup.md", "work/meeting.md"}, ored.Data)
	})

	t.Run("excludes documents that are not notes or attachments", func(t *testing.T) {
		service, projectPath, index := newService(t)
		writeTestNote(t, projectPath, "cooking/pasta.md", "# Pasta")
		indexTestNotes(t, projectPath, index, "cooking/pasta.md")
		require.NoError(t, index.Index("folder-doc", map[string]any{
			"type":      "folder",
			"folder":    "cooking",
			"file_name": "cooking",
		}))

		res := service.GetPathsFromSearchQuery("f:cooking")

		assert.True(t, res.Success)
		assert.Equal(t, []string{"cooking/pasta.md"}, res.Data)
	})

	t.Run("empty query matches nothing", func(t *testing.T) {
		service, projectPath, index := newService(t)
		writeTestNote(t, projectPath, "cooking/pasta.md", "# Pasta")
		indexTestNotes(t, projectPath, index, "cooking/pasta.md")

		res := service.GetPathsFromSearchQuery("")

		assert.True(t, res.Success)
		assert.Empty(t, res.Data)
		// Must be an empty slice, not nil: nil crosses the Wails boundary as null.
		assert.NotNil(t, res.Data)
	})

	t.Run("matches notes at the vault root", func(t *testing.T) {
		service, projectPath, index := newService(t)
		writeTestNote(t, projectPath, "scratch.md", "# Scratch")
		writeTestNote(t, projectPath, "cooking/pasta.md", "# Pasta")
		indexTestNotes(t, projectPath, index, "scratch.md", "cooking/pasta.md")

		res := service.GetPathsFromSearchQuery("f:scratch")

		assert.True(t, res.Success)
		assert.Equal(t, []string{"scratch.md"}, res.Data)
	})

	t.Run("returns sorted paths", func(t *testing.T) {
		service, projectPath, index := newService(t)
		writeTestNote(t, projectPath, "b/zeta.md", "# Common word")
		writeTestNote(t, projectPath, "a/alpha.md", "# Common word")
		indexTestNotes(t, projectPath, index, "b/zeta.md", "a/alpha.md")

		res := service.GetPathsFromSearchQuery("type:note")

		assert.True(t, res.Success)
		assert.Equal(t, []string{"a/alpha.md", "b/zeta.md"}, res.Data)
	})
}

func TestGetLinkedMentions(t *testing.T) {
	t.Run("finds mentions for nested note paths", func(t *testing.T) {
		projectPath := t.TempDir()
		index := createTestSearchIndex(t)
		service := SearchService{ProjectPath: projectPath, Index: search.NewIndexHolder(index)}

		writeTestNote(t, projectPath, "team/specs/doc.md", "# Target")
		writeTestNote(t, projectPath, "refs/one.md", "[target](/notes/team/specs/doc.md)")
		indexTestNotes(t, projectPath, index, "team/specs/doc.md", "refs/one.md")

		res := service.GetLinkedMentions("team/specs/doc.md", 10)

		require.True(t, res.Success)
		require.Len(t, res.Data, 1)
		assert.Equal(t, LinkedMention{Folder: "refs", Note: "one.md"}, res.Data[0])
	})

	t.Run("finds mentions for notes in the root folder", func(t *testing.T) {
		projectPath := t.TempDir()
		index := createTestSearchIndex(t)
		service := SearchService{ProjectPath: projectPath, Index: search.NewIndexHolder(index)}

		writeTestNote(t, projectPath, "root.md", "# Root")
		writeTestNote(t, projectPath, "refs/from-folder.md", "[root](/notes/root.md)")
		indexTestNotes(t, projectPath, index, "root.md", "refs/from-folder.md")

		res := service.GetLinkedMentions("root.md", 10)

		require.True(t, res.Success)
		require.Len(t, res.Data, 1)
		assert.Equal(t, LinkedMention{Folder: "refs", Note: "from-folder.md"}, res.Data[0])
	})

	t.Run("preserves top-level referrer notes in results", func(t *testing.T) {
		projectPath := t.TempDir()
		index := createTestSearchIndex(t)
		service := SearchService{ProjectPath: projectPath, Index: search.NewIndexHolder(index)}

		writeTestNote(t, projectPath, "folder/target.md", "# Target")
		writeTestNote(t, projectPath, "root-ref.md", "[target](/notes/folder/target.md)")
		indexTestNotes(t, projectPath, index, "folder/target.md", "root-ref.md")

		res := service.GetLinkedMentions("folder/target.md", 10)

		require.True(t, res.Success)
		require.Len(t, res.Data, 1)
		assert.Equal(t, LinkedMention{Folder: "", Note: "root-ref.md"}, res.Data[0])
	})
}

func TestFullTextSearch(t *testing.T) {
	t.Run("Reports an unavailable index as a failure", func(t *testing.T) {
		idx, err := bleve.New(filepath.Join(t.TempDir(), "index"), bleve.NewIndexMapping())
		require.NoError(t, err)
		service := SearchService{Index: search.NewIndexHolder(idx)}
		require.NoError(t, idx.Close())

		response := service.FullTextSearch("redis", nil, nil, false)
		encoded, err := json.Marshal(response)
		require.NoError(t, err)
		var body map[string]any
		require.NoError(t, json.Unmarshal(encoded, &body))

		assert.Equal(t, false, body["success"])
		assert.Equal(t, "Could not search notes. Please try again.", body["message"])
	})
}

func TestFullTextSearchPages(t *testing.T) {
	idx, err := search.OpenOrCreateIndex(t.TempDir())
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, idx.Close()) })
	for _, name := range []string{"Alpha.md", "Beta.md", "Gamma.md"} {
		require.NoError(t, idx.Index(name, search.NoteBleveDocument{Type: "note", Folder: "Notes", FileName: name, TextContent: "redis caching"}))
	}
	batch := idx.NewBatch()
	require.NoError(t, search.AddFolderToBatch(batch, "Redis"))
	require.NoError(t, search.AddFolderToBatch(batch, "Projects/Redis"))
	require.NoError(t, idx.Batch(batch))
	service := SearchService{Index: search.NewIndexHolder(idx)}
	size := 3

	first := service.FullTextSearch("redis", nil, &size, true)
	require.True(t, first.Success)
	require.Len(t, first.Data.Results, 3)
	second := service.FullTextSearch("redis", first.Data.NextSearchAfter, &size, true)
	empty := service.FullTextSearch("zzzzzzzzzzzzzz", nil, &size, false)

	assert.True(t, first.Data.HasMore)
	assert.Equal(t, uint64(5), first.Data.Total)
	require.True(t, second.Success)
	require.Len(t, second.Data.Results, 2)
	seen := make(map[string]bool)
	types := make([]string, 0, 5)
	for _, result := range append(first.Data.Results, second.Data.Results...) {
		id := result.Type + ":" + result.Folder + "/" + result.Name
		assert.False(t, seen[id], "pagination must not duplicate %s", id)
		seen[id] = true
		types = append(types, result.Type)
	}
	assert.ElementsMatch(t, []string{"note", "note", "note", "folder", "folder"}, types)
	assert.False(t, second.Data.HasMore)
	assert.True(t, empty.Success)
	assert.Empty(t, empty.Data.Results)
}

func TestFullTextSearchSyntax(t *testing.T) {
	project := t.TempDir()
	idx := createTestSearchIndex(t)
	writeTestNote(t, project, "work/redis.md", "---\ntags:\n  - work\n---\n# Redis\ncache invalidation\n\n```python\nprint('cache')\n```\nAdditional Redis notes.\n")
	writeTestNote(t, project, "work/alpha.md", "---\ntags:\n  - work\n---\n# Alpha\ncache invalidation\n[target](/notes/work/redis.md)")
	writeTestNote(t, project, "personal/other.md", "# Other\nunrelated content")
	indexTestNotes(t, project, idx, "work/redis.md", "work/alpha.md", "personal/other.md")
	batch := idx.NewBatch()
	require.NoError(t, search.AddFolderToBatch(batch, "Projects/Redis"))
	require.NoError(t, search.AddFolderToBatch(batch, "Unrelated"))
	require.NoError(t, idx.Batch(batch))
	service := SearchService{ProjectPath: project, Index: search.NewIndexHolder(idx)}
	assertNames := func(t *testing.T, query string, expected []string) {
		t.Helper()
		page := service.FullTextSearch(query, nil, nil, false)

		require.True(t, page.Success)
		names := make([]string, 0, len(page.Data.Results))
		for _, result := range page.Data.Results {
			names = append(names, result.Name)
		}
		assert.Equal(t, expected, names)
	}
	t.Run("Filename syntax", func(t *testing.T) { assertNames(t, "f:redis", []string{"redis.md"}) })
	t.Run("Tag type and explicit sorting", func(t *testing.T) {
		assertNames(t, "#work AND type:note sort:size_asc", []string{"alpha.md", "redis.md"})
	})
	t.Run("Descending size sorting", func(t *testing.T) { assertNames(t, "#work sort:size_desc", []string{"redis.md", "alpha.md"}) })
	t.Run("Quoted phrase and Boolean query", func(t *testing.T) { assertNames(t, "\"cache invalidation\" AND f:redis", []string{"redis.md"}) })
	t.Run("Link syntax", func(t *testing.T) { assertNames(t, "@work/redis.md", []string{"alpha.md"}) })
	t.Run("Language syntax", func(t *testing.T) { assertNames(t, "lang:python", []string{"redis.md"}) })
	t.Run("Folders require opt-in and match case-insensitive paths", func(t *testing.T) {
		page := service.FullTextSearch("t:folder AND f:PROJECTS/REDIS", nil, nil, true)
		excluded := service.FullTextSearch("t:folder", nil, nil, false)

		require.True(t, page.Success)
		require.Len(t, page.Data.Results, 1)
		assert.Equal(t, "Projects", page.Data.Results[0].Folder)
		assert.Equal(t, "Redis", page.Data.Results[0].Name)
		require.True(t, excluded.Success)
		assert.Empty(t, excluded.Data.Results)
	})
	t.Run("Folder filters preserve negation and do not inherit note content", func(t *testing.T) {
		page := service.FullTextSearch("t:folder AND -f:REDIS", nil, nil, true)

		require.True(t, page.Success)
		require.Len(t, page.Data.Results, 1)
		assert.Equal(t, "Unrelated", page.Data.Results[0].Name)
		for _, query := range []string{"t:folder AND cache", "t:folder AND #work", "t:folder AND l:go", "t:folder AND @Redis", `t:folder AND "Redis"`, "f:missing"} {
			result := service.FullTextSearch(query, nil, nil, true)
			require.True(t, result.Success)
			assert.Empty(t, result.Data.Results, query)
		}
	})
}
