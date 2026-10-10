package search

import (
	"context"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/util"
	"golang.org/x/sync/errgroup"
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

// IndexAllFiles recursively indexes visible notes and attachments under notes/.
// Returns an error if discovery or indexing fails.
func IndexAllFiles(projectPath string, bleveIndex bleve.Index) error {
	return indexFiles(projectPath, bleveIndex, util.WORKER_COUNT, func(ctx context.Context, jobs chan<- DocumentJob) error {
		notesPath := filepath.Join(projectPath, "notes")
		folders, err := os.ReadDir(notesPath)
		if err != nil {
			return err
		}
		return populateJobs(ctx, folders, notesPath, jobs)
	})
}

// IndexDiscoveredFiles indexes already-discovered files using bounded worker concurrency.
func IndexDiscoveredFiles(projectPath string, filePaths []string, bleveIndex bleve.Index, workerCount int) error {
	if len(filePaths) == 0 {
		return nil
	}
	return indexFiles(projectPath, bleveIndex, workerCount, func(ctx context.Context, jobs chan<- DocumentJob) error {
		for _, filePath := range filePaths {
			if err := ctx.Err(); err != nil {
				return err
			}
			if shouldSkipIndexedPath(projectPath, filePath) {
				continue
			}
			job, err := buildDocumentJob(projectPath, filePath)
			if err != nil {
				log.Printf("Error building indexing job for %s: %v", filePath, err)
				continue
			}
			if err := enqueueDocumentJob(ctx, jobs, job); err != nil {
				return err
			}
		}
		return nil
	})
}

// indexFiles owns the bounded pipeline. A discovery or batch error cancels
// channel operations, and every goroutine exits before the caller gets the error.
func indexFiles(projectPath string, bleveIndex bleve.Index, workerCount int, discover func(context.Context, chan<- DocumentJob) error) error {
	if workerCount <= 0 {
		workerCount = 1
	}
	group, ctx := errgroup.WithContext(context.Background())
	jobs := make(chan DocumentJob, util.MAX_JOBS)
	results := make(chan DocumentResult, util.MAX_JOBS)
	var workers sync.WaitGroup

	group.Go(func() error {
		defer close(jobs)
		if err := discover(ctx, jobs); err != nil {
			return fmt.Errorf("discover indexing jobs: %w", err)
		}
		return nil
	})

	workers.Add(workerCount)
	for w := 0; w < workerCount; w++ {
		group.Go(func() error {
			defer workers.Done()
			startWorker(ctx, projectPath, jobs, results)
			return nil
		})
	}
	group.Go(func() error {
		workers.Wait()
		close(results)
		return nil
	})
	group.Go(func() error {
		batch, err := addResultsToIndex(ctx, bleveIndex, bleveIndex.NewBatch(), results)
		if err != nil {
			return err
		}
		if err := ctx.Err(); err != nil {
			return err
		}
		if batch.Size() > 0 {
			if err := bleveIndex.Batch(batch); err != nil {
				return fmt.Errorf("flush final indexing batch: %w", err)
			}
		}
		return nil
	})
	return group.Wait()
}

func enqueueDocumentJob(ctx context.Context, jobs chan<- DocumentJob, job DocumentJob) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	select {
	case <-ctx.Done():
		return ctx.Err()
	case jobs <- job:
		return nil
	}
}

func addResultsToIndex(ctx context.Context, bleveIndex bleve.Index, bleveBatch *bleve.Batch, results <-chan DocumentResult) (*bleve.Batch, error) {
	indexCount := 0
	for {
		var docResult DocumentResult
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case result, ok := <-results:
			if !ok {
				log.Printf("Indexed %d documents", indexCount)
				return bleveBatch, nil
			}
			docResult = result
		}
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

		if err := bleveBatch.Index(docResult.entryId, docResult.document); err != nil {
			return nil, fmt.Errorf("add document %s to indexing batch: %w", docResult.entryId, err)
		}

		indexCount += 1

		if bleveBatch.Size() >= DefaultBatchSize {
			if err := bleveIndex.Batch(bleveBatch); err != nil {
				return nil, fmt.Errorf("flush indexing batch: %w", err)
			}
			bleveBatch = bleveIndex.NewBatch()
		}
	}
}

// populateJobs creates DocumentJob tasks for files found recursively inside each
// top-level folder under notesPath.
func populateJobs(ctx context.Context, folders []os.DirEntry, notesPath string, jobs chan<- DocumentJob) error {
	for _, folder := range folders {
		if err := ctx.Err(); err != nil {
			return err
		}
		// Skip hidden top-level entries, files and folders alike.
		if strings.HasPrefix(folder.Name(), ".") {
			continue
		}

		// Files sitting at the notes root index with an empty folder, so they
		// stay reachable from tree filtering like any nested note.
		if !folder.IsDir() {
			if err := enqueueDocumentJob(ctx, jobs, DocumentJob{
				entryPath: filepath.Join(notesPath, folder.Name()),
				entryId:   folder.Name(),
				folder:    "",
				entryName: folder.Name(),
			}); err != nil {
				return err
			}
			continue
		}

		rootFolderName := folder.Name()
		rootFolderPath := filepath.Join(notesPath, rootFolderName)

		if err := filepath.WalkDir(rootFolderPath, func(path string, d fs.DirEntry, err error) error {
			if ctxErr := ctx.Err(); ctxErr != nil {
				return ctxErr
			}
			if err != nil {
				return err
			}

			// Skip hidden files, sidecars, and hidden directories.
			if strings.HasPrefix(d.Name(), ".") {
				if d.IsDir() {
					return filepath.SkipDir
				}
				return nil
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

			return enqueueDocumentJob(ctx, jobs, DocumentJob{
				entryPath: path,
				entryId:   fileId,
				folder:    folderPath,
				entryName: fileName,
			})
		}); err != nil {
			return err
		}
	}

	return nil
}

func shouldSkipIndexedPath(projectPath, filePath string) bool {
	notesPath := filepath.Join(projectPath, "notes")
	relativePath, err := filepath.Rel(notesPath, filePath)
	if err != nil {
		return true
	}
	// filepath.Rel returns paths beginning with ".." for files outside the
	// project notes directory; the dotted-part check skips those paths and
	// hidden sidecar files.
	for _, pathPart := range strings.Split(relativePath, string(filepath.Separator)) {
		if strings.HasPrefix(pathPart, ".") {
			return true
		}
	}
	return false
}

// startWorker processes files until discovery ends or the pipeline is cancelled.
func startWorker(ctx context.Context, projectPath string, jobs <-chan DocumentJob, results chan<- DocumentResult) {
	for {
		if ctx.Err() != nil {
			return
		}
		var job DocumentJob
		select {
		case <-ctx.Done():
			return
		case next, ok := <-jobs:
			if !ok {
				return
			}
			job = next
		}
		result := DocumentResult{entryPath: job.entryPath, entryId: job.entryId}
		fileExtension := filepath.Ext(job.entryName)
		if fileExtension == ".md" {
			content, err := os.ReadFile(job.entryPath)
			if err != nil {
				result.isError = true
			} else {
				result.document = CreateMarkdownNoteBleveDocument(string(content), job.folder, job.entryName)
			}
		} else {
			result.document = createAttachmentBleveDocument(projectPath, job.folder, job.entryName, fileExtension)
		}
		select {
		case <-ctx.Done():
			return
		case results <- result:
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
