package search

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sync"
)

var MAX_JOBS = 100

// Based on CPU cores (good starting point)
var WORKER_COUNT = runtime.NumCPU() * 2 // 2x for I/O-bound work

type DocumentJob struct {
	filePath      string
	folder        string
	fileName      string
	fileExtension string
}

type DocumentResult struct {
	isError  bool
	document interface{}
}

// IndexFiles scans the "notes" directory within the given projectPath for folders containing Markdown files (.md).
// It dispatches indexing jobs for each Markdown file using a pool of worker goroutines.
// Results are collected and basic information about each indexed document is printed to stdout.
// Returns an error if any directory or file access fails.
func IndexFilesNew(projectPath string) error {
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

	go populateJobs(folders, notesPath, jobs)

	go func() {
		workerWaitGroup.Wait()
		close(results)
	}()

	for docResult := range results {
		if docResult.isError {
			fmt.Println("Document error")
			continue
		}
		markdownNote, ok := docResult.document.(MarkdownNoteBleveDocument)
		if ok {
			fmt.Println("Markdown note: ", markdownNote.FileName)
		}

		attachmentNote, ok := docResult.document.(AttachmentBleveDocument)
		if ok {
			fmt.Println("Attachment: ", attachmentNote.FileName)
		}

	}

	return nil
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
			fmt.Println("adding job for ", filePath)
			jobs <- DocumentJob{
				filePath:      filePath,
				folder:        folder.Name(),
				fileName:      file.Name(),
				fileExtension: filepath.Ext(file.Name()),
			}

		}
	}
	close(jobs)
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
				results <- DocumentResult{isError: true, document: nil}
				continue
			}
			markdown := string(content)
			results <- DocumentResult{
				isError:  false,
				document: CreateMarkdownNoteBleveDocument(markdown, job.folder, job.fileName),
			}
		} else {
			// Is an attachment
			results <- DocumentResult{
				isError:  false,
				document: createAttachmentBleveDocument(job.folder, job.fileName, job.fileExtension),
			}
		}
	}
}
