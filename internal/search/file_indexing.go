package search

import (
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/util"
)

type DocumentJob struct {
	filePath      string
	fileId        string
	folder        string
	fileName      string
	fileExtension string
}

type DocumentResult struct {
	isError  bool
	filePath string
	fileId   string
	document any
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

func addResultsToIndex(bleveIndex bleve.Index, bleveBatch *bleve.Batch, results chan DocumentResult) (*bleve.Batch, error) {
	indexCount := 0
	for docResult := range results {
		if docResult.isError {
			continue
		}
		document, err := bleveIndex.Document(docResult.fileId)
		if err != nil {
			log.Printf("Error when trying to fetch document in adding results: %v", err)
			continue
		}

		// The file is already indexed, so we can skip here
		if document != nil {
			continue
		}

		markdownBleveDocument, ok := docResult.document.(MarkdownNoteBleveDocument)
		if ok {
			bleveBatch.Index(docResult.fileId, markdownBleveDocument)
		}

		attachmentBleveDocument, ok := docResult.document.(AttachmentBleveDocument)
		if ok {
			bleveBatch.Index(docResult.fileId, attachmentBleveDocument)
		}

		indexCount += 1

		if bleveBatch.Size() >= defaultIndexBatchSize {
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

		rootFolderName := folder.Name()
		rootFolderPath := filepath.Join(notesPath, rootFolderName)
		if err := filepath.WalkDir(rootFolderPath, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}

			if d.IsDir() {
				return nil
			}

			fileId, err := filepath.Rel(notesPath, path)
			if err != nil {
				return err
			}

			folderPath, fileName := filepath.Split(fileId)
			folderPath = strings.TrimSuffix(folderPath, string(filepath.Separator))

			jobs <- DocumentJob{
				filePath:      path,
				fileId:        fileId,
				folder:        folderPath,
				fileName:      fileName,
				fileExtension: filepath.Ext(fileName),
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
		// Is a markdown note
		if job.fileExtension == ".md" {
			content, err := os.ReadFile(job.filePath)
			if err != nil {
				results <- DocumentResult{
					isError:  true,
					filePath: job.filePath,
					fileId:   job.fileId,
					document: nil,
				}
				continue
			}
			markdown := string(content)
			results <- DocumentResult{
				isError:  false,
				filePath: job.filePath,
				fileId:   job.fileId,
				document: CreateMarkdownNoteBleveDocument(markdown, job.folder, job.fileName),
			}
		} else {
			results <- DocumentResult{
				isError:  false,
				filePath: job.filePath,
				fileId:   job.fileId,
				document: createAttachmentBleveDocument(projectPath, job.folder, job.fileName, job.fileExtension),
			}
		}
	}
}
