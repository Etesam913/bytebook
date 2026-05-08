package sidecar

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSanitizeTags(t *testing.T) {
	tests := []struct {
		name     string
		input    []string
		expected []string
	}{
		{
			name:     "empty slice",
			input:    []string{},
			expected: []string{},
		},
		{
			name:     "trims whitespace",
			input:    []string{"  tag1  ", "tag2", "  tag3"},
			expected: []string{"tag1", "tag2", "tag3"},
		},
		{
			name:     "removes empty tags",
			input:    []string{"tag1", "", "   ", "tag2"},
			expected: []string{"tag1", "tag2"},
		},
		{
			name:     "removes duplicates",
			input:    []string{"tag1", "tag2", "tag1", "tag2"},
			expected: []string{"tag1", "tag2"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := sanitizeTags(tt.input)
			assert.ElementsMatch(t, tt.expected, result)
		})
	}
}

func TestReadTags(t *testing.T) {
	t.Run("returns empty slice when sidecar does not exist", func(t *testing.T) {
		projectPath := setupTestDir(t)
		tags, err := ReadTags(projectPath, "testfolder", "missing.jpg")
		require.NoError(t, err)
		assert.Empty(t, tags)
	})

	t.Run("reads existing sidecar", func(t *testing.T) {
		projectPath := setupTestDir(t)
		sidecarPath := filepath.Join(projectPath, "notes", "testfolder", ".photo.json")
		require.NoError(t, os.WriteFile(sidecarPath, []byte(`{"tags":["tag1","tag2"]}`), 0644))

		tags, err := ReadTags(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1", "tag2"}, tags)
	})

	t.Run("returns error for invalid json", func(t *testing.T) {
		projectPath := setupTestDir(t)
		sidecarPath := filepath.Join(projectPath, "notes", "testfolder", ".photo.json")
		require.NoError(t, os.WriteFile(sidecarPath, []byte(`invalid json`), 0644))

		_, err := ReadTags(projectPath, "testfolder", "photo.jpg")
		assert.Error(t, err)
	})
}

func TestWriteTags(t *testing.T) {
	t.Run("creates sidecar with tags", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteTags(projectPath, "testfolder", "photo.jpg", []string{"tag1", "tag2"})
		require.NoError(t, err)

		tags, err := ReadTags(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1", "tag2"}, tags)
	})

	t.Run("sanitizes tags before writing", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteTags(projectPath, "testfolder", "photo.jpg", []string{"  tag1  ", "", "tag1"})
		require.NoError(t, err)

		tags, err := ReadTags(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1"}, tags)
	})

	t.Run("preserves CodeResults when updating tags", func(t *testing.T) {
		projectPath := setupTestDir(t)
		notePath := filepath.Join(projectPath, "notes", "testfolder", "note.md")
		require.NoError(t, os.WriteFile(notePath, []byte("# Note"), 0644))
		require.NoError(t, WriteCodeResults(notePath, CodeResults{
			CodeBlocks: []CodeBlock{{CodeBlockID: "x", ResultHTML: "<div>ok</div>"}},
		}))

		require.NoError(t, WriteTags(projectPath, "testfolder", "note.md", []string{"keep"}))

		results, err := ReadCodeResults(notePath)
		require.NoError(t, err)
		assert.Len(t, results.CodeBlocks, 1)
	})
}

func TestGetTags(t *testing.T) {
	t.Run("returns tags when sidecar exists", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteTags(projectPath, "testfolder", "photo.jpg", []string{"tag1"})
		require.NoError(t, err)

		tags, err := GetTags(projectPath, "testfolder/photo.jpg")
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1"}, tags)
	})

	t.Run("returns empty slice when sidecar missing", func(t *testing.T) {
		projectPath := setupTestDir(t)
		tags, err := GetTags(projectPath, "testfolder/missing.jpg")
		require.NoError(t, err)
		assert.Empty(t, tags)
	})
}

func TestAddTags(t *testing.T) {
	t.Run("adds new tags to existing", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteTags(projectPath, "testfolder", "photo.jpg", []string{"existing"})
		require.NoError(t, err)

		tags, err := AddTags(projectPath, "testfolder/photo.jpg", []string{"new1", "new2"})
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"existing", "new1", "new2"}, tags)
	})

	t.Run("creates sidecar if missing", func(t *testing.T) {
		projectPath := setupTestDir(t)
		tags, err := AddTags(projectPath, "testfolder/photo.jpg", []string{"tag1"})
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1"}, tags)
	})

	t.Run("deduplicates tags", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteTags(projectPath, "testfolder", "photo.jpg", []string{"tag1"})
		require.NoError(t, err)

		tags, err := AddTags(projectPath, "testfolder/photo.jpg", []string{"tag1", "tag2"})
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1", "tag2"}, tags)
	})
}

func TestDeleteTags(t *testing.T) {
	t.Run("removes specified tags", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteTags(projectPath, "testfolder", "photo.jpg", []string{"tag1", "tag2", "tag3"})
		require.NoError(t, err)

		tags, err := DeleteTags(projectPath, "testfolder/photo.jpg", []string{"tag1", "tag3"})
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag2"}, tags)
	})

	t.Run("handles deleting non-existent tags", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteTags(projectPath, "testfolder", "photo.jpg", []string{"tag1"})
		require.NoError(t, err)

		tags, err := DeleteTags(projectPath, "testfolder/photo.jpg", []string{"nonexistent"})
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1"}, tags)
	})
}
