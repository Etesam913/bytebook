package events

import (
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
	// Matches either a markdown image or link, capturing the leading "!" if present
	linkOrImageRegex = regexp.MustCompile(`(!?)\[([^\]]*)\]\(([^)]+)\)`)
)

func handleFolderDeleteEvent(params EventParams, data []util.FolderDeleteEventData) {
	for _, item := range data {
		if item.FolderPath == "" {
			continue
		}
		if err := config.DeletePinnedPath(params.ProjectPath, item.FolderPath); err != nil {
			log.Printf("Error updating pinned notes for folder delete %s: %v", item.FolderPath, err)
		}
	}

	deleteFoldersFromIndex(params, data)
}

func handleFolderCreateEvent(params EventParams, data []util.FolderCreateEventData) {
	for _, folder := range data {
		if folder.FolderPath == "" {
			log.Println("Folder create event data missing folderPath")
			continue
		}
		params.ImportCoordinator.EnqueueFolderImport(folder.FolderPath)
	}
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
	folderQuery.AddQuery(bleve.NewDocIDQuery([]string{folderPath + "/"}))

	return folderQuery
}

// deleteFolderDocumentsFromIndex queues deletes for every document in folderPath and its
// subfolders. Full batches are flushed as they fill; the caller flushes the remainder.
// Returns search or batch errors without continuing past a failed batch.
func deleteFolderDocumentsFromIndex(idx bleve.Index, batch *bleve.Batch, folderPath string) error {
	searchRequest := bleve.NewSearchRequest(createFolderAndDescendantsQuery(folderPath))
	searchRequest.Size = search.DefaultBatchSize
	searchRequest.SortBy([]string{"_id"})
	for {
		searchResult, err := idx.Search(searchRequest)
		if err != nil {
			return fmt.Errorf("searching for documents in folder %s: %w", folderPath, err)
		}
		if len(searchResult.Hits) == 0 {
			return nil
		}
		for _, hit := range searchResult.Hits {
			batch.Delete(hit.ID)
			if err := flushBatchIfFull(idx, batch); err != nil {
				return fmt.Errorf("flushing folder deletes: %w", err)
			}
		}
		searchRequest.SetSearchAfter(searchResult.Hits[len(searchResult.Hits)-1].Sort)
	}
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

		if err := config.RenamePinnedPath(params.ProjectPath, oldFolderPath, newFolderPath); err != nil {
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

// updateMarkdownFilesForFolderRename rewrites internal markdown URLs in notes within
// the renamed folder and its descendants, skipping hidden directories like indexing does.
func updateMarkdownFilesForFolderRename(projectPath, oldFolderPath, newFolderPath string) {
	workerGroup := new(errgroup.Group)
	workerGroup.SetLimit(util.WORKER_COUNT)

	newFolderPathOnDisk := filepath.Join(projectPath, "notes", newFolderPath)

	err := filepath.WalkDir(newFolderPathOnDisk, func(pathToFile string, entry fs.DirEntry, err error) error {
		if err != nil {
			log.Printf("Error walking path %s: %v", pathToFile, err)
			return nil
		}
		if entry.IsDir() {
			if strings.HasPrefix(entry.Name(), ".") {
				return filepath.SkipDir
			}
			return nil
		}
		if filepath.Ext(entry.Name()) != ".md" {
			return nil
		}

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
		return nil
	})
	if err != nil {
		log.Printf("Error walking directory %s: %v", newFolderPathOnDisk, err)
	}

	if err := workerGroup.Wait(); err != nil {
		log.Printf("Error during renaming files: %v", err)
	}
}

// updateFolderNameInMarkdown rewrites internal link and image URLs under oldFolderPath
// to point at newFolderPath. Only URLs starting with the encoded /notes/<old>/ prefix
// are changed. Returns the updated markdown and whether any changes were made.
func updateFolderNameInMarkdown(markdown, oldFolderPath, newFolderPath string) (string, bool) {
	oldPrefix := noteLinkPath(oldFolderPath) + "/"
	newPrefix := noteLinkPath(newFolderPath) + "/"
	updated := false

	// Single pass so the [alt](url) inside ![alt](url) is not rewritten twice
	markdown = linkOrImageRegex.ReplaceAllStringFunc(markdown, func(match string) string {
		submatches := linkOrImageRegex.FindStringSubmatch(match)
		bang, text, url := submatches[1], submatches[2], strings.TrimSpace(submatches[3])
		if bang == "" && text == "" {
			return match
		}
		if !strings.HasPrefix(url, oldPrefix) {
			return match
		}
		updated = true
		return bang + "[" + text + "](" + newPrefix + url[len(oldPrefix):] + ")"
	})

	return markdown, updated
}
