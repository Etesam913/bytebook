package events

import (
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/blevesearch/bleve/v2"
	"golang.org/x/sync/errgroup"

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

	deleteFoldersFromIndex(params, data)
}

func handleFolderCreateEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]map[string]string)
	if !ok {
		log.Println("Folder create event data is not of type []map[string]string")
		return
	}

	addFoldersToIndex(params, data)
}

func addFoldersToIndex(params EventParams, data []map[string]string) {
	batch := (*params.Index).NewBatch()

	for _, folder := range data {
		folderPath, ok := folder["folderPath"]
		if !ok {
			log.Println("Folder create event data missing folderPath")
			continue
		}

		_, err := search.AddFolderToBatch(batch, *params.Index, folderPath)
		if err != nil {
			log.Printf("Error adding folder to batch: %v", err)
		}
	}

	err := (*params.Index).Batch(batch)
	if err != nil {
		log.Println("Error indexing batch", err)
	}
}

func deleteFoldersFromIndex(params EventParams, data []map[string]string) {
	batch := (*params.Index).NewBatch()

	// Process each folder delete event in the batch
	for _, eventData := range data {
		folderPath, exists := eventData["folderPath"]
		if !exists || folderPath == "" {
			log.Println("Folder delete event data missing folderPath")
			continue
		}

		// Delete the folder document itself
		batch.Delete(folderPath)

		// Query for all documents with the folder attribute equal to the deleted folder
		folderQuery := bleve.NewMatchPhraseQuery(folderPath)
		folderQuery.SetField(search.FieldFolder)

		searchRequest := bleve.NewSearchRequest(folderQuery)
		searchRequest.Size = 1000 // Set a reasonable limit
		searchRequest.Fields = []string{search.FieldFolder}

		searchResult, err := (*params.Index).Search(searchRequest)
		if err != nil {
			log.Printf("Error searching for documents in folder %s: %v", folderPath, err)
			continue
		}

		// Delete all documents in the folder
		for _, hit := range searchResult.Hits {
			batch.Delete(hit.ID)
		}
	}

	err := (*params.Index).Batch(batch)
	if err != nil {
		log.Printf("Error batching delete operations: %v", err)
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

		updateMarkdownFilesForFolderRename(params.ProjectPath, oldFolderPath, newFolderPath)
	}
}

func renameFoldersInIndex(params EventParams, data []map[string]string) {
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
		deleteRenameFolderFromIndex(params, oldFolderPath)

		// Step 2: Re-index all files in the new folder
		newFolderPathOnDisk := filepath.Join(params.ProjectPath, "notes", newFolderPath)
		batch := (*params.Index).NewBatch()
		err := search.IndexAllFilesInFolderWithBatch(newFolderPathOnDisk, newFolderPath, *params.Index, batch)
		if err != nil {
			log.Printf("Error re-indexing folder %s: %v", newFolderPath, err)
			continue
		}

		if batch.Size() > 0 {
			if err := (*params.Index).Batch(batch); err != nil {
				log.Printf("Error committing re-index batch for folder %s: %v", newFolderPath, err)
			}
		}
	}
}

// deleteRenameFolderFromIndex deletes all documents associated with the old folder name during a rename operation.
// This is the first step in the folder rename process.
func deleteRenameFolderFromIndex(params EventParams, oldFolderPath string) {
	batch := (*params.Index).NewBatch()

	// Delete the folder document itself
	batch.Delete(oldFolderPath)

	// Query for all documents with the old folder name
	folderQuery := bleve.NewMatchPhraseQuery(oldFolderPath)
	folderQuery.SetField(search.FieldFolder)

	searchRequest := bleve.NewSearchRequest(folderQuery)
	searchRequest.Size = 1000 // Set a reasonable limit
	searchRequest.Fields = []string{search.FieldFolder}

	searchResult, err := (*params.Index).Search(searchRequest)
	if err != nil {
		log.Printf("Error searching for documents in folder %s: %v", oldFolderPath, err)
		return
	}

	// Delete all documents in the old folder
	for _, hit := range searchResult.Hits {
		batch.Delete(hit.ID)
	}

	err = (*params.Index).Batch(batch)
	if err != nil {
		log.Printf("Error batching delete operations for folder %s: %v", oldFolderPath, err)
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
