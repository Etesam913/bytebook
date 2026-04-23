package events

import (
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
	"github.com/wailsapp/wails/v3/pkg/application"
)

// Regex patterns for markdown links and images
var (
	// Matches markdown images: ![alt text](url)
	imageRegex = regexp.MustCompile(`!\[([^\]]*)\]\(([^)]+)\)`)
	// Matches markdown links: [text](url)
	linkRegex = regexp.MustCompile(`\[([^\]]+)\]\(([^)]+)\)`)
)

func handleFolderDeleteEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]map[string]string)
	if !ok {
		log.Println("Folder delete event data is not of type []map[string]string")
		return
	}

	for _, item := range data {
		folderPath, ok := item["folderPath"]
		if !ok {
			continue
		}
		if err := config.DeletePinnedFolder(params.ProjectPath, folderPath); err != nil {
			log.Printf("Error updating pinned notes for folder delete %s: %v", folderPath, err)
		}
	}

	deleteFoldersFromIndex(params, data)
}

func handleFolderCreateEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]map[string]string)
	if !ok {
		log.Println("Folder create event data is not of type []map[string]string")
		return
	}

	if params.ImportCoordinator != nil {
		for _, folder := range data {
			folderPath := folder["folderPath"]
			if folderPath == "" {
				log.Println("Folder create event data missing folderPath")
				continue
			}
			params.ImportCoordinator.EnqueueFolderImport(folderPath)
		}
		return
	}

	addFoldersToIndex(params, data)
}

func addFoldersToIndex(params EventParams, data []map[string]string) {
	idx := params.Index.RLock()
	defer params.Index.RUnlock()
	batch := idx.NewBatch()

	for _, folder := range data {
		folderPath, ok := folder["folderPath"]
		if !ok || folderPath == "" {
			log.Println("Folder create event data missing folderPath")
			continue
		}

		// Index files within the folder
		pathOnDisk := filepath.Join(params.ProjectPath, "notes", folderPath)
		if err := search.IndexFilesInFolderWithBatch(pathOnDisk, folderPath, idx, batch); err != nil {
			log.Printf("Error indexing files for folder %s: %v", folderPath, err)
		}
	}

	if batch.Size() == 0 {
		return
	}

	err := idx.Batch(batch)
	if err != nil {
		log.Println("Error indexing batch", err)
	}
}

// createFolderAndDescendantsQuery builds a query that matches documents in the
// given folder AND any nested subfolders. It combines an exact TermQuery with a
// PrefixQuery for "<folder>/" so that deleting "parent" also catches "parent/child".
func createFolderAndDescendantsQuery(folderPath string) query.Query {
	lower := strings.ToLower(folderPath)

	exactQuery := bleve.NewTermQuery(lower)
	exactQuery.SetField(search.FieldFolder)

	prefixQuery := bleve.NewPrefixQuery(lower + "/")
	prefixQuery.SetField(search.FieldFolder)

	return bleve.NewDisjunctionQuery(exactQuery, prefixQuery)
}

func deleteFoldersFromIndex(params EventParams, data []map[string]string) {
	idx := params.Index.RLock()
	defer params.Index.RUnlock()
	batch := idx.NewBatch()

	for _, eventData := range data {
		folderPath, exists := eventData["folderPath"]
		if !exists || folderPath == "" {
			log.Println("Folder delete event data missing folderPath")
			continue
		}

		// Delete all file documents inside the folder
		folderQuery := createFolderAndDescendantsQuery(folderPath)

		searchRequest := bleve.NewSearchRequest(folderQuery)
		searchRequest.Size = search.MaxDeleteSearchResults
		searchRequest.Fields = []string{search.FieldFolder}

		searchResult, err := idx.Search(searchRequest)
		if err != nil {
			log.Printf("Error searching for documents in folder %s: %v", folderPath, err)
			continue
		}

		for _, hit := range searchResult.Hits {
			batch.Delete(hit.ID)
			if batch.Size() >= search.DefaultBatchSize {
				if err := idx.Batch(batch); err != nil {
					log.Printf("Error flushing delete batch for folder %s: %v", folderPath, err)
				}
				batch = idx.NewBatch()
			}
		}

	}

	if batch.Size() > 0 {
		if err := idx.Batch(batch); err != nil {
			log.Printf("Error batching delete operations: %v", err)
		}
	}
}

func handleFolderRenameEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]map[string]string)
	if !ok {
		log.Println("Folder rename event data is not of type []map[string]string")
		return
	}

	renameFoldersInIndex(params, data)

	// Update markdown files to fix internal links and media references for each rename
	for _, eventData := range data {
		oldFolderPath, oldExists := eventData["oldFolderPath"]
		newFolderPath, newExists := eventData["newFolderPath"]

		if !oldExists || oldFolderPath == "" {
			log.Println("Folder rename event data missing oldFolderPath")
			continue
		}
		if !newExists || newFolderPath == "" {
			log.Println("Folder rename event data missing newFolderPath")
			continue
		}

		if err := config.RenamePinnedFolder(params.ProjectPath, oldFolderPath, newFolderPath); err != nil {
			log.Printf("Error updating pinned notes for folder rename %s -> %s: %v", oldFolderPath, newFolderPath, err)
		}

		updateMarkdownFilesForFolderRename(params.ProjectPath, oldFolderPath, newFolderPath)
	}
}

func renameFoldersInIndex(params EventParams, data []map[string]string) {
	idx := params.Index.RLock()
	defer params.Index.RUnlock()
	// Process each folder rename event in the batch
	for _, eventData := range data {
		oldFolderPath, oldExists := eventData["oldFolderPath"]
		newFolderPath, newExists := eventData["newFolderPath"]

		if !oldExists || oldFolderPath == "" {
			log.Println("Folder rename event data missing oldFolderPath")
			continue
		}
		if !newExists || newFolderPath == "" {
			log.Println("Folder rename event data missing newFolderPath")
			continue
		}

		// Step 1: Delete all entries with the old folder name
		deleteRenameFolderFromIndexLocked(idx, oldFolderPath)

		// Step 2: Re-index all files in the new folder
		newFolderPathOnDisk := filepath.Join(params.ProjectPath, "notes", newFolderPath)
		batch := idx.NewBatch()

		err := search.IndexFilesInFolderWithBatch(newFolderPathOnDisk, newFolderPath, idx, batch)
		if err != nil {
			log.Printf("Error re-indexing folder %s: %v", newFolderPath, err)
			continue
		}

		if batch.Size() > 0 {
			if err := idx.Batch(batch); err != nil {
				log.Printf("Error committing re-index batch for folder %s: %v", newFolderPath, err)
			}
		}
	}
}

// deleteRenameFolderFromIndexLocked deletes all documents associated with the old
// folder name during a rename operation. Caller must hold the index read lock.
func deleteRenameFolderFromIndexLocked(idx bleve.Index, oldFolderPath string) {
	batch := idx.NewBatch()

	folderQuery := createFolderAndDescendantsQuery(oldFolderPath)

	searchRequest := bleve.NewSearchRequest(folderQuery)
	searchRequest.Size = search.MaxDeleteSearchResults
	searchRequest.Fields = []string{search.FieldFolder}

	searchResult, err := idx.Search(searchRequest)
	if err != nil {
		log.Printf("Error searching for documents in folder %s: %v", oldFolderPath, err)
		return
	}

	for _, hit := range searchResult.Hits {
		batch.Delete(hit.ID)
		if batch.Size() >= search.DefaultBatchSize {
			if err := idx.Batch(batch); err != nil {
				log.Printf("Error flushing delete batch for folder %s: %v", oldFolderPath, err)
			}
			batch = idx.NewBatch()
		}
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
