package events

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReplaceFilePathInMarkdown(t *testing.T) {
	t.Run("replaces link URL exactly", func(t *testing.T) {
		markdown := `Check out [my note](/notes/folder1/old.md) for details.`
		result, changed := replaceFilePathInMarkdown(markdown, "/notes/folder1/old.md", "/notes/folder1/new.md")
		assert.True(t, changed)
		assert.Equal(t, `Check out [my note](/notes/folder1/new.md) for details.`, result)
	})

	t.Run("replaces image URL exactly", func(t *testing.T) {
		markdown := `Here is an image ![screenshot](/notes/folder1/img.png) inline.`
		result, changed := replaceFilePathInMarkdown(markdown, "/notes/folder1/img.png", "/notes/folder2/img.png")
		assert.True(t, changed)
		assert.Equal(t, `Here is an image ![screenshot](/notes/folder2/img.png) inline.`, result)
	})

	t.Run("does not replace partial matches", func(t *testing.T) {
		markdown := `[note](/notes/folder1/old.md-extra)`
		result, changed := replaceFilePathInMarkdown(markdown, "/notes/folder1/old.md", "/notes/folder1/new.md")
		assert.False(t, changed)
		assert.Equal(t, markdown, result)
	})

	t.Run("replaces multiple occurrences", func(t *testing.T) {
		markdown := `[link1](/notes/f/a.md) and [link2](/notes/f/a.md)`
		result, changed := replaceFilePathInMarkdown(markdown, "/notes/f/a.md", "/notes/f/b.md")
		assert.True(t, changed)
		assert.Equal(t, `[link1](/notes/f/b.md) and [link2](/notes/f/b.md)`, result)
	})

	t.Run("returns unchanged when no match", func(t *testing.T) {
		markdown := `[link](/notes/other/note.md)`
		result, changed := replaceFilePathInMarkdown(markdown, "/notes/folder1/old.md", "/notes/folder1/new.md")
		assert.False(t, changed)
		assert.Equal(t, markdown, result)
	})
}

func TestReplaceLocalLinksInNotes(t *testing.T) {
	t.Run("updates links in notes that reference a renamed file", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := filepath.Join(params.ProjectPath, "notes")

		// Create a note that will be renamed (the target)
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder1", "target.md", "# Target")

		// Create a note that links to the target
		linkingContent := "# Linking Note\nSee [target](/notes/folder1/target.md) for info."
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder1", "linking.md", linkingContent)

		// Index both notes so the links field is populated
		addData := []map[string]string{
			{"folder": "folder1", "note": "target.md"},
			{"folder": "folder1", "note": "linking.md"},
		}
		addCreatedNotesToIndex(params, addData)

		// Simulate renaming target.md -> renamed.md
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder1", "renamed.md", "# Target")

		renameData := []map[string]string{{
			"oldFolder": "folder1",
			"oldNote":   "target.md",
			"newFolder": "folder1",
			"newNote":   "renamed.md",
		}}

		replaceLocalLinksInNotes(params, renameData)

		// Verify the linking note was updated on disk
		updatedContent, err := os.ReadFile(filepath.Join(notesDir, "folder1", "linking.md"))
		require.NoError(t, err)
		assert.Contains(t, string(updatedContent), "/notes/folder1/renamed.md")
		assert.NotContains(t, string(updatedContent), "/notes/folder1/target.md")
	})

	t.Run("handles cross-folder renames", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := filepath.Join(params.ProjectPath, "notes")

		createMarkdownNoteInFolder(t, params.ProjectPath, "src", "doc.md", "# Doc")
		linkingContent := "# Index\nRef: [doc](/notes/src/doc.md)"
		createMarkdownNoteInFolder(t, params.ProjectPath, "index", "main.md", linkingContent)

		addData := []map[string]string{
			{"folder": "src", "note": "doc.md"},
			{"folder": "index", "note": "main.md"},
		}
		addCreatedNotesToIndex(params, addData)

		createMarkdownNoteInFolder(t, params.ProjectPath, "dest", "doc.md", "# Doc")

		renameData := []map[string]string{{
			"oldFolder": "src",
			"oldNote":   "doc.md",
			"newFolder": "dest",
			"newNote":   "doc.md",
		}}

		replaceLocalLinksInNotes(params, renameData)

		updatedContent, err := os.ReadFile(filepath.Join(notesDir, "index", "main.md"))
		require.NoError(t, err)
		assert.Contains(t, string(updatedContent), "/notes/dest/doc.md")
		assert.NotContains(t, string(updatedContent), "/notes/src/doc.md")
	})

	t.Run("skips notes with no matching links", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := filepath.Join(params.ProjectPath, "notes")

		originalContent := "# Unrelated\nNo links here."
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder1", "unrelated.md", originalContent)

		addData := []map[string]string{
			{"folder": "folder1", "note": "unrelated.md"},
		}
		addCreatedNotesToIndex(params, addData)

		renameData := []map[string]string{{
			"oldFolder": "folder1",
			"oldNote":   "nonexistent.md",
			"newFolder": "folder1",
			"newNote":   "renamed.md",
		}}

		replaceLocalLinksInNotes(params, renameData)

		content, err := os.ReadFile(filepath.Join(notesDir, "folder1", "unrelated.md"))
		require.NoError(t, err)
		assert.Equal(t, originalContent, string(content))
	})
}

func TestFindNotesWithLink(t *testing.T) {
	t.Run("matches encoded internal note links and respects page size", func(t *testing.T) {
		params := createTestParams(t)

		createMarkdownNoteInFolder(t, params.ProjectPath, "My Folder", "Target Note.md", "# Target")
		createMarkdownNoteInFolder(
			t,
			params.ProjectPath,
			"refs",
			"one.md",
			"# One\n[target](/notes/My%20Folder/Target%20Note.md)",
		)
		createMarkdownNoteInFolder(
			t,
			params.ProjectPath,
			"refs",
			"two.md",
			"# Two\n[target](/notes/My%20Folder/Target%20Note.md)",
		)

		addCreatedNotesToIndex(params, []map[string]string{
			{"folder": "My Folder", "note": "Target Note.md"},
			{"folder": "refs", "note": "one.md"},
			{"folder": "refs", "note": "two.md"},
		})

		hits := FindNotesWithLink(
			rawIndex(params),
			"/notes/"+EncodeLinkSegment("My Folder")+"/"+EncodeLinkSegment("Target Note.md"),
			1,
		)

		assert.Len(t, hits, 1)
		assert.Contains(t, []string{"refs/one.md", "refs/two.md"}, hits[0])
	})
}
