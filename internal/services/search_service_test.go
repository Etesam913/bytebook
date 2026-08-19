package services

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createTestSearchIndex(t *testing.T) bleve.Index {
	index, err := search.OpenOrCreateIndex(t.TempDir())
	require.NoError(t, err)
	t.Cleanup(func() {
		index.Close()
	})
	return index
}

func writeTestNote(t *testing.T, projectPath, relativePath, content string) {
	notePath := filepath.Join(projectPath, "notes", relativePath)
	require.NoError(t, os.MkdirAll(filepath.Dir(notePath), 0755))
	require.NoError(t, os.WriteFile(notePath, []byte(content), 0644))
}

func indexTestNotes(t *testing.T, projectPath string, index bleve.Index, relativePaths ...string) {
	discoveredPaths := make([]string, 0, len(relativePaths))
	for _, relativePath := range relativePaths {
		discoveredPaths = append(discoveredPaths, filepath.Join(projectPath, "notes", relativePath))
	}

	require.NoError(t, search.IndexDiscoveredFiles(projectPath, discoveredPaths, index, 1))
}

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

	t.Run("matches notes by tag filter", func(t *testing.T) {
		service, projectPath, index := newService(t)
		writeTestNote(t, projectPath, "cooking/pasta.md", "---\ntags:\n  - recipe\n---\n# Pasta")
		writeTestNote(t, projectPath, "cooking/notes.md", "# Plain note")
		indexTestNotes(t, projectPath, index, "cooking/pasta.md", "cooking/notes.md")

		paths := service.GetPathsFromSearchQuery("#recipe")

		assert.Equal(t, []string{"cooking/pasta.md"}, paths)
	})

	t.Run("matches notes by filename filter", func(t *testing.T) {
		service, projectPath, index := newService(t)
		writeTestNote(t, projectPath, "cooking/pasta.md", "# Pasta")
		writeTestNote(t, projectPath, "work/meeting.md", "# Meeting")
		indexTestNotes(t, projectPath, index, "cooking/pasta.md", "work/meeting.md")

		paths := service.GetPathsFromSearchQuery("f:pasta")

		assert.Equal(t, []string{"cooking/pasta.md"}, paths)
	})

	t.Run("type filter returns only attachments", func(t *testing.T) {
		service, projectPath, index := newService(t)
		writeTestNote(t, projectPath, "cooking/pasta.md", "# Pasta")
		writeTestNote(t, projectPath, "cooking/photo.png", "binary-ish")
		indexTestNotes(t, projectPath, index, "cooking/pasta.md", "cooking/photo.png")

		paths := service.GetPathsFromSearchQuery("type:attachment")

		assert.Equal(t, []string{"cooking/photo.png"}, paths)
	})

	t.Run("supports negation and OR operators", func(t *testing.T) {
		service, projectPath, index := newService(t)
		writeTestNote(t, projectPath, "cooking/pasta.md", "---\ntags:\n  - recipe\n---\n# Pasta")
		writeTestNote(t, projectPath, "cooking/soup.md", "---\ntags:\n  - recipe\n  - draft\n---\n# Soup")
		writeTestNote(t, projectPath, "work/meeting.md", "# Meeting")
		indexTestNotes(t, projectPath, index, "cooking/pasta.md", "cooking/soup.md", "work/meeting.md")

		negated := service.GetPathsFromSearchQuery("#recipe -#draft")
		assert.Equal(t, []string{"cooking/pasta.md"}, negated)

		ored := service.GetPathsFromSearchQuery("f:soup OR f:meeting")
		assert.ElementsMatch(t, []string{"cooking/soup.md", "work/meeting.md"}, ored)
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

		paths := service.GetPathsFromSearchQuery("f:cooking")

		assert.Equal(t, []string{"cooking/pasta.md"}, paths)
	})

	t.Run("empty query matches nothing", func(t *testing.T) {
		service, projectPath, index := newService(t)
		writeTestNote(t, projectPath, "cooking/pasta.md", "# Pasta")
		indexTestNotes(t, projectPath, index, "cooking/pasta.md")

		assert.Empty(t, service.GetPathsFromSearchQuery(""))
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
