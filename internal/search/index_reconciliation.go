package search

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"syscall"

	"github.com/blevesearch/bleve/v2"
)

// ReconcileDocuments removes missing notes, attachments, and folders after a successful full scan.
// Rechecking disk preserves entries created after discovery. Callers must not use this for partial or failed scans.
// Returns an error without deleting entries whose filesystem state cannot be determined.
func ReconcileDocuments(projectPath string, directories, filePaths []string, index bleve.Index) error {
	seen := make(map[string]bool, len(directories)+len(filePaths))
	for _, directory := range directories {
		relative, err := filepath.Rel(filepath.Join(projectPath, "notes"), directory)
		if err != nil {
			return fmt.Errorf("relative discovered folder path: %w", err)
		}
		seen[filepath.ToSlash(relative)+"/"] = true
	}
	for _, filePath := range filePaths {
		relative, err := filepath.Rel(filepath.Join(projectPath, "notes"), filePath)
		if err != nil {
			return fmt.Errorf("relative discovered file path: %w", err)
		}
		seen[filepath.ToSlash(relative)] = true
	}
	request := bleve.NewSearchRequest(bleve.NewDisjunctionQuery(
		createTypeQuery(NOTE_TYPE), createTypeQuery(ATTACHMENT_TYPE), createTypeQuery(FOLDER_TYPE),
	))
	request.Size = DefaultBatchSize
	request.SortBy([]string{"_id"})
	for {
		result, err := index.Search(request)
		if err != nil {
			return fmt.Errorf("find stale documents: %w", err)
		}
		if len(result.Hits) == 0 {
			return nil
		}
		batch := index.NewBatch()
		for _, hit := range result.Hits {
			if seen[hit.ID] {
				continue
			}
			stale, err := isStaleDocument(projectPath, hit.ID)
			if err != nil {
				return err
			}
			if stale {
				batch.Delete(hit.ID)
			}
		}
		if err := FlushBatch(index, batch); err != nil {
			return err
		}
		request.SetSearchAfter(result.Hits[len(result.Hits)-1].Sort)
	}
}

// isStaleDocument checks whether a normalized document ID is missing or has changed kind on disk.
func isStaleDocument(projectPath, documentID string) (bool, error) {
	// Only our normalized notes-relative IDs are eligible for filesystem reconciliation.
	isFolder := strings.HasSuffix(documentID, "/")
	relative := strings.TrimSuffix(documentID, "/")
	if relative == "." || filepath.IsAbs(relative) || filepath.Clean(relative) != relative || relative == ".." || strings.HasPrefix(relative, "../") {
		return false, nil
	}
	info, err := os.Stat(filepath.Join(projectPath, "notes", relative))
	if os.IsNotExist(err) || errors.Is(err, syscall.ENOTDIR) || (err == nil && info.IsDir() != isFolder) {
		return true, nil
	}
	if err != nil {
		return false, fmt.Errorf("stat indexed path %q: %w", relative, err)
	}
	return false, nil
}
