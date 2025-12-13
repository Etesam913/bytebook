package search

import (
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// helper to create temp project dir with notes structure
func setupTempNotesDir(t *testing.T) (projectDir, notesDir string) {
	projectDir = t.TempDir()
	notesDir = filepath.Join(projectDir, "notes")
	err := os.MkdirAll(notesDir, 0755)
	require.NoError(t, err)
	return
}

// helper to create a folder with markdown files
func createFolderWithFiles(t *testing.T, notesDir, folderName string, files map[string]string) string {
	folderPath := filepath.Join(notesDir, folderName)
	err := os.MkdirAll(folderPath, 0755)
	require.NoError(t, err)

	for fileName, content := range files {
		filePath := filepath.Join(folderPath, fileName)
		err := os.WriteFile(filePath, []byte(content), 0644)
		require.NoError(t, err)
	}
	return folderPath
}

func TestPopulateJobs(t *testing.T) {
	t.Run("should populate jobs for all files across multiple folders", func(t *testing.T) {
		_, notesDir := setupTempNotesDir(t)

		// Create multiple folders with mixed file types
		createFolderWithFiles(t, notesDir, "folder1", map[string]string{
			"note1.md":  "# Note 1",
			"image.png": "binary content",
		})
		createFolderWithFiles(t, notesDir, "folder2", map[string]string{
			"note2.md":  "# Note 2",
			"data.json": `{"key": "value"}`,
		})

		folders, err := os.ReadDir(notesDir)
		require.NoError(t, err)

		jobs := make(chan DocumentJob, MAX_JOBS)
		var wg sync.WaitGroup

		wg.Add(1)
		go func() {
			defer wg.Done()
			defer close(jobs)
			err := populateJobs(folders, notesDir, jobs)
			assert.NoError(t, err)
		}()

		var receivedJobs []DocumentJob
		for job := range jobs {
			receivedJobs = append(receivedJobs, job)
		}
		wg.Wait()

		// Should have 4 jobs total
		assert.Len(t, receivedJobs, 4)

		// Verify fileExtension is set correctly and collect counts
		extensions := make(map[string]int)
		folderNames := make(map[string]int)
		for _, job := range receivedJobs {
			assert.Equal(t, filepath.Ext(job.fileName), job.fileExtension)
			extensions[job.fileExtension]++
			folderNames[job.folder]++
		}

		// Verify file types
		assert.Equal(t, 2, extensions[".md"])
		assert.Equal(t, 1, extensions[".png"])
		assert.Equal(t, 1, extensions[".json"])

		// Verify folders
		assert.Equal(t, 2, folderNames["folder1"])
		assert.Equal(t, 2, folderNames["folder2"])
	})

	t.Run("should handle empty folders", func(t *testing.T) {
		_, notesDir := setupTempNotesDir(t)

		emptyFolderPath := filepath.Join(notesDir, "empty-folder")
		err := os.MkdirAll(emptyFolderPath, 0755)
		require.NoError(t, err)

		folders, err := os.ReadDir(notesDir)
		require.NoError(t, err)

		jobs := make(chan DocumentJob, MAX_JOBS)
		var wg sync.WaitGroup

		wg.Add(1)
		go func() {
			defer wg.Done()
			defer close(jobs)
			err := populateJobs(folders, notesDir, jobs)
			assert.NoError(t, err)
		}()

		var receivedJobs []DocumentJob
		for job := range jobs {
			receivedJobs = append(receivedJobs, job)
		}
		wg.Wait()

		assert.Empty(t, receivedJobs)
	})
}

func TestStartWorker(t *testing.T) {
	t.Run("should process markdown and attachment files correctly", func(t *testing.T) {
		_, notesDir := setupTempNotesDir(t)

		folderPath := createFolderWithFiles(t, notesDir, "test-folder", map[string]string{
			"note1.md":  "# Note 1",
			"note2.md":  "# Note 2",
			"image.png": "binary content",
		})

		jobs := make(chan DocumentJob, 3)
		results := make(chan DocumentResult, 3)
		var wg sync.WaitGroup

		wg.Add(1)
		go startWorker(jobs, results, &wg)

		// Send jobs for markdown and attachment files
		jobs <- DocumentJob{
			filePath:      filepath.Join(folderPath, "note1.md"),
			folder:        "test-folder",
			fileName:      "note1.md",
			fileExtension: ".md",
		}
		jobs <- DocumentJob{
			filePath:      filepath.Join(folderPath, "note2.md"),
			folder:        "test-folder",
			fileName:      "note2.md",
			fileExtension: ".md",
		}
		jobs <- DocumentJob{
			filePath:      filepath.Join(folderPath, "image.png"),
			folder:        "test-folder",
			fileName:      "image.png",
			fileExtension: ".png",
		}
		close(jobs)

		wg.Wait()
		close(results)

		var receivedResults []DocumentResult
		for result := range results {
			receivedResults = append(receivedResults, result)
		}

		// Should have results for all files (markdown and attachments)
		assert.Len(t, receivedResults, 3)

		// Verify markdown documents
		markdownCount := 0
		attachmentCount := 0
		for _, result := range receivedResults {
			assert.False(t, result.isError)
			if doc, ok := result.document.(MarkdownNoteBleveDocument); ok {
				markdownCount++
				assert.Equal(t, "test-folder", doc.Folder)
			} else if doc, ok := result.document.(AttachmentBleveDocument); ok {
				attachmentCount++
				assert.Equal(t, "test-folder", doc.Folder)
				assert.Equal(t, "image.png", doc.FileName)
				assert.Equal(t, ".png", doc.FileExtension)
			}
		}

		assert.Equal(t, 2, markdownCount)
		assert.Equal(t, 1, attachmentCount)
	})

	t.Run("should return error result for non-existent file", func(t *testing.T) {
		jobs := make(chan DocumentJob, 1)
		results := make(chan DocumentResult, 1)
		var wg sync.WaitGroup

		wg.Add(1)
		go startWorker(jobs, results, &wg)

		jobs <- DocumentJob{
			filePath:      "/non/existent/path/file.md",
			folder:        "test-folder",
			fileName:      "file.md",
			fileExtension: ".md",
		}
		close(jobs)

		wg.Wait()
		close(results)

		var receivedResults []DocumentResult
		for result := range results {
			receivedResults = append(receivedResults, result)
		}

		assert.Len(t, receivedResults, 1)
		assert.True(t, receivedResults[0].isError)
		assert.Nil(t, receivedResults[0].document)
	})
}

func TestIndexAllFiles(t *testing.T) {
	t.Run("should return error for non-existent notes directory", func(t *testing.T) {
		// Create a temporary index for this test
		tmpDir := t.TempDir()
		var index bleve.Index
		index, err := OpenOrCreateIndex(tmpDir)
		require.NoError(t, err)
		defer index.Close()

		err = IndexAllFiles("/non/existent/path", index)
		assert.Error(t, err)
	})

	t.Run("should index all file types successfully", func(t *testing.T) {
		projectDir, notesDir := setupTempNotesDir(t)

		// Create an index for this test
		var index bleve.Index
		index, err := OpenOrCreateIndex(projectDir)
		require.NoError(t, err)
		defer index.Close()

		createFolderWithFiles(t, notesDir, "folder1", map[string]string{
			"note1.md":  "# Note 1",
			"image.png": "binary content",
		})
		createFolderWithFiles(t, notesDir, "folder2", map[string]string{
			"note2.md": "# Note 2",
			"doc.pdf":  "pdf content",
		})

		err = IndexAllFiles(projectDir, index)
		assert.NoError(t, err)
	})
}
