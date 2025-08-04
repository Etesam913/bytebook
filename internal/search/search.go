package search

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/blevesearch/bleve/v2"
	_ "github.com/blevesearch/bleve/v2/analysis/analyzer/simple"
	"github.com/blevesearch/bleve/v2/mapping"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/util"
)

var INDEX_NAME = ".index.bleve"
var MARKDOWN_NOTE_TYPE = "markdown_note"
var ATTACHMENT_TYPE = "attachment"

type MarkdownNoteBleveDocument struct {
	Folder                string   `json:"folder"`
	FileName              string   `json:"file_name"`
	FileExtension         string   `json:"file_extension"`
	TextContent           string   `json:"text_content"`
	CodeContent           []string `json:"code_content"`
	GoCodeContent         []string `json:"go_code_content"`
	JavaCodeContent       []string `json:"java_code_content"`
	PythonCodeContent     []string `json:"python_code_content"`
	JavascriptCodeContent []string `json:"javascript_code_content"`
	HasDrawing            bool     `json:"has_drawing"`
	HasCode               bool     `json:"has_code"`
	HasGoCode             bool     `json:"has_go_code"`
	HasJavaCode           bool     `json:"has_java_code"`
	HasPythonCode         bool     `json:"has_python_code"`
	HasJavascriptCode     bool     `json:"has_javascript_code"`
	LastUpdated           string   `json:"last_updated"`
	CreatedDate           string   `json:"created_date"`
}

type AttachmentBleveDocument struct {
	FileName      string `json:"file_name"`
	FileExtension string `json:"file_extension"`
}

// CreateMarkdownNoteBleveDocument constructs a MarkdownNoteBleveDocument from markdown content.
// It extracts all relevant information using the markdown processing functions and populates
// the document structure for search indexing.
func CreateMarkdownNoteBleveDocument(markdown, folder, fileName string) MarkdownNoteBleveDocument {
	lastUpdated, _ := notes.GetLastUpdatedFromFrontmatter(markdown)
	createdDate, _ := notes.GetCreatedDateFromFrontmatter(markdown)

	return MarkdownNoteBleveDocument{
		Folder:                folder,
		FileName:              fileName,
		FileExtension:         ".md",
		TextContent:           notes.GetTextContent(markdown),
		CodeContent:           notes.GetCodeContent(markdown),
		GoCodeContent:         notes.GetGoCodeContent(markdown),
		JavaCodeContent:       notes.GetJavaCodeContent(markdown),
		PythonCodeContent:     notes.GetPythonCodeContent(markdown),
		JavascriptCodeContent: notes.GetJavaScriptCodeContent(markdown),
		HasDrawing:            notes.HasDrawing(markdown),
		HasCode:               notes.HasCode(markdown),
		HasGoCode:             notes.HasGoCode(markdown),
		HasJavaCode:           notes.HasJavaCode(markdown),
		HasPythonCode:         notes.HasPythonCode(markdown),
		HasJavascriptCode:     notes.HasJavaScriptCode(markdown),
		LastUpdated:           lastUpdated,
		CreatedDate:           createdDate,
	}
}

// CreateAttachmentBleveDocument constructs an AttachmentBleveDocument from file information.
// It extracts the filename and file extension for search indexing.
func CreateAttachmentBleveDocument(fileName, fileExtension string) AttachmentBleveDocument {
	return AttachmentBleveDocument{
		FileName:      fileName,
		FileExtension: fileExtension,
	}
}

// GetPathToIndex returns the full path to the search index file for a given project.
// It combines the project path with the notes directory and the index filename.
func GetPathToIndex(projectPath string) string {
	return filepath.Join(projectPath, INDEX_NAME)
}

// doesIndexExist checks whether a search index file exists for the given project path.
// It returns true if the index file exists, false otherwise.
func doesIndexExist(projectPath string) bool {
	exists, _ := util.FileOrFolderExists(GetPathToIndex(projectPath))
	return exists
}

// createIndex creates a new Bleve search index at the specified project path.
// It returns the created index or an error if the creation fails.
func createIndex(projectPath string) (bleve.Index, error) {
	pathToIndex := GetPathToIndex(projectPath)
	indexMapping := bleve.NewIndexMapping()
	indexMapping.AddDocumentMapping(MARKDOWN_NOTE_TYPE, createMarkdownNoteDocumentMapping())
	indexMapping.AddDocumentMapping(ATTACHMENT_TYPE, createAttachmentDocumentMapping())
	index, err := bleve.New(pathToIndex, indexMapping)
	if err != nil {
		return nil, err
	}

	return index, nil
}

// OpenOrCreateIndex opens an existing search index or creates a new one if it doesn't exist.
// It first checks if an index exists at the project path, and if so, opens it.
// If no index exists, it creates a new one. Returns the index or an error if the operation fails.
func OpenOrCreateIndex(projectPath string) (bleve.Index, error) {
	indexExists := doesIndexExist(projectPath)
	if indexExists {
		openedIndex, err := bleve.Open(GetPathToIndex(projectPath))
		if err != nil {
			return nil, err
		}
		return openedIndex, nil
	}

	index, err := createIndex(projectPath)
	if err != nil {
		return nil, err
	}
	return index, nil
}

// createMarkdownNoteDocumentMapping creates a Bleve document mapping for markdown notes.
// It defines field mappings for all the fields in MarkdownNoteBleveDocument to enable
// proper indexing and searching of markdown note content.
func createMarkdownNoteDocumentMapping() *mapping.DocumentMapping {
	documentMapping := bleve.NewDocumentMapping()

	proseTextFieldMapping := bleve.NewTextFieldMapping()
	proseTextFieldMapping.Analyzer = "en"

	keywordTextFieldMapping := bleve.NewTextFieldMapping()
	keywordTextFieldMapping.Analyzer = "keyword"

	// Set store = true for folder
	storedKeywordMapping := bleve.NewTextFieldMapping()
	storedKeywordMapping.Analyzer = "simple"
	storedKeywordMapping.Store = true

	// Set store = true for last_updated
	lastUpdatedFieldMapping := bleve.NewDateTimeFieldMapping()
	lastUpdatedFieldMapping.Store = true

	documentMapping.AddFieldMappingsAt("folder", storedKeywordMapping)
	documentMapping.AddFieldMappingsAt("file_name", storedKeywordMapping)
	documentMapping.AddFieldMappingsAt("file_extension", keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt("text_content", proseTextFieldMapping)
	documentMapping.AddFieldMappingsAt("code_content", proseTextFieldMapping)
	documentMapping.AddFieldMappingsAt("go_code_content", proseTextFieldMapping)
	documentMapping.AddFieldMappingsAt("java_code_content", proseTextFieldMapping)
	documentMapping.AddFieldMappingsAt("python_code_content", proseTextFieldMapping)
	documentMapping.AddFieldMappingsAt("javascript_code_content", proseTextFieldMapping)
	documentMapping.AddFieldMappingsAt("has_drawing", bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt("has_code", bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt("has_go_code", bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt("has_java_code", bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt("has_python_code", bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt("has_javascript_code", bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt("last_updated", lastUpdatedFieldMapping)
	documentMapping.AddFieldMappingsAt("created_date", bleve.NewDateTimeFieldMapping())

	fmt.Println("created")

	return documentMapping
}

// createAttachmentDocumentMapping creates a Bleve document mapping for attachments.
// It defines field mappings for all the fields in AttachmentBleveDocument to enable
// proper indexing and searching of attachment metadata.
func createAttachmentDocumentMapping() *mapping.DocumentMapping {
	documentMapping := bleve.NewDocumentMapping()

	documentMapping.AddFieldMappingsAt("file_name", bleve.NewTextFieldMapping())
	documentMapping.AddFieldMappingsAt("file_extension", bleve.NewTextFieldMapping())

	return documentMapping
}

// DocumentIndexInfo contains information about a document's presence in the search index.
type DocumentIndexInfo struct {
	Exists      bool
	LastUpdated string
}

// getDocumentByIdFromIndex checks if a document exists in the index and returns its lastUpdated value if available.
// Returns DocumentIndexInfo with Exists=false if the document is not found or an error occurs.
func getDocumentByIdFromIndex(index bleve.Index, docId string) DocumentIndexInfo {
	query := bleve.NewDocIDQuery([]string{docId})
	searchRequest := bleve.NewSearchRequest(query)
	searchRequest.Size = 1
	searchRequest.Fields = []string{"*"} // Request all fields
	searchResult, err := index.Search(searchRequest)

	if err != nil || searchResult.Total == 0 {
		return DocumentIndexInfo{Exists: false}
	}

	// Since Size=1, if Total > 0, there's exactly one hit at index 0
	hit := searchResult.Hits[0]
	lastUpdated := ""

	if indexedLastUpdated, exists := hit.Fields["LastUpdated"]; exists {
		if lastUpdatedStr, ok := indexedLastUpdated.(string); ok {
			lastUpdated = lastUpdatedStr
		}
	}

	return DocumentIndexInfo{
		Exists:      true,
		LastUpdated: lastUpdated,
	}
}

// AddMarkdownNoteToBatch processes a markdown file and adds it to the batch if it needs indexing.
// Returns the ID used for indexing and any error encountered.
func AddMarkdownNoteToBatch(batch *bleve.Batch, index bleve.Index, filePath, folderName, fileName string) (string, error) {
	// Read the file content
	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}

	markdown := string(content)

	updatedMarkdown, fileId := notes.EnsureIdInFrontmatter(markdown)

	// If the markdown was updated (ID was added), write it back to the file
	if updatedMarkdown != markdown {
		err = os.WriteFile(filePath, []byte(updatedMarkdown), 0644)
		if err != nil {
			return fileId, err
		}
		markdown = updatedMarkdown
	}

	docInfo := getDocumentByIdFromIndex(index, fileId)
	shouldIndex := false

	if !docInfo.Exists {
		shouldIndex = true
	} else {
		// Document exists, check if lastUpdated has changed
		currentLastUpdated, _ := notes.GetLastUpdatedFromFrontmatter(markdown)

		// If there's no lastUpdated in current file or index, or they differ, re-index
		if currentLastUpdated == "" || docInfo.LastUpdated == "" || currentLastUpdated != docInfo.LastUpdated {
			shouldIndex = true
		}
	}

	if shouldIndex {
		bleveDocument := CreateMarkdownNoteBleveDocument(markdown, folderName, fileName)
		batch.Index(fileId, bleveDocument)
	}

	return fileId, nil
}

// AddAttachmentToBatch processes an attachment file and adds it to the batch if it needs indexing.
// Returns the ID used for indexing and any error encountered.
func AddAttachmentToBatch(batch *bleve.Batch, index bleve.Index, filePath, folderName, fileName, fileExtension string) (string, error) {
	// For attachments, use the file path as the unique ID
	fileId := filepath.Join(folderName, fileName+fileExtension)

	docInfo := getDocumentByIdFromIndex(index, fileId)

	if !docInfo.Exists {
		bleveDocument := CreateAttachmentBleveDocument(fileName, fileExtension)
		batch.Index(fileId, bleveDocument)
	}

	return fileId, nil
}

// IndexAllFiles processes all files in the project's notes directory and ensures they are properly indexed.
// For each folder in the notes directory, it:
// 1. Creates a batch for efficient indexing
// 2. Processes each file in the folder
// 3. For .md files: ensures each file has an ID in frontmatter and indexes as markdown notes
// 4. For non-.md files: indexes as attachments
// 5. Commits the batch to the index
// This function should be called during application startup to ensure all files are indexed.
func IndexAllFiles(projectPath string, index bleve.Index) error {
	notesPath := filepath.Join(projectPath, "notes")

	if _, err := os.Stat(notesPath); os.IsNotExist(err) {
		return nil
	}

	folders, err := os.ReadDir(notesPath)
	if err != nil {
		return err
	}

	for _, folder := range folders {
		if !folder.IsDir() {
			continue
		}

		folderPath := filepath.Join(notesPath, folder.Name())
		batch := index.NewBatch()

		// Process all files in the folder
		files, err := os.ReadDir(folderPath)
		if err != nil {
			continue // Skip this folder if we can't read it
		}

		for _, file := range files {
			if file.IsDir() {
				continue
			}

			filePath := filepath.Join(folderPath, file.Name())

			if strings.HasSuffix(file.Name(), ".md") {
				// Handle markdown files
				fileName := strings.TrimSuffix(file.Name(), ".md")
				_, err := AddMarkdownNoteToBatch(batch, index, filePath, folder.Name(), fileName)
				if err != nil {
					log.Printf("Error processing markdown file %s: %v", filePath, err)
					continue
				}
			} else {
				// Handle attachment files
				fileExtension := filepath.Ext(file.Name())
				fileName := strings.TrimSuffix(file.Name(), fileExtension)
				_, err := AddAttachmentToBatch(batch, index, filePath, folder.Name(), fileName, fileExtension)
				if err != nil {
					log.Printf("Error processing attachment file %s: %v", filePath, err)
					continue
				}
			}
		}

		// Index the batch for this folder
		if batch.Size() > 0 {
			err = index.Batch(batch)
			if err != nil {
				log.Println("Error indexing batch:", err)
				continue
			}
		}
	}

	totalDocumentsIndexed, err := index.DocCount()
	if err != nil {
		log.Println("Error getting document count:", err)
	}
	log.Println("Indexing complete. Total documents indexed:", totalDocumentsIndexed)

	return nil
}
