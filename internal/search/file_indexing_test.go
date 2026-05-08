package search

import (
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTempNotesDir(t *testing.T) (projectDir, notesDir string) {
	projectDir = t.TempDir()
	notesDir = filepath.Join(projectDir, "notes")
	err := os.MkdirAll(notesDir, 0755)
	require.NoError(t, err)
	return
}

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

func writeFilesRelative(t *testing.T, baseDir string, files map[string]string) {
	for relativePath, content := range files {
		fullPath := filepath.Join(baseDir, relativePath)
		require.NoError(t, os.MkdirAll(filepath.Dir(fullPath), 0755))
		require.NoError(t, os.WriteFile(fullPath, []byte(content), 0644))
	}
}

func collectPopulateJobs(t *testing.T, notesDir string) []DocumentJob {
	folders, err := os.ReadDir(notesDir)
	require.NoError(t, err)

	jobs := make(chan DocumentJob, util.MAX_JOBS)
	done := make(chan error, 1)

	go func() {
		defer close(jobs)
		done <- populateJobs(folders, notesDir, jobs)
	}()

	var receivedJobs []DocumentJob
	for job := range jobs {
		receivedJobs = append(receivedJobs, job)
	}
	require.NoError(t, <-done)

	return receivedJobs
}

func runWorkerJobs(projectPath string, jobsToRun []DocumentJob) []DocumentResult {
	jobs := make(chan DocumentJob, len(jobsToRun))
	results := make(chan DocumentResult, len(jobsToRun))
	var wg sync.WaitGroup

	wg.Add(1)
	go startWorker(projectPath, jobs, results, &wg)

	for _, job := range jobsToRun {
		jobs <- job
	}
	close(jobs)
	wg.Wait()
	close(results)

	var receivedResults []DocumentResult
	for result := range results {
		receivedResults = append(receivedResults, result)
	}
	return receivedResults
}

func createTempIndex(t *testing.T, projectDir string) bleve.Index {
	index, err := OpenOrCreateIndex(projectDir)
	require.NoError(t, err)
	return index
}

// filterFileJobs returns only jobs that have a file extension.
func filterFileJobs(jobs []DocumentJob) []DocumentJob {
	var fileJobs []DocumentJob
	for _, job := range jobs {
		if filepath.Ext(job.entryName) != "" {
			fileJobs = append(fileJobs, job)
		}
	}
	return fileJobs
}

func TestPopulateJobs(t *testing.T) {
	t.Run("should populate jobs for all files across multiple folders", func(t *testing.T) {
		_, notesDir := setupTempNotesDir(t)

		createFolderWithFiles(t, notesDir, "folder1", map[string]string{
			"note1.md":  "# Note 1",
			"image.png": "binary content",
		})
		createFolderWithFiles(t, notesDir, "folder2", map[string]string{
			"note2.md":  "# Note 2",
			"data.json": `{"key": "value"}`,
		})

		receivedJobs := collectPopulateJobs(t, notesDir)
		fileJobs := filterFileJobs(receivedJobs)

		assert.Len(t, fileJobs, 4)

		extensions := make(map[string]int)
		folderNames := make(map[string]int)
		for _, job := range fileJobs {
			extensions[filepath.Ext(job.entryName)]++
			folderNames[job.folder]++
		}

		assert.Equal(t, 2, extensions[".md"])
		assert.Equal(t, 1, extensions[".png"])
		assert.Equal(t, 1, extensions[".json"])

		assert.Equal(t, 2, folderNames["folder1"])
		assert.Equal(t, 2, folderNames["folder2"])
	})

	t.Run("should populate jobs for nested files with nested folder paths", func(t *testing.T) {
		_, notesDir := setupTempNotesDir(t)

		writeFilesRelative(t, notesDir, map[string]string{
			filepath.Join("folder1", "top.md"):              "# Top level",
			filepath.Join("folder1", "nested", "deep.md"):   "# Deep markdown",
			filepath.Join("folder1", "nested", "asset.png"): "binary content",
		})

		receivedJobs := collectPopulateJobs(t, notesDir)
		fileJobs := filterFileJobs(receivedJobs)

		assert.Len(t, fileJobs, 3)

		jobsByFileID := make(map[string]DocumentJob)
		for _, job := range fileJobs {
			jobsByFileID[job.entryId] = job
		}

		require.Contains(t, jobsByFileID, filepath.Join("folder1", "top.md"))
		require.Contains(t, jobsByFileID, filepath.Join("folder1", "nested", "deep.md"))
		require.Contains(t, jobsByFileID, filepath.Join("folder1", "nested", "asset.png"))

		assert.Equal(t, "folder1", jobsByFileID[filepath.Join("folder1", "top.md")].folder)
		assert.Equal(t, filepath.Join("folder1", "nested"), jobsByFileID[filepath.Join("folder1", "nested", "deep.md")].folder)
		assert.Equal(t, filepath.Join("folder1", "nested"), jobsByFileID[filepath.Join("folder1", "nested", "asset.png")].folder)
	})

	t.Run("should emit no jobs for empty folders", func(t *testing.T) {
		_, notesDir := setupTempNotesDir(t)

		emptyFolderPath := filepath.Join(notesDir, "empty-folder")
		require.NoError(t, os.MkdirAll(emptyFolderPath, 0755))

		receivedJobs := collectPopulateJobs(t, notesDir)
		assert.Empty(t, receivedJobs)
	})

	t.Run("should skip hidden files and hidden folders", func(t *testing.T) {
		_, notesDir := setupTempNotesDir(t)

		writeFilesRelative(t, notesDir, map[string]string{
			filepath.Join("folder1", "visible.md"):             "# Visible",
			filepath.Join("folder1", ".hidden-file.md"):        "# Hidden file",
			filepath.Join("folder1", ".visible.json"):          `{"codeResults":{"version":1,"codeBlocks":[]}}`,
			filepath.Join("folder1", ".hidden-dir", "deep.md"): "# In hidden dir",
			filepath.Join(".hidden-top", "note.md"):            "# In hidden top-level folder",
		})

		receivedJobs := collectPopulateJobs(t, notesDir)
		fileJobs := filterFileJobs(receivedJobs)

		assert.Len(t, fileJobs, 1)
		assert.Equal(t, "visible.md", fileJobs[0].entryName)
	})
}

func TestStartWorker(t *testing.T) {
	t.Run("should process markdown and attachment files correctly", func(t *testing.T) {
		projectDir, notesDir := setupTempNotesDir(t)

		folderPath := createFolderWithFiles(t, notesDir, "test-folder", map[string]string{
			"note1.md":  "# Note 1",
			"note2.md":  "# Note 2",
			"image.png": "binary content",
		})

		receivedResults := runWorkerJobs(projectDir, []DocumentJob{
			{entryPath: filepath.Join(folderPath, "note1.md"), folder: "test-folder", entryName: "note1.md"},
			{entryPath: filepath.Join(folderPath, "note2.md"), folder: "test-folder", entryName: "note2.md"},
			{entryPath: filepath.Join(folderPath, "image.png"), folder: "test-folder", entryName: "image.png"},
		})

		assert.Len(t, receivedResults, 3)

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
		receivedResults := runWorkerJobs(t.TempDir(), []DocumentJob{{entryPath: "/non/existent/path/file.md", folder: "test-folder", entryName: "file.md"}})

		assert.Len(t, receivedResults, 1)
		assert.True(t, receivedResults[0].isError)
		assert.Nil(t, receivedResults[0].document)
	})
}

func TestIndexAllFiles(t *testing.T) {
	t.Run("should return error for non-existent notes directory", func(t *testing.T) {
		tmpDir := t.TempDir()
		index := createTempIndex(t, tmpDir)
		defer index.Close()

		err := IndexAllFiles("/non/existent/path", index)
		assert.Error(t, err)
	})

	t.Run("should index all file types successfully", func(t *testing.T) {
		projectDir, notesDir := setupTempNotesDir(t)

		index := createTempIndex(t, projectDir)
		defer index.Close()

		createFolderWithFiles(t, notesDir, "folder1", map[string]string{
			"note1.md":  "# Note 1",
			"image.png": "binary content",
		})
		createFolderWithFiles(t, notesDir, "folder2", map[string]string{
			"note2.md": "# Note 2",
			"doc.pdf":  "pdf content",
		})

		err := IndexAllFiles(projectDir, index)
		assert.NoError(t, err)
	})

	t.Run("should index nested markdown and attachment files", func(t *testing.T) {
		projectDir, notesDir := setupTempNotesDir(t)

		index := createTempIndex(t, projectDir)
		defer index.Close()

		writeFilesRelative(t, notesDir, map[string]string{
			filepath.Join("folder1", "nested", "deep-note.md"): "# Deep note",
			filepath.Join("folder1", "nested", "asset.png"):    "binary content",
		})

		err := IndexAllFiles(projectDir, index)
		require.NoError(t, err)

		deepMarkdownID := filepath.Join("folder1", "nested", "deep-note.md")
		deepAttachmentID := filepath.Join("folder1", "nested", "asset.png")

		deepMarkdownDoc, err := index.Document(deepMarkdownID)
		require.NoError(t, err)
		require.NotNil(t, deepMarkdownDoc)

		deepAttachmentDoc, err := index.Document(deepAttachmentID)
		require.NoError(t, err)
		require.NotNil(t, deepAttachmentDoc)
	})
}

func TestIndexDiscoveredFilesSkipsHiddenSidecars(t *testing.T) {
	projectDir, notesDir := setupTempNotesDir(t)
	index := createTempIndex(t, projectDir)
	defer index.Close()

	writeFilesRelative(t, notesDir, map[string]string{
		filepath.Join("folder", "note.md"):    "# Visible",
		filepath.Join("folder", ".note.json"): `{"codeResults":{"version":1,"codeBlocks":[{"codeBlockId":"block","resultHtml":"secret"}]}}`,
	})

	require.NoError(t, IndexDiscoveredFiles(projectDir, []string{
		filepath.Join(notesDir, "folder", "note.md"),
		filepath.Join(notesDir, "folder", ".note.json"),
	}, index, 1))

	noteDoc, err := index.Document(filepath.Join("folder", "note.md"))
	require.NoError(t, err)
	assert.NotNil(t, noteDoc)

	sidecarDoc, err := index.Document(filepath.Join("folder", ".note.json"))
	require.NoError(t, err)
	assert.Nil(t, sidecarDoc)
}
