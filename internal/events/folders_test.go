package events

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/ingest"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/notes/sidecar"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/fsnotify/fsnotify"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// createTestIndex creates a temporary Bleve index for testing
func createTestIndex(t *testing.T) bleve.Index {
	tmpDir := t.TempDir()
	index, err := search.OpenOrCreateIndex(tmpDir)
	require.NoError(t, err)
	t.Cleanup(func() {
		index.Close()
	})
	return index
}

// createTestParams creates an EventParams struct with a test index and a running
// import coordinator, matching the production wiring in main.go
func createTestParams(t *testing.T) EventParams {
	index := createTestIndex(t)
	projectPath := t.TempDir()
	holder := search.NewIndexHolder(index)

	watcher, err := fsnotify.NewWatcher()
	require.NoError(t, err)
	t.Cleanup(func() { watcher.Close() })

	registry := notes.NewDirectoryWatchRegistry()
	coordinator := ingest.NewBulkImportCoordinator(projectPath, holder, watcher, registry)
	t.Cleanup(coordinator.Shutdown)

	return EventParams{
		App:               nil, // Not needed for these tests
		ProjectPath:       projectPath,
		Index:             holder,
		ImportCoordinator: coordinator,
	}
}

// rawIndex returns the underlying bleve index from a test EventParams for
// assertions. Tests are single-goroutine so holding the read lock is not
// strictly required, but this mirrors how production code accesses the index.
func rawIndex(params EventParams) bleve.Index {
	idx := params.Index.RLock()
	params.Index.RUnlock()
	return idx
}

func createMarkdownNoteInFolder(t *testing.T, projectPath, folderPath, fileName, content string) {
	fullFolderPath := filepath.Join(projectPath, "notes", folderPath)
	require.NoError(t, os.MkdirAll(fullFolderPath, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(fullFolderPath, fileName), []byte(content), 0644))
}

func TestHandleFolderCreateEvent(t *testing.T) {
	t.Run("should index files from created folders in the background", func(t *testing.T) {
		params := createTestParams(t)
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder1", "one.md", "# one")
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder2", "two.md", "# two")

		handleFolderCreateEvent(params, []util.FolderCreateEventData{
			{FolderPath: "folder1"},
			{FolderPath: "folder2"},
		})

		require.Eventually(t, func() bool {
			doc, err := rawIndex(params).Document(filepath.Join("folder1", "one.md"))
			return err == nil && doc != nil
		}, 5*time.Second, 20*time.Millisecond)
		require.Eventually(t, func() bool {
			doc, err := rawIndex(params).Document(filepath.Join("folder2", "two.md"))
			return err == nil && doc != nil
		}, 5*time.Second, 20*time.Millisecond)
	})

	t.Run("should skip invalid entries", func(t *testing.T) {
		params := createTestParams(t)
		createMarkdownNoteInFolder(t, params.ProjectPath, "f.1", "note.md", "# note")

		handleFolderCreateEvent(params, []util.FolderCreateEventData{
			{FolderPath: "f.1"},
			{},
			{FolderPath: ""},
		})

		require.Eventually(t, func() bool {
			doc, err := rawIndex(params).Document(filepath.Join("f.1", "note.md"))
			return err == nil && doc != nil
		}, 5*time.Second, 20*time.Millisecond)
	})
}

func TestDeleteFolderDocumentsFromIndex(t *testing.T) {
	t.Run("deletes the folder and its descendants but not siblings with a shared prefix", func(t *testing.T) {
		params := createTestParams(t)
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder", "one.md", "# one")
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder/child", "two.md", "# two")
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder-other", "three.md", "# three")
		require.NoError(t, search.IndexAllFiles(params.ProjectPath, rawIndex(params)))

		idx := rawIndex(params)
		batch := idx.NewBatch()
		require.NoError(t, deleteFolderDocumentsFromIndex(idx, batch, "folder"))
		require.NoError(t, idx.Batch(batch))

		for _, gone := range []string{filepath.Join("folder", "one.md"), filepath.Join("folder", "child", "two.md")} {
			doc, err := idx.Document(gone)
			assert.NoError(t, err)
			assert.Nil(t, doc, gone)
		}
		doc, err := idx.Document(filepath.Join("folder-other", "three.md"))
		assert.NoError(t, err)
		assert.NotNil(t, doc)
	})

	t.Run("matches mixed case folder paths", func(t *testing.T) {
		params := createTestParams(t)
		folderPath := filepath.Join(params.ProjectPath, "notes", "Foo", "Bar")
		require.NoError(t, os.MkdirAll(folderPath, 0755))
		require.NoError(t, os.WriteFile(filepath.Join(folderPath, "image.png"), []byte("image"), 0644))
		require.NoError(t, search.IndexAllFiles(params.ProjectPath, rawIndex(params)))

		docID := filepath.Join("Foo", "Bar", "image.png")
		doc, err := rawIndex(params).Document(docID)
		require.NoError(t, err)
		require.NotNil(t, doc)

		deleteFoldersFromIndex(params, []util.FolderDeleteEventData{
			{FolderPath: filepath.Join("Foo", "Bar")},
		})

		doc, err = rawIndex(params).Document(docID)
		require.NoError(t, err)
		assert.Nil(t, doc)
	})

	t.Run("flushes full batches and leaves the remainder for the caller", func(t *testing.T) {
		params := createTestParams(t)
		noteCount := search.DefaultBatchSize + 10
		for i := range noteCount {
			createMarkdownNoteInFolder(t, params.ProjectPath, "big", fmt.Sprintf("note-%d.md", i), "# note")
		}
		require.NoError(t, search.IndexAllFiles(params.ProjectPath, rawIndex(params)))
		idx := rawIndex(params)
		countBefore, err := idx.DocCount()
		require.NoError(t, err)

		batch := idx.NewBatch()
		require.NoError(t, deleteFolderDocumentsFromIndex(idx, batch, "big"))

		assert.EqualValues(t, 10, batch.Size(), "a full batch should be flushed and reset")
		countAfterFlush, err := idx.DocCount()
		require.NoError(t, err)
		assert.Equal(t, countBefore-uint64(search.DefaultBatchSize), countAfterFlush)

		require.NoError(t, idx.Batch(batch))
		countAfter, err := idx.DocCount()
		require.NoError(t, err)
		assert.Zero(t, countAfter)
	})

	t.Run("returns an error when the search fails", func(t *testing.T) {
		idx, err := search.OpenOrCreateIndex(t.TempDir())
		require.NoError(t, err)
		batch := idx.NewBatch()
		require.NoError(t, idx.Close())

		assert.Error(t, deleteFolderDocumentsFromIndex(idx, batch, "folder"))
	})
}

func TestDeleteFoldersFromIndex(t *testing.T) {
	t.Run("should skip invalid entries and keep other folders intact", func(t *testing.T) {
		params := createTestParams(t)
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder1", "one.md", "# one")
		createMarkdownNoteInFolder(t, params.ProjectPath, "folder2", "two.md", "# two")
		require.NoError(t, search.IndexAllFiles(params.ProjectPath, rawIndex(params)))

		deleteData := []util.FolderDeleteEventData{
			{FolderPath: "folder1"},
			{},
			{FolderPath: ""},
			{FolderPath: "non-existent"},
		}
		deleteFoldersFromIndex(params, deleteData)

		doc1, err := rawIndex(params).Document(filepath.Join("folder1", "one.md"))
		assert.NoError(t, err)
		assert.Nil(t, doc1)

		doc2, err := rawIndex(params).Document(filepath.Join("folder2", "two.md"))
		assert.NoError(t, err)
		assert.NotNil(t, doc2)
	})
}

func TestUpdateFolderNameInMarkdown(t *testing.T) {
	tests := []struct {
		name          string
		markdown      string
		oldFolderPath string
		newFolderPath string
		expectedMD    string
		expectedFlag  bool
	}{
		{
			name:          "replaces folder name in image URL",
			markdown:      "![alt text](/notes/old-folder/image.png)",
			oldFolderPath: "old-folder",
			newFolderPath: "new-folder",
			expectedMD:    "![alt text](/notes/new-folder/image.png)",
			expectedFlag:  true,
		},
		{
			name:          "replaces folder name in link URL",
			markdown:      "[link text](/notes/old-folder/note.md)",
			oldFolderPath: "old-folder",
			newFolderPath: "new-folder",
			expectedMD:    "[link text](/notes/new-folder/note.md)",
			expectedFlag:  true,
		},
		{
			name:          "replaces multiple occurrences",
			markdown:      "![img1](/notes/folder/a.png)\n[link](/notes/folder/b.md)\n![img2](/notes/folder/c.jpg)",
			oldFolderPath: "folder",
			newFolderPath: "renamed",
			expectedMD:    "![img1](/notes/renamed/a.png)\n[link](/notes/renamed/b.md)\n![img2](/notes/renamed/c.jpg)",
			expectedFlag:  true,
		},
		{
			name:          "returns false when no folder matches",
			markdown:      "![img](/notes/other-folder/image.png)",
			oldFolderPath: "old-folder",
			newFolderPath: "new-folder",
			expectedMD:    "![img](/notes/other-folder/image.png)",
			expectedFlag:  false,
		},
		{
			name:          "does not match partial folder names",
			markdown:      "![img](/notes/my-old-folder-extra/image.png)",
			oldFolderPath: "old-folder",
			newFolderPath: "new-folder",
			expectedMD:    "![img](/notes/my-old-folder-extra/image.png)",
			expectedFlag:  false,
		},
		{
			name:          "does not match a folder name that is a suffix of another segment",
			markdown:      "[y](/notes/my-old/n.md)\n![x](/notes/data/a.png)",
			oldFolderPath: "old",
			newFolderPath: "new",
			expectedMD:    "[y](/notes/my-old/n.md)\n![x](/notes/data/a.png)",
			expectedFlag:  false,
		},
		{
			name:          "does not rewrite a nested folder with the same name",
			markdown:      "![x](/notes/data/a/img.png)",
			oldFolderPath: "a",
			newFolderPath: "zz",
			expectedMD:    "![x](/notes/data/a/img.png)",
			expectedFlag:  false,
		},
		{
			name:          "leaves external URLs untouched",
			markdown:      "[ext](https://ex.com/a/b)\n![ext](https://ex.com/a/c.png)",
			oldFolderPath: "a",
			newFolderPath: "zz",
			expectedMD:    "[ext](https://ex.com/a/b)\n![ext](https://ex.com/a/c.png)",
			expectedFlag:  false,
		},
		{
			name:          "renames a folder called notes without touching the route prefix",
			markdown:      "![x](/notes/notes/a.png)\n[n](/notes/notes/b.md)",
			oldFolderPath: "notes",
			newFolderPath: "old-notes",
			expectedMD:    "![x](/notes/old-notes/a.png)\n[n](/notes/old-notes/b.md)",
			expectedFlag:  true,
		},
		{
			name:          "matches percent-encoded folder names",
			markdown:      "[n](/notes/My%20Notes/a%20b.md)",
			oldFolderPath: "My Notes",
			newFolderPath: "Your Notes (2)",
			expectedMD:    "[n](/notes/Your%20Notes%20%282%29/a%20b.md)",
			expectedFlag:  true,
		},
		{
			name:          "renames nested folder paths",
			markdown:      "[n](/notes/a/b/c.md)\n[m](/notes/a/c.md)",
			oldFolderPath: "a/b",
			newFolderPath: "a/x",
			expectedMD:    "[n](/notes/a/x/c.md)\n[m](/notes/a/c.md)",
			expectedFlag:  true,
		},
		{
			name:          "preserves query strings and fragments",
			markdown:      "[n](/notes/old/n.md#heading)\n![i](/notes/old/i.png?v=1)",
			oldFolderPath: "old",
			newFolderPath: "new",
			expectedMD:    "[n](/notes/new/n.md#heading)\n![i](/notes/new/i.png?v=1)",
			expectedFlag:  true,
		},
		{
			name:          "rewrites images with empty alt text",
			markdown:      "![](/notes/old/i.png)",
			oldFolderPath: "old",
			newFolderPath: "new",
			expectedMD:    "![](/notes/new/i.png)",
			expectedFlag:  true,
		},
		{
			name:          "handles empty markdown",
			markdown:      "",
			oldFolderPath: "old-folder",
			newFolderPath: "new-folder",
			expectedMD:    "",
			expectedFlag:  false,
		},
		{
			name:          "handles markdown with no links or images",
			markdown:      "# Heading\n\nSome plain text content.",
			oldFolderPath: "old-folder",
			newFolderPath: "new-folder",
			expectedMD:    "# Heading\n\nSome plain text content.",
			expectedFlag:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, updated := updateFolderNameInMarkdown(tt.markdown, tt.oldFolderPath, tt.newFolderPath)
			assert.Equal(t, tt.expectedMD, result)
			assert.Equal(t, tt.expectedFlag, updated)
		})
	}
}

func TestFolderRenamePreservesIndexedTags(t *testing.T) {
	checkRename := func(t *testing.T, oldFolder, newFolder string) {
		params := createTestParams(t)
		idx := rawIndex(params)
		for _, subfolder := range []string{"", "child/deep"} {
			folder := filepath.Join(oldFolder, subfolder)
			createMarkdownNoteInFolder(t, params.ProjectPath, folder, "note.md", "---\ntags: [markdown-tag]\n---\n# Note")
			require.NoError(t, os.WriteFile(filepath.Join(params.ProjectPath, "notes", folder, "photo.png"), []byte("image"), 0644))
			require.NoError(t, sidecar.WriteTags(params.ProjectPath, folder, "photo.png", []string{"sidecar-tag"}))
		}
		require.NoError(t, search.IndexAllFiles(params.ProjectPath, idx))
		tags, err := search.GetTags(idx)
		require.NoError(t, err)
		require.ElementsMatch(t, []string{"markdown-tag", "sidecar-tag"}, tags)

		require.NoError(t, os.Rename(filepath.Join(params.ProjectPath, "notes", oldFolder), filepath.Join(params.ProjectPath, "notes", newFolder)))
		renameFoldersInIndex(params, []util.FolderRenameEventData{{OldFolderPath: oldFolder, NewFolderPath: newFolder}})

		for _, subfolder := range []string{"", "child/deep"} {
			for _, file := range []string{"note.md", "photo.png"} {
				oldDoc, err := idx.Document(filepath.Join(oldFolder, subfolder, file))
				require.NoError(t, err)
				assert.Nil(t, oldDoc)
				request := bleve.NewSearchRequest(bleve.NewDocIDQuery([]string{filepath.Join(newFolder, subfolder, file)}))
				request.Fields = []string{search.FieldTags}
				result, err := idx.Search(request)
				require.NoError(t, err)
				if assert.Len(t, result.Hits, 1) {
					expectedTag := "markdown-tag"
					if file == "photo.png" {
						expectedTag = "sidecar-tag"
					}
					assert.Equal(t, expectedTag, result.Hits[0].Fields[search.FieldTags])
				}
			}
			tags, err := sidecar.ReadTags(params.ProjectPath, filepath.Join(newFolder, subfolder), "photo.png")
			require.NoError(t, err)
			assert.Equal(t, []string{"sidecar-tag"}, tags)
		}
	}
	t.Run("top level folder and descendants", func(t *testing.T) { checkRename(t, "old", "renamed") })
	t.Run("nested folder and descendants", func(t *testing.T) { checkRename(t, "parent/old", "parent/renamed") })
}
