package search

import (
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/util"
)

type DocumentJob struct {
	entryPath string
	entryId   string
	folder    string
	entryName string
}

type DocumentResult struct {
	isError   bool
	entryPath string
	entryId   string
	document  any
}

// IndexFiles scans the "notes" directory within the given projectPath for folders containing Markdown files (.md).
// It dispatches indexing jobs for each Markdown file using a pool of worker goroutines.
// Results are collected and basic information about each indexed document is printed to stdout.
// Returns an error if any directory or file access fails.
func IndexAllFiles(projectPath string, bleveIndex bleve.Index) error {
	notesPath := filepath.Join(projectPath, "notes")
	folders, err := os.ReadDir(notesPath)

	jobs := make(chan DocumentJob, util.MAX_JOBS)
	var workerWaitGroup sync.WaitGroup

	results := make(chan DocumentResult, util.MAX_JOBS)

	if err != nil {
		return err
	}

	for w := 0; w < util.WORKER_COUNT; w++ {
		workerWaitGroup.Add(1)
		go startWorker(projectPath, jobs, results, &workerWaitGroup)
	}

	go func() {
		defer close(jobs)
		if err := populateJobs(folders, notesPath, jobs); err != nil {
			log.Printf("Error populating jobs (some files may not be indexed): %v", err)
		}
	}()

	go func() {
		workerWaitGroup.Wait()
		close(results)
	}()

	bleveBatch, err := addResultsToIndex(bleveIndex, bleveIndex.NewBatch(), results)
	if err != nil {
		log.Printf("Error when adding results to index: %v", err)
		return err
	}

	// Flush any remaining documents in the batch
	if err := bleveIndex.Batch(bleveBatch); err != nil {
		log.Printf("Error flushing final batch: %v", err)
		return err
	}

	return nil
}

// IndexDiscoveredFiles indexes already-discovered files using bounded worker concurrency.
func IndexDiscoveredFiles(projectPath string, filePaths []string, bleveIndex bleve.Index, workerCount int) error {
	if len(filePaths) == 0 {
		return nil
	}
	if workerCount <= 0 {
		workerCount = 1
	}

	jobs := make(chan DocumentJob, util.MAX_JOBS)
	results := make(chan DocumentResult, util.MAX_JOBS)
	var workerWaitGroup sync.WaitGroup

	for w := 0; w < workerCount; w++ {
		workerWaitGroup.Add(1)
		go startWorker(projectPath, jobs, results, &workerWaitGroup)
	}

	go func() {
		defer close(jobs)
		for _, filePath := range filePaths {
			job, err := buildDocumentJob(projectPath, filePath)
			if err != nil {
				log.Printf("Error building indexing job for %s: %v", filePath, err)
				continue
			}
			jobs <- job
		}
	}()

	go func() {
		workerWaitGroup.Wait()
		close(results)
	}()

	bleveBatch, err := addResultsToIndex(bleveIndex, bleveIndex.NewBatch(), results)
	if err != nil {
		log.Printf("Error when adding discovered results to index: %v", err)
		return err
	}

	if err := bleveIndex.Batch(bleveBatch); err != nil {
		log.Printf("Error flushing final batch: %v", err)
		return err
	}

	return nil
}

func addResultsToIndex(bleveIndex bleve.Index, bleveBatch *bleve.Batch, results chan DocumentResult) (*bleve.Batch, error) {
	indexCount := 0
	for docResult := range results {
		if docResult.isError {
			continue
		}
		document, err := bleveIndex.Document(docResult.entryId)
		if err != nil {
			log.Printf("Error when trying to fetch document in adding results: %v", err)
			continue
		}

		// The entry is already indexed, so we can skip here
		if document != nil {
			continue
		}

		switch doc := docResult.document.(type) {
		case MarkdownNoteBleveDocument:
			bleveBatch.Index(docResult.entryId, doc)
		case AttachmentBleveDocument:
			bleveBatch.Index(docResult.entryId, doc)
		case FolderBleveDocument:
			bleveBatch.Index(docResult.entryId, doc)
		}

		indexCount += 1

		if bleveBatch.Size() >= DefaultBatchSize {
			if err := bleveIndex.Batch(bleveBatch); err != nil {
				log.Printf("Error flushing batch: %v", err)
				return nil, err
			}
			bleveBatch = bleveIndex.NewBatch()
		}
	}

	fmt.Printf("Indexed %d documents", indexCount)

	return bleveBatch, nil
}

// populateJobs creates DocumentJob tasks for files found recursively inside each
// top-level folder under notesPath.
func populateJobs(folders []os.DirEntry, notesPath string, jobs chan<- DocumentJob) error {
	for _, folder := range folders {
		if !folder.IsDir() {
			continue
		}

		// Skip hidden top-level folders
		if strings.HasPrefix(folder.Name(), ".") {
			continue
		}

		rootFolderName := folder.Name()
		rootFolderPath := filepath.Join(notesPath, rootFolderName)

		// Emit a job for the top-level folder itself
		jobs <- DocumentJob{
			entryPath: rootFolderPath,
			entryId:   FolderDocId(rootFolderName),
			folder:    "",
			entryName: rootFolderName,
		}

		if err := filepath.WalkDir(rootFolderPath, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}

			// Skip hidden files and directories (names starting with '.')
			if strings.HasPrefix(d.Name(), ".") {
				if d.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}

			if d.IsDir() {
				// Emit a folder job for subdirectories (skip the root since we already emitted it)
				relPath, relErr := filepath.Rel(notesPath, path)
				if relErr != nil {
					return relErr
				}
				if relPath != rootFolderName {
					parentPath := filepath.Dir(relPath)
					if parentPath == "." {
						parentPath = ""
					}
					jobs <- DocumentJob{
						entryPath: path,
						entryId:   FolderDocId(relPath),
						folder:    parentPath,
						entryName: d.Name(),
					}
				}
				return nil
			}

			fileId, err := filepath.Rel(notesPath, path)
			if err != nil {
				return err
			}

			folderPath, fileName := filepath.Split(fileId)
			folderPath = strings.TrimSuffix(folderPath, string(filepath.Separator))

			jobs <- DocumentJob{
				entryPath: path,
				entryId:   fileId,
				folder:    folderPath,
				entryName: fileName,
			}
			return nil
		}); err != nil {
			return err
		}
	}

	return nil
}

// startWorker processes jobs from the jobs channel, reads the file contents,
// creates a MarkdownNoteBleveDocument for each markdown file, and sends the result
// to the results channel. It signals completion on the provided WaitGroup
// when all jobs have been processed.
func startWorker(projectPath string, jobs <-chan DocumentJob, results chan<- DocumentResult, workerWaitGroup *sync.WaitGroup) {
	defer workerWaitGroup.Done()
	for job := range jobs {
		fileExtension := filepath.Ext(job.entryName)

		// Handle folder entries (no file extension)
		if fileExtension == "" {
			info, statErr := os.Stat(job.entryPath)
			createdDate := ""
			if statErr == nil {
				createdDate = info.ModTime().UTC().Format(time.RFC3339)
			}
			results <- DocumentResult{
				isError:   false,
				entryPath: job.entryPath,
				entryId:   job.entryId,
				document:  CreateFolderBleveDocument(job.folder, job.entryName, createdDate),
			}
			continue
		}

		// Is a markdown note
		if fileExtension == ".md" {
			content, err := os.ReadFile(job.entryPath)
			if err != nil {
				results <- DocumentResult{
					isError:   true,
					entryPath: job.entryPath,
					entryId:   job.entryId,
					document:  nil,
				}
				continue
			}
			markdown := string(content)
			results <- DocumentResult{
				isError:   false,
				entryPath: job.entryPath,
				entryId:   job.entryId,
				document:  CreateMarkdownNoteBleveDocument(markdown, job.folder, job.entryName),
			}
		} else {
			results <- DocumentResult{
				isError:   false,
				entryPath: job.entryPath,
				entryId:   job.entryId,
				document:  createAttachmentBleveDocument(projectPath, job.folder, job.entryName, fileExtension),
			}
		}
	}
}

// buildDocumentJob converts an absolute file path under notes/ into the metadata
// needed by the existing worker/indexing pipeline.
func buildDocumentJob(projectPath, filePath string) (DocumentJob, error) {
	notesPath := filepath.Join(projectPath, "notes")
	fileID, err := filepath.Rel(notesPath, filePath)
	if err != nil {
		return DocumentJob{}, err
	}

	folderPath, fileName := filepath.Split(fileID)
	folderPath = strings.TrimSuffix(folderPath, string(filepath.Separator))

	return DocumentJob{
		entryPath: filePath,
		entryId:   fileID,
		folder:    folderPath,
		entryName: fileName,
	}, nil
}
