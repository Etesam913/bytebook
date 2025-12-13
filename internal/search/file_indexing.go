package search

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"sync"

	"github.com/blevesearch/bleve/v2"
)

var MAX_JOBS = 100

// Based on CPU cores (good starting point)
var WORKER_COUNT = runtime.NumCPU() * 2 // 2x for I/O-bound work

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
	document interface{}
}

// IndexFiles scans the "notes" directory within the given projectPath for folders containing Markdown files (.md).
// It dispatches indexing jobs for each Markdown file using a pool of worker goroutines.
// Results are collected and basic information about each indexed document is printed to stdout.
// Returns an error if any directory or file access fails.
func IndexAllFiles(projectPath string, bleveIndex bleve.Index) error {
	notesPath := filepath.Join(projectPath, "notes")
	folders, err := os.ReadDir(notesPath)

	jobs := make(chan DocumentJob, MAX_JOBS)
	var workerWaitGroup sync.WaitGroup

	results := make(chan DocumentResult, MAX_JOBS)

	if err != nil {
		return err
	}

	for w := 0; w < WORKER_COUNT; w++ {
		workerWaitGroup.Add(1)
		go startWorker(jobs, results, &workerWaitGroup)
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
	for _, folder := range folders {
		AddFolderToBatch(bleveBatch, bleveIndex, folder.Name())
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

// populateJobs creates DocumentJob tasks for each markdown file (.md) found in the subdirectories
// of the notesPath directory. It iterates through each folder in folders, and for every markdown file
// in each folder, it submits a DocumentJob to the provided jobs channel. Returns an error if reading
// a directory fails, otherwise nil.
func populateJobs(folders []os.DirEntry, notesPath string, jobs chan<- DocumentJob) error {
	for _, folder := range folders {
		if !folder.IsDir() {
			continue
		}
		folderPath := filepath.Join(notesPath, folder.Name())

		files, err := os.ReadDir(folderPath)
		if err != nil {
			return err
		}

		for _, file := range files {
			filePath := filepath.Join(folderPath, file.Name())
			fileId := filepath.Join(folder.Name(), file.Name())
			jobs <- DocumentJob{
				filePath:      filePath,
				fileId:        fileId,
				folder:        folder.Name(),
				fileName:      file.Name(),
				fileExtension: filepath.Ext(file.Name()),
			}

		}
	}
	return nil
}

// startWorker processes jobs from the jobs channel, reads the file contents,
// creates a MarkdownNoteBleveDocument for each markdown file, and sends the result
// to the results channel. It signals completion on the provided WaitGroup
// when all jobs have been processed.
func startWorker(jobs <-chan DocumentJob, results chan<- DocumentResult, workerWaitGroup *sync.WaitGroup) {
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
			// Is an attachment
			results <- DocumentResult{
				isError:  false,
				filePath: job.filePath,
				fileId:   job.fileId,
				document: createAttachmentBleveDocument(job.folder, job.fileName, job.fileExtension),
			}
		}
	}
}
