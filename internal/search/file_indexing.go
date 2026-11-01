package search

import (
	"context"
	"fmt"
	"io/fs"
	"log"
	"path/filepath"
	"strings"
	"sync"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/util"
	"golang.org/x/sync/errgroup"
)

const MAX_JOBS = 100

type documentJob struct {
	entryId   string
	folder    string
	entryName string
	isFolder  bool
}

type documentResult struct {
	err      error
	entryId  string
	document any
}

// IndexFolderTree recursively upserts a notes-relative subtree in bounded batches.
// An empty folder indexes the entire notes directory.
// Completed batches remain committed if a later discovery or indexing operation fails.
func IndexFolderTree(projectPath, folder string, bleveIndex bleve.Index) error {
	return indexFolderTree(projectPath, folder, bleveIndex, DEFAULT_BATCH_SIZE)
}

func indexFolderTree(projectPath, folder string, bleveIndex bleve.Index, batchSize int) error {
	batch := bleveIndex.NewBatch()
	if err := IndexFolderTreeToBatch(projectPath, folder, bleveIndex, batch, batchSize); err != nil {
		return err
	}
	if err := flushBatch(bleveIndex, batch); err != nil {
		return fmt.Errorf("flush final indexing batch: %w", err)
	}
	return nil
}

// IndexFolderTreeToBatch queues a subtree in batch, flushing full batches as needed.
// The caller owns the remaining batch, including when indexing fails.
func IndexFolderTreeToBatch(projectPath, folder string, bleveIndex bleve.Index, batch *bleve.Batch, batchSize int) error {
	return indexFilesToBatch(projectPath, bleveIndex, batch, util.WORKER_COUNT, batchSize, func(ctx context.Context, jobs chan<- documentJob) error {
		return populateJobs(ctx, projectPath, filepath.Join(projectPath, "notes", folder), jobs)
	})
}

// IndexDiscoveredFiles upserts already-discovered files using bounded worker concurrency.
func IndexDiscoveredFiles(projectPath string, filePaths []string, bleveIndex bleve.Index, workerCount int) error {
	return indexDiscoveredFiles(projectPath, filePaths, bleveIndex, workerCount, DEFAULT_BATCH_SIZE)
}

func indexDiscoveredFiles(projectPath string, filePaths []string, bleveIndex bleve.Index, workerCount, batchSize int) error {
	if len(filePaths) == 0 {
		return nil
	}
	return indexFiles(projectPath, bleveIndex, workerCount, batchSize, func(ctx context.Context, jobs chan<- documentJob) error {
		for _, filePath := range filePaths {
			if err := ctx.Err(); err != nil {
				return err
			}
			if shouldSkipIndexedPath(projectPath, filePath) {
				continue
			}
			job, err := buildDocumentJob(projectPath, filePath)
			if err != nil {
				return fmt.Errorf("build indexing job for %s: %w", filePath, err)
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
func indexFiles(projectPath string, bleveIndex bleve.Index, workerCount, batchSize int, discover func(context.Context, chan<- documentJob) error) error {
	batch := bleveIndex.NewBatch()
	if err := indexFilesToBatch(projectPath, bleveIndex, batch, workerCount, batchSize, discover); err != nil {
		return err
	}
	if err := flushBatch(bleveIndex, batch); err != nil {
		return fmt.Errorf("flush final indexing batch: %w", err)
	}
	return nil
}

func indexFilesToBatch(projectPath string, bleveIndex bleve.Index, batch *bleve.Batch, workerCount, batchSize int, discover func(context.Context, chan<- documentJob) error) error {
	if workerCount <= 0 {
		workerCount = 1
	}
	group, ctx := errgroup.WithContext(context.Background())
	jobs := make(chan documentJob, MAX_JOBS)
	results := make(chan documentResult, MAX_JOBS)
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
		_, err := addResultsToIndex(ctx, bleveIndex, batch, results, batchSize)
		if err != nil {
			return err
		}
		if err := ctx.Err(); err != nil {
			return err
		}
		return nil
	})
	return group.Wait()
}

func enqueueDocumentJob(ctx context.Context, jobs chan<- documentJob, job documentJob) error {
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

func addResultsToIndex(ctx context.Context, bleveIndex bleve.Index, bleveBatch *bleve.Batch, results <-chan documentResult, batchSize int) (*bleve.Batch, error) {
	indexCount := 0
	for {
		var docResult documentResult
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
		if docResult.err != nil {
			return nil, fmt.Errorf("build document %s: %w", docResult.entryId, docResult.err)
		}
		if err := bleveBatch.Index(docResult.entryId, docResult.document); err != nil {
			return nil, fmt.Errorf("add document %s to indexing batch: %w", docResult.entryId, err)
		}

		indexCount += 1

		if err := FlushBatchIfFull(bleveIndex, bleveBatch, batchSize); err != nil {
			return nil, fmt.Errorf("flush indexing batch: %w", err)
		}
	}
}

// populateJobs walks a subtree once, skipping hidden entries and the notes root.
func populateJobs(ctx context.Context, projectPath, root string, jobs chan<- documentJob) error {
	return filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
		if ctxErr := ctx.Err(); ctxErr != nil {
			return ctxErr
		}
		if err != nil {
			return err
		}
		if path == filepath.Join(projectPath, "notes") {
			return nil
		}
		if shouldSkipIndexedPath(projectPath, path) {
			if entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		job, err := buildDocumentJob(projectPath, path)
		if err != nil {
			return err
		}
		job.isFolder = entry.IsDir()
		if job.isFolder {
			job.entryId += "/"
		}
		return enqueueDocumentJob(ctx, jobs, job)
	})
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

// startWorker processes folders and files until discovery ends or the pipeline is cancelled.
func startWorker(ctx context.Context, projectPath string, jobs <-chan documentJob, results chan<- documentResult) {
	for {
		if ctx.Err() != nil {
			return
		}
		var job documentJob
		select {
		case <-ctx.Done():
			return
		case next, ok := <-jobs:
			if !ok {
				return
			}
			job = next
		}
		result := documentResult{entryId: job.entryId}
		if job.isFolder {
			result.document = folderBleveDocument{Type: FOLDER_TYPE, Folder: job.folder, FileName: job.entryName}
		} else {
			result.document, result.err = buildDocument(projectPath, job.folder, job.entryName, nil)
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
func buildDocumentJob(projectPath, filePath string) (documentJob, error) {
	notesPath := filepath.Join(projectPath, "notes")
	fileID, err := filepath.Rel(notesPath, filePath)
	if err != nil {
		return documentJob{}, err
	}

	folderPath, fileName := filepath.Split(fileID)
	folderPath = strings.TrimSuffix(folderPath, string(filepath.Separator))

	return documentJob{
		entryId:   fileID,
		folder:    folderPath,
		entryName: fileName,
	}, nil
}
