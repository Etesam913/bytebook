package events

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/blevesearch/bleve/v2"

	"github.com/etesam913/bytebook/internal/search"
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

func deleteFoldersFromIndex(params EventParams, data []map[string]string) {
	batch := params.Index.NewBatch()

	// Process each folder delete event in the batch
	for _, eventData := range data {
		folderName, exists := eventData["folder"]
		if !exists || folderName == "" {
			log.Println("Folder delete event data missing folder")
			continue
		}

		// Query for all documents with the folder attribute equal to the deleted folder
		folderQuery := bleve.NewTermQuery(folderName)
		folderQuery.SetField(search.FieldFolder)

		searchRequest := bleve.NewSearchRequest(folderQuery)
		searchRequest.Size = 1000 // Set a reasonable limit
		searchRequest.Fields = []string{search.FieldFolder}

		searchResult, err := params.Index.Search(searchRequest)
		if err != nil {
			log.Printf("Error searching for documents in folder %s: %v", folderName, err)
			continue
		}

		log.Println(len(searchResult.Hits), " hits found for folder ", folderName)

		// Delete all documents in the folder
		for _, hit := range searchResult.Hits {
			batch.Delete(hit.ID)
		}
	}

	err := params.Index.Batch(batch)
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
		oldFolderName, oldExists := eventData["oldFolder"]
		newFolderName, newExists := eventData["newFolder"]

		if !oldExists || oldFolderName == "" {
			log.Println("Folder rename event data missing oldFolder")
			continue
		}
		if !newExists || newFolderName == "" {
			log.Println("Folder rename event data missing newFolder")
			continue
		}

		updateMarkdownFilesForFolderRename(params.ProjectPath, oldFolderName, newFolderName)
	}
}

func renameFoldersInIndex(params EventParams, data []map[string]string) {
	// Process each folder rename event in the batch
	for _, eventData := range data {
		oldFolderName, oldExists := eventData["oldFolder"]
		newFolderName, newExists := eventData["newFolder"]

		if !oldExists || oldFolderName == "" {
			log.Println("Folder rename event data missing oldFolder")
			continue
		}
		if !newExists || newFolderName == "" {
			log.Println("Folder rename event data missing newFolder")
			continue
		}

		// Step 1: Delete all entries with the old folder name
		deleteRenameFolderFromIndex(params, oldFolderName)

		// Step 2: Re-index all files in the new folder
		newFolderPath := filepath.Join(params.ProjectPath, "notes", newFolderName)
		err := search.IndexAllFilesInFolder(newFolderPath, newFolderName, params.Index)
		if err != nil {
			log.Printf("Error re-indexing folder %s: %v", newFolderName, err)
		}
	}
}

// deleteRenameFolderFromIndex deletes all documents associated with the old folder name during a rename operation.
// This is the first step in the folder rename process.
func deleteRenameFolderFromIndex(params EventParams, oldFolderName string) {
	batch := params.Index.NewBatch()

	// Query for all documents with the old folder name
	folderQuery := bleve.NewTermQuery(oldFolderName)
	folderQuery.SetField(search.FieldFolder)

	searchRequest := bleve.NewSearchRequest(folderQuery)
	searchRequest.Size = 1000 // Set a reasonable limit
	searchRequest.Fields = []string{search.FieldFolder}

	searchResult, err := params.Index.Search(searchRequest)
	if err != nil {
		log.Printf("Error searching for documents in folder %s: %v", oldFolderName, err)
		return
	}

	// Delete all documents in the old folder
	for _, hit := range searchResult.Hits {
		batch.Delete(hit.ID)
	}

	err = params.Index.Batch(batch)
	if err != nil {
		log.Printf("Error batching delete operations for folder %s: %v", oldFolderName, err)
	}
}

// updateMarkdownFilesForFolderRename processes a folder rename event by updating all markdown files within the folder
// and their associated tags. It updates internal markdown URLs to reflect the new folder name and updates
// any references to the folder in the tags system. The function takes the old and new folder names as input.
func updateMarkdownFilesForFolderRename(projectPath, oldFolderName, newFolderName string) {
	newFolderPath := filepath.Join(projectPath, "notes", newFolderName)

	// When the note folder is renamed, all notes need path updates
	files, err := os.ReadDir(newFolderPath)
	if err != nil {
		log.Printf("Error reading directory %s: %v", newFolderPath, err)
		return
	}

	for _, file := range files {
		indexOfDot := strings.LastIndex(file.Name(), ".")
		if indexOfDot == -1 {
			continue
		}

		extension := file.Name()[indexOfDot+1:]
		if extension != "md" {
			continue
		}

		pathToFile := filepath.Join(newFolderPath, file.Name())
		noteContent, err := os.ReadFile(pathToFile)
		if err != nil {
			log.Printf("Error reading file %s: %v", pathToFile, err)
			continue
		}

		// Updates the urls inside the note markdown
		noteMarkdownWithNewFolderName := updateFolderNameInMarkdown(
			string(noteContent), oldFolderName, newFolderName,
		)

		err = os.WriteFile(pathToFile, []byte(noteMarkdownWithNewFolderName), 0644)
		if err != nil {
			fmt.Printf("Error writing file %s: %v", pathToFile, err)
			continue
		}
	}
}

// updateFolderNameInMarkdown updates folder names in internal markdown links and images
// This is a simplified version to avoid import cycles with the notes package
func updateFolderNameInMarkdown(markdown, oldFolderName, newFolderName string) string {
	// Replace folder names in image URLs
	markdown = imageRegex.ReplaceAllStringFunc(markdown, func(match string) string {
		submatches := imageRegex.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match
		}
		altText := submatches[1]
		url := strings.TrimSpace(submatches[2])

		// Check if this is an internal URL that contains the old folder name
		if strings.Contains(url, oldFolderName+"/") {
			newURL := strings.ReplaceAll(url, oldFolderName+"/", newFolderName+"/")
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

		// Check if this is an internal URL that contains the old folder name
		if strings.Contains(url, oldFolderName+"/") {
			newURL := strings.ReplaceAll(url, oldFolderName+"/", newFolderName+"/")
			return "[" + linkText + "](" + newURL + ")"
		}
		return match
	})

	return markdown
}
