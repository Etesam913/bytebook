package events

import (
	"errors"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/search/query"
	"golang.org/x/sync/errgroup"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
)

// Regex patterns for markdown links and images
var (
	// Matches markdown images: ![alt text](url)
	imageRegex = regexp.MustCompile(`!\[([^\]]*)\]\(([^)]+)\)`)
	// Matches markdown links: [text](url)
	linkRegex = regexp.MustCompile(`\[([^\]]+)\]\(([^)]+)\)`)
)

func handleFolderDeleteEvent(params EventParams, data []util.FolderDeleteEventData) {
	for _, item := range data {
		if item.FolderPath == "" {
			continue
		}
		if err := config.DeletePinnedFolder(params.ProjectPath, item.FolderPath); err != nil {
			log.Printf("Error updating pinned notes for folder delete %s: %v", item.FolderPath, err)
		}
	}

	deleteFoldersFromIndex(params, data)
}

func handleFolderCreateEvent(params EventParams, data []util.FolderCreateEventData) {
	if params.ImportCoordinator != nil {
		for _, folder := range data {
			if folder.FolderPath == "" {
				log.Println("Folder create event data missing folderPath")
				continue
			}
			params.ImportCoordinator.EnqueueFolderImport(folder.FolderPath)
		}
		return
	}

	addFoldersToIndex(params, data)
}

func addFoldersToIndex(params EventParams, data []util.FolderCreateEventData) {
	params.withBatch(func(idx bleve.Index, batch *bleve.Batch) {
		for _, folder := range data {
			folderPath := folder.FolderPath
			if folderPath == "" {
				log.Println("Folder create event data missing folderPath")
				continue
			}

			pathOnDisk := filepath.Join(params.ProjectPath, "notes", folderPath)
			if err := search.IndexFilesInFolderWithBatch(params.ProjectPath, pathOnDisk, folderPath, idx, batch); err != nil {
				log.Printf("Error indexing files for folder %s: %v", folderPath, err)
			}
		}
	})
}

// createFolderAndDescendantsQuery builds a query that matches documents in the
// given folder AND any nested subfolders. Folder fields are normalized to
// lowercase by the index analyzer.
func createFolderAndDescendantsQuery(folderPath string) query.Query {
	lower := strings.ToLower(folderPath)

	folderQuery := bleve.NewDisjunctionQuery()
	exactQuery := bleve.NewTermQuery(lower)
	exactQuery.SetField(search.FieldFolder)
	folderQuery.AddQuery(exactQuery)

	prefixQuery := bleve.NewPrefixQuery(lower + "/")
	prefixQuery.SetField(search.FieldFolder)
	folderQuery.AddQuery(prefixQuery)

	return folderQuery
}

// deleteFolderDocumentsFromIndex queues deletes for every document in folderPath and its
// subfolders. Full batches are flushed as they fill; the caller flushes the remainder.
// Flush errors don't stop the remaining deletes and are returned joined.
func deleteFolderDocumentsFromIndex(idx bleve.Index, batch *bleve.Batch, folderPath string) error {
	searchRequest := bleve.NewSearchRequest(createFolderAndDescendantsQuery(folderPath))
	searchRequest.Size = search.MaxDeleteSearchResults
	searchRequest.Fields = []string{search.FieldFolder}

	searchResult, err := idx.Search(searchRequest)
	if err != nil {
		return fmt.Errorf("searching for documents in folder %s: %w", folderPath, err)
	}

	var flushErrs []error
	for _, hit := range searchResult.Hits {
		batch.Delete(hit.ID)
		if batch.Size() >= search.DefaultBatchSize {
			if err := idx.Batch(batch); err != nil {
				flushErrs = append(flushErrs, fmt.Errorf("flushing delete batch for folder %s: %w", folderPath, err))
			}
			batch.Reset()
		}
	}
	return errors.Join(flushErrs...)
}

func deleteFoldersFromIndex(params EventParams, data []util.FolderDeleteEventData) {
	params.withBatch(func(idx bleve.Index, batch *bleve.Batch) {
		for _, eventData := range data {
			folderPath := eventData.FolderPath
			if folderPath == "" {
				log.Println("Folder delete event data missing folderPath")
				continue
			}

			if err := deleteFolderDocumentsFromIndex(idx, batch, folderPath); err != nil {
				log.Printf("Error deleting documents for folder %s: %v", folderPath, err)
			}
		}
	})
}

func handleFolderRenameEvent(params EventParams, data []util.FolderRenameEventData) {
	// Update markdown files before re-indexing so the new folder's indexed links
	// reflect the rewritten file contents immediately.
	for _, eventData := range data {
		oldFolderPath := eventData.OldFolderPath
		newFolderPath := eventData.NewFolderPath

		if oldFolderPath == "" {
			log.Println("Folder rename event data missing oldFolderPath")
			continue
		}
		if newFolderPath == "" {
			log.Println("Folder rename event data missing newFolderPath")
			continue
		}

		if err := config.RenamePinnedFolder(params.ProjectPath, oldFolderPath, newFolderPath); err != nil {
			log.Printf("Error updating pinned notes for folder rename %s -> %s: %v", oldFolderPath, newFolderPath, err)
		}

		updateMarkdownFilesForFolderRename(params.ProjectPath, oldFolderPath, newFolderPath)
	}

	renameFoldersInIndex(params, data)
}

func renameFoldersInIndex(params EventParams, data []util.FolderRenameEventData) {
	params.withBatch(func(idx bleve.Index, batch *bleve.Batch) {
		// Each rename commits its own re-index so a failed walk discards only its
		// own partial batch.
		for _, eventData := range data {
			oldFolderPath := eventData.OldFolderPath
			newFolderPath := eventData.NewFolderPath

			if oldFolderPath == "" {
				log.Println("Folder rename event data missing oldFolderPath")
				continue
			}
			if newFolderPath == "" {
				log.Println("Folder rename event data missing newFolderPath")
				continue
			}

			// Step 1: Delete all entries with the old folder name
			deleteRenameFolderFromIndexLocked(idx, oldFolderPath)

			// Step 2: Re-index all files in the new folder
			newFolderPathOnDisk := filepath.Join(params.ProjectPath, "notes", newFolderPath)

			err := filepath.WalkDir(newFolderPathOnDisk, func(path string, entry fs.DirEntry, err error) error {
				if err != nil {
					return err
				}
				if strings.HasPrefix(entry.Name(), ".") && entry.IsDir() {
					return filepath.SkipDir
				}
				if !entry.IsDir() {
					return nil
				}
				folderPath, err := filepath.Rel(filepath.Join(params.ProjectPath, "notes"), path)
				if err != nil {
					return err
				}
				return search.IndexFilesInFolderWithBatch(params.ProjectPath, path, folderPath, idx, batch)
			})
			if err != nil {
				log.Printf("Error re-indexing folder %s: %v", newFolderPath, err)
				batch.Reset()
				continue
			}

			if batch.Size() > 0 {
				if err := idx.Batch(batch); err != nil {
					log.Printf("Error committing re-index batch for folder %s: %v", newFolderPath, err)
				}
				batch.Reset()
			}
		}
	})
}

// deleteRenameFolderFromIndexLocked deletes all documents associated with the old
// folder name during a rename operation. Caller must hold the index read lock.
func deleteRenameFolderFromIndexLocked(idx bleve.Index, oldFolderPath string) {
	batch := idx.NewBatch()

	if err := deleteFolderDocumentsFromIndex(idx, batch, oldFolderPath); err != nil {
		log.Printf("Error deleting documents for folder %s: %v", oldFolderPath, err)
	}

	if batch.Size() > 0 {
		if err := idx.Batch(batch); err != nil {
			log.Printf("Error batching delete operations for folder %s: %v", oldFolderPath, err)
		}
	}
}

// updateMarkdownFilesForFolderRename processes a folder rename event by updating all markdown files within the folder
// and their associated tags. It updates internal markdown URLs to reflect the new folder name and updates
// any references to the folder in the tags system. The function takes the old and new folder names as input.
func updateMarkdownFilesForFolderRename(projectPath, oldFolderPath, newFolderPath string) {
	workerGroup := new(errgroup.Group)
	workerGroup.SetLimit(util.WORKER_COUNT)

	newFolderPathOnDisk := filepath.Join(projectPath, "notes", newFolderPath)

	// When the note folder is renamed, all notes need path updates
	files, err := os.ReadDir(newFolderPathOnDisk)

	if err != nil {
		log.Printf("Error reading directory %s: %v", newFolderPathOnDisk, err)
		return
	}

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		indexOfDot := strings.LastIndex(file.Name(), ".")
		if indexOfDot == -1 {
			continue
		}

		extension := file.Name()[indexOfDot+1:]
		if extension != "md" {
			continue
		}

		pathToFile := filepath.Join(newFolderPathOnDisk, file.Name())

		workerGroup.Go(func() error {
			noteContent, err := os.ReadFile(pathToFile)
			if err != nil {
				log.Printf("Error reading file %s: %v", pathToFile, err)
				return err
			}

			// Updates the urls inside the note markdown
			noteMarkdownWithNewFolderName, wasUpdated := updateFolderNameInMarkdown(
				string(noteContent), oldFolderPath, newFolderPath,
			)

			// Only write to the file if the markdown was actually updated
			if wasUpdated {
				err = os.WriteFile(pathToFile, []byte(noteMarkdownWithNewFolderName), 0644)
				if err != nil {
					log.Printf("Error writing file %s: %v", pathToFile, err)
					return err
				}
			}

			return nil
		})
	}

	if err := workerGroup.Wait(); err != nil {
		log.Printf("Error during renaming files: %v", err)
	}
}

// updateFolderNameInMarkdown updates folder names in internal markdown links and images
// This is a simplified version to avoid import cycles with the notes package
// Returns the updated markdown and a boolean indicating if any changes were made
func updateFolderNameInMarkdown(markdown, oldFolderPath, newFolderPath string) (string, bool) {
	updated := false

	// Replace folder names in image/video URLs
	markdown = imageRegex.ReplaceAllStringFunc(markdown, func(match string) string {
		submatches := imageRegex.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match
		}
		altText := submatches[1]
		url := strings.TrimSpace(submatches[2])

		// Check if this is an internal URL that contains the old folder path
		if strings.Contains(url, oldFolderPath+"/") {
			updated = true
			newURL := strings.ReplaceAll(url, oldFolderPath+"/", newFolderPath+"/")
			return "![" + altText + "](" + newURL + ")"
		}
		return match
	})

	// Replace folder names in link URLs
	markdown = linkRegex.ReplaceAllStringFunc(markdown, func(match string) string {
		submatches := linkRegex.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match
		}
		linkText := submatches[1]
		url := strings.TrimSpace(submatches[2])

		// Check if this is an internal URL that contains the old folder path
		if strings.Contains(url, oldFolderPath+"/") {
			updated = true
			newURL := strings.ReplaceAll(url, oldFolderPath+"/", newFolderPath+"/")
			return "[" + linkText + "](" + newURL + ")"
		}
		return match
	})

	return markdown, updated
}
