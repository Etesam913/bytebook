package notes

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetAttachmentSidecarPath(t *testing.T) {
	tests := []struct {
		name        string
		projectPath string
		folder      string
		fileName    string
		expected    string
	}{
		{
			name:        "simple file",
			projectPath: "/project",
			folder:      "folder1",
			fileName:    "photo.jpg",
			expected:    filepath.Join("/project", "notes", "folder1", ".photo.json"),
		},
		{
			name:        "file with multiple dots",
			projectPath: "/project",
			folder:      "docs",
			fileName:    "file.name.png",
			expected:    filepath.Join("/project", "notes", "docs", ".file.name.json"),
		},
		{
			name:        "empty folder",
			projectPath: "/project",
			folder:      "",
			fileName:    "image.gif",
			expected:    filepath.Join("/project", "notes", ".image.json"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GetAttachmentSidecarPath(tt.projectPath, tt.folder, tt.fileName)
			assert.Equal(t, tt.expected, result)
		})
	}
}

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

func setupTestDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	notesDir := filepath.Join(dir, "notes", "testfolder")
	require.NoError(t, os.MkdirAll(notesDir, 0755))
	return dir
}

func TestReadAttachmentTags(t *testing.T) {
	t.Run("returns empty slice when sidecar does not exist", func(t *testing.T) {
		projectPath := setupTestDir(t)
		tags, err := ReadAttachmentTags(projectPath, "testfolder", "missing.jpg")
		require.NoError(t, err)
		assert.Empty(t, tags)
	})

	t.Run("reads existing sidecar", func(t *testing.T) {
		projectPath := setupTestDir(t)
		sidecarPath := filepath.Join(projectPath, "notes", "testfolder", ".photo.json")
		require.NoError(t, os.WriteFile(sidecarPath, []byte(`{"tags":["tag1","tag2"]}`), 0644))

		tags, err := ReadAttachmentTags(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1", "tag2"}, tags)
	})

	t.Run("returns error for invalid json", func(t *testing.T) {
		projectPath := setupTestDir(t)
		sidecarPath := filepath.Join(projectPath, "notes", "testfolder", ".photo.json")
		require.NoError(t, os.WriteFile(sidecarPath, []byte(`invalid json`), 0644))

		_, err := ReadAttachmentTags(projectPath, "testfolder", "photo.jpg")
		assert.Error(t, err)
	})
}

func TestWriteAttachmentTags(t *testing.T) {
	t.Run("creates sidecar with tags", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteAttachmentTags(projectPath, "testfolder", "photo.jpg", []string{"tag1", "tag2"})
		require.NoError(t, err)

		tags, err := ReadAttachmentTags(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1", "tag2"}, tags)
	})

	t.Run("sanitizes tags before writing", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteAttachmentTags(projectPath, "testfolder", "photo.jpg", []string{"  tag1  ", "", "tag1"})
		require.NoError(t, err)

		tags, err := ReadAttachmentTags(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1"}, tags)
	})
}

func TestEnsureAttachmentSidecar(t *testing.T) {
	t.Run("creates sidecar if missing", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := EnsureAttachmentSidecar(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)

		sidecarPath := GetAttachmentSidecarPath(projectPath, "testfolder", "photo.jpg")
		_, err = os.Stat(sidecarPath)
		assert.NoError(t, err)
	})

	t.Run("does not overwrite existing sidecar", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteAttachmentTags(projectPath, "testfolder", "photo.jpg", []string{"existing"})
		require.NoError(t, err)

		err = EnsureAttachmentSidecar(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)

		tags, err := ReadAttachmentTags(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"existing"}, tags)
	})
}

func TestDeleteAttachmentSidecar(t *testing.T) {
	t.Run("deletes existing sidecar", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteAttachmentTags(projectPath, "testfolder", "photo.jpg", []string{"tag1"})
		require.NoError(t, err)

		err = DeleteAttachmentSidecar(projectPath, "testfolder", "photo.jpg")
		require.NoError(t, err)

		sidecarPath := GetAttachmentSidecarPath(projectPath, "testfolder", "photo.jpg")
		_, err = os.Stat(sidecarPath)
		assert.True(t, os.IsNotExist(err))
	})

	t.Run("returns nil if sidecar does not exist", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := DeleteAttachmentSidecar(projectPath, "testfolder", "missing.jpg")
		assert.NoError(t, err)
	})
}

func TestRenameAttachmentSidecar(t *testing.T) {
	t.Run("moves tags to new sidecar", func(t *testing.T) {
		projectPath := setupTestDir(t)
		require.NoError(t, os.MkdirAll(filepath.Join(projectPath, "notes", "newfolder"), 0755))

		err := WriteAttachmentTags(projectPath, "testfolder", "old.jpg", []string{"tag1", "tag2"})
		require.NoError(t, err)

		err = RenameAttachmentSidecar(projectPath, "testfolder", "old.jpg", "newfolder", "new.jpg")
		require.NoError(t, err)

		// Old sidecar should be deleted
		oldPath := GetAttachmentSidecarPath(projectPath, "testfolder", "old.jpg")
		_, err = os.Stat(oldPath)
		assert.True(t, os.IsNotExist(err))

		// New sidecar should have the tags
		tags, err := ReadAttachmentTags(projectPath, "newfolder", "new.jpg")
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1", "tag2"}, tags)
	})

	t.Run("creates new sidecar if old does not exist", func(t *testing.T) {
		projectPath := setupTestDir(t)
		require.NoError(t, os.MkdirAll(filepath.Join(projectPath, "notes", "newfolder"), 0755))

		err := RenameAttachmentSidecar(projectPath, "testfolder", "missing.jpg", "newfolder", "new.jpg")
		require.NoError(t, err)

		tags, err := ReadAttachmentTags(projectPath, "newfolder", "new.jpg")
		require.NoError(t, err)
		assert.Empty(t, tags)
	})
}

func TestGetTagsFromAttachment(t *testing.T) {
	t.Run("returns tags and hasTags true", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteAttachmentTags(projectPath, "testfolder", "photo.jpg", []string{"tag1"})
		require.NoError(t, err)

		tags, hasTags, err := GetTagsFromAttachment(projectPath, "testfolder/photo.jpg")
		require.NoError(t, err)
		assert.True(t, hasTags)
		assert.ElementsMatch(t, []string{"tag1"}, tags)
	})

	t.Run("returns hasTags false when no tags", func(t *testing.T) {
		projectPath := setupTestDir(t)
		tags, hasTags, err := GetTagsFromAttachment(projectPath, "testfolder/missing.jpg")
		require.NoError(t, err)
		assert.False(t, hasTags)
		assert.Empty(t, tags)
	})
}

func TestAddTagsToAttachment(t *testing.T) {
	t.Run("adds new tags to existing", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteAttachmentTags(projectPath, "testfolder", "photo.jpg", []string{"existing"})
		require.NoError(t, err)

		tags, err := AddTagsToAttachment(projectPath, "testfolder/photo.jpg", []string{"new1", "new2"})
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"existing", "new1", "new2"}, tags)
	})

	t.Run("creates sidecar if missing", func(t *testing.T) {
		projectPath := setupTestDir(t)
		tags, err := AddTagsToAttachment(projectPath, "testfolder/photo.jpg", []string{"tag1"})
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1"}, tags)
	})

	t.Run("deduplicates tags", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteAttachmentTags(projectPath, "testfolder", "photo.jpg", []string{"tag1"})
		require.NoError(t, err)

		tags, err := AddTagsToAttachment(projectPath, "testfolder/photo.jpg", []string{"tag1", "tag2"})
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1", "tag2"}, tags)
	})
}

func TestDeleteTagsFromAttachment(t *testing.T) {
	t.Run("removes specified tags", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteAttachmentTags(projectPath, "testfolder", "photo.jpg", []string{"tag1", "tag2", "tag3"})
		require.NoError(t, err)

		tags, err := DeleteTagsFromAttachment(projectPath, "testfolder/photo.jpg", []string{"tag1", "tag3"})
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag2"}, tags)
	})

	t.Run("handles deleting non-existent tags", func(t *testing.T) {
		projectPath := setupTestDir(t)
		err := WriteAttachmentTags(projectPath, "testfolder", "photo.jpg", []string{"tag1"})
		require.NoError(t, err)

		tags, err := DeleteTagsFromAttachment(projectPath, "testfolder/photo.jpg", []string{"nonexistent"})
		require.NoError(t, err)
		assert.ElementsMatch(t, []string{"tag1"}, tags)
	})
}
