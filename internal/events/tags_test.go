package events

import (
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestReIndexNotesWithUpdatedTags(t *testing.T) {
	t.Run("should re-index markdown notes with updated tags", func(t *testing.T) {
		params := createTestParams(t)
		notesDir := setupNotesDir(t, params.ProjectPath)

		// Create note files with tags in frontmatter
		createNoteFile(t, notesDir, "folder1", "note1.md", `---
tags: [tag1, tag2]
---
# Note 1`)
		createNoteFile(t, notesDir, "folder1", "note2.md", `---
tags: [tag3]
---
# Note 2`)

		// Re-index notes with updated tags
		folderAndNoteNames := []string{
			filepath.Join("folder1", "note1.md"),
			filepath.Join("folder1", "note2.md"),
		}
		reIndexNotesWithUpdatedTags(params, folderAndNoteNames)

		// Verify notes were indexed
		doc1, _ := (*params.Index).Document("folder1/note1.md")
		assert.NotNil(t, doc1)

		doc2, _ := (*params.Index).Document("folder1/note2.md")
		assert.NotNil(t, doc2)
	})

}
