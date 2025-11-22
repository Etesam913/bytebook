package search

import (
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/blevesearch/bleve/analysis/token/lowercase"
	"github.com/blevesearch/bleve/v2"
	_ "github.com/blevesearch/bleve/v2/analysis/analyzer/custom"
	_ "github.com/blevesearch/bleve/v2/analysis/analyzer/keyword"
	_ "github.com/blevesearch/bleve/v2/analysis/analyzer/simple"
	_ "github.com/blevesearch/bleve/v2/analysis/lang/en"
	"github.com/blevesearch/bleve/v2/analysis/token/edgengram"
	_ "github.com/blevesearch/bleve/v2/analysis/token/lowercase"
	_ "github.com/blevesearch/bleve/v2/analysis/token/ngram"
	"github.com/blevesearch/bleve/v2/mapping"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/util"
)

var INDEX_NAME = ".index.bleve"
var MARKDOWN_NOTE_TYPE = "note"
var ATTACHMENT_TYPE = "attachment"
var FOLDER_TYPE = "folder"
var FilenameAnalyzer = "filename_analyzer"

const defaultIndexBatchSize = 750

// FlushBatch commits the batch to the index
// and creates a new batch. The batchPtr parameter should be a pointer to the batch variable
// so it can be updated after flushing.
// Example usage:
//
//	batch := index.NewBatch()
//	FlushBatch(index, &batch)
func FlushBatch(index bleve.Index, batch *bleve.Batch) error {
	if batch == nil || batch.Size() == 0 {
		return nil
	}
	return index.Batch(batch)
}

type MarkdownNoteBleveDocument struct {
	Type                  string   `json:"type"`
	Folder                string   `json:"folder"`
	FileName              string   `json:"file_name"`
	FileNameLC            string   `json:"file_name_lc"`
	FileExtension         string   `json:"file_extension"`
	TextContent           string   `json:"text_content"`
	TextContentNgram      string   `json:"text_content_ngram"`
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
	Tags                  []string `json:"tags"`
	LastUpdated           string   `json:"last_updated"`
	CreatedDate           string   `json:"created_date"`
}

type AttachmentBleveDocument struct {
	Type          string `json:"type"`
	Folder        string `json:"folder"`
	FileName      string `json:"file_name"`
	FileNameLC    string `json:"file_name_lc"`
	FileExtension string `json:"file_extension"`
}

type MarkdownFolderBleveDocument struct {
	Type     string `json:"type"`
	Folder   string `json:"folder"`
	FolderLC string `json:"folder_lc"`
}

// DocumentIndexInfo contains information about a document's presence in the search index.
type DocumentIndexInfo struct {
	Exists      bool
	LastUpdated string
}

// CreateMarkdownNoteBleveDocument constructs a MarkdownNoteBleveDocument from markdown content.
// It extracts all relevant information using the markdown processing functions and populates
// the document structure for search indexing.
func CreateMarkdownNoteBleveDocument(markdown, folder, fileName string) MarkdownNoteBleveDocument {
	lastUpdated, _ := notes.GetLastUpdatedFromFrontmatter(markdown)
	createdDate, _ := notes.GetCreatedDateFromFrontmatter(markdown)
	tags, _ := notes.GetTagsFromFrontmatter(markdown)

	return MarkdownNoteBleveDocument{
		Type:                  MARKDOWN_NOTE_TYPE,
		Folder:                folder,
		FileName:              fileName,
		FileNameLC:            strings.ToLower(fileName),
		FileExtension:         ".md",
		TextContent:           notes.GetTextContent(markdown),
		TextContentNgram:      notes.GetTextContent(markdown),
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
		Tags:                  tags,
		LastUpdated:           lastUpdated,
		CreatedDate:           createdDate,
	}
}

// createAttachmentBleveDocument constructs an AttachmentBleveDocument from file information.
// It extracts the filename and file extension for search indexing.
func createAttachmentBleveDocument(folder, fileName, fileExtension string) AttachmentBleveDocument {
	return AttachmentBleveDocument{
		Type:          ATTACHMENT_TYPE,
		Folder:        folder,
		FileName:      fileName,
		FileNameLC:    strings.ToLower(fileName),
		FileExtension: fileExtension,
	}
}

// createFolderBleveDocument constructs a MarkdownFolderBleveDocument from folder information.
// It extracts the folder name for search indexing.
func createFolderBleveDocument(folderName string) MarkdownFolderBleveDocument {
	return MarkdownFolderBleveDocument{
		Type:     FOLDER_TYPE,
		Folder:   folderName,
		FolderLC: strings.ToLower(folderName),
	}
}

// GetPathToIndex returns the full path to the search index file for a given project.
// It combines the project path with the search directory and the index filename.
func GetPathToIndex(projectPath string) string {
	return filepath.Join(projectPath, "search", INDEX_NAME)
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
	err := indexMapping.AddCustomTokenFilter(
		NGramTokenFilter,
		map[string]interface{}{
			"type": edgengram.Name,
			"min":  float64(3),
			"max":  float64(10),
			"side": "front",
		},
	)
	if err != nil {
		return nil, err
	}

	err = indexMapping.AddCustomAnalyzer(NGramAnalyzer,
		map[string]interface{}{
			"type":      "custom",
			"tokenizer": "unicode",
			"token_filters": []interface{}{
				lowercase.Name,
				NGramTokenFilter,
			},
		},
	)

	if err != nil {
		return nil, err
	}

	// Create a custom analyzer for filenames that lowercases but doesn't tokenize on apostrophes
	err = indexMapping.AddCustomAnalyzer(FilenameAnalyzer,
		map[string]interface{}{
			"type":      "custom",
			"tokenizer": "single", // single tokenizer treats the entire input as one token
			"token_filters": []interface{}{
				lowercase.Name, // lowercase the entire filename
			},
		},
	)

	if err != nil {
		return nil, err
	}

	// Use the "type" field in documents to select the document mapping
	indexMapping.TypeField = "type"
	indexMapping.DefaultMapping = createMarkdownNoteDocumentMapping()
	indexMapping.AddDocumentMapping(MARKDOWN_NOTE_TYPE, createMarkdownNoteDocumentMapping())
	indexMapping.AddDocumentMapping(ATTACHMENT_TYPE, createAttachmentDocumentMapping())
	indexMapping.AddDocumentMapping(FOLDER_TYPE, createFolderDocumentMapping())
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

	textFieldMapping := bleve.NewTextFieldMapping()
	textFieldMapping.Analyzer = "simple"
	textFieldMapping.Store = true
	textFieldMapping.Index = true
	textFieldMapping.IncludeTermVectors = true

	textNgramFieldMapping := bleve.NewTextFieldMapping()
	textNgramFieldMapping.Analyzer = NGramAnalyzer
	textNgramFieldMapping.Store = true
	textNgramFieldMapping.Index = true
	textNgramFieldMapping.IncludeTermVectors = true

	keywordTextFieldMapping := bleve.NewTextFieldMapping()
	keywordTextFieldMapping.Analyzer = "keyword"

	// Case insensitive word search
	storedSimpleFieldMapping := bleve.NewTextFieldMapping()
	storedSimpleFieldMapping.Analyzer = "simple"
	storedSimpleFieldMapping.Store = true

	folderLowerFieldMapping := bleve.NewTextFieldMapping()
	folderLowerFieldMapping.Analyzer = FilenameAnalyzer // Use custom analyzer that doesn't split on apostrophes
	folderLowerFieldMapping.Store = true

	// Use the new analyzer for filename field to handle apostrophes correctly
	// This will store lowercase but enable proper searching
	fileNameFieldMapping := bleve.NewTextFieldMapping()
	fileNameFieldMapping.Analyzer = FilenameAnalyzer // Use custom analyzer that doesn't split on apostrophes
	fileNameFieldMapping.Store = true

	// No longer need file_name_lc since FieldFileName now handles both search and display

	// Set store = true for last_updated
	lastUpdatedFieldMapping := bleve.NewDateTimeFieldMapping()
	lastUpdatedFieldMapping.Store = true

	documentMapping.AddFieldMappingsAt(FieldFolder, folderLowerFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldFileName, fileNameFieldMapping)
	// FieldFileNameLC removed - using FieldFileName for both search and display
	documentMapping.AddFieldMappingsAt(FieldFileExtension, keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldTextContent, textFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldTextContentNgram, textNgramFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldCodeContent, keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldGoCodeContent, keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldJavaCodeContent, keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldPythonCodeContent, keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldJavascriptCodeContent, keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldHasDrawing, bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt(FieldHasCode, bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt(FieldHasGoCode, bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt(FieldHasJavaCode, bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt(FieldHasPythonCode, bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt(FieldHasJavascriptCode, bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt(FieldTags, keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldLastUpdated, lastUpdatedFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldCreatedDate, bleve.NewDateTimeFieldMapping())

	return documentMapping
}

// createAttachmentDocumentMapping creates a Bleve document mapping for attachments.
// It defines field mappings for all the fields in AttachmentBleveDocument to enable
// proper indexing and searching of attachment metadata.
func createAttachmentDocumentMapping() *mapping.DocumentMapping {
	// Set store = true for folder
	storedKeywordMapping := bleve.NewTextFieldMapping()
	storedKeywordMapping.Analyzer = "keyword"
	storedKeywordMapping.Store = true

	keywordTextFieldMapping := bleve.NewTextFieldMapping()
	keywordTextFieldMapping.Analyzer = "keyword"

	fileNameFieldMapping := bleve.NewTextFieldMapping()
	fileNameFieldMapping.Analyzer = "keyword"
	fileNameFieldMapping.Store = true

	documentMapping := bleve.NewDocumentMapping()

	// Use filename analyzer for attachments too
	attachmentFileNameFieldMapping := bleve.NewTextFieldMapping()
	attachmentFileNameFieldMapping.Analyzer = FilenameAnalyzer
	attachmentFileNameFieldMapping.Store = true

	documentMapping.AddFieldMappingsAt(FieldFolder, storedKeywordMapping)
	documentMapping.AddFieldMappingsAt(FieldFileName, attachmentFileNameFieldMapping)
	// FieldFileNameLC removed - using FieldFileName for both search and display
	documentMapping.AddFieldMappingsAt(FieldFileExtension, keywordTextFieldMapping)

	return documentMapping
}

// createFolderDocumentMapping creates a Bleve document mapping for folders.
// It defines field mappings for all the fields in MarkdownFolderBleveDocument to enable
// proper indexing and searching of folder metadata.
func createFolderDocumentMapping() *mapping.DocumentMapping {
	folderLowerFieldMapping := bleve.NewTextFieldMapping()
	folderLowerFieldMapping.Analyzer = FilenameAnalyzer // Use custom analyzer that doesn't split on apostrophes
	folderLowerFieldMapping.Store = true

	documentMapping := bleve.NewDocumentMapping()
	documentMapping.AddFieldMappingsAt(FieldFolder, folderLowerFieldMapping)

	return documentMapping
}

// getDocumentByIdFromIndex checks if a document exists in the index and returns its lastUpdated value if available.
// Returns DocumentIndexInfo with Exists=false if the document is not found or an error occurs.
func getDocumentByIdFromIndex(index bleve.Index, docId string) DocumentIndexInfo {
	query := bleve.NewDocIDQuery([]string{docId})
	searchRequest := bleve.NewSearchRequest(query)
	searchRequest.Size = 1
	searchRequest.Fields = []string{FieldLastUpdated} // Request specific field
	searchResult, err := index.Search(searchRequest)

	if err != nil || searchResult.Total == 0 {
		return DocumentIndexInfo{Exists: false}
	}

	// Since Size=1, if Total > 0, there's exactly one hit at index 0
	hit := searchResult.Hits[0]
	lastUpdated := ""

	if indexedLastUpdated, exists := hit.Fields[FieldLastUpdated]; exists {
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
func AddMarkdownNoteToBatch(
	batch *bleve.Batch,
	index bleve.Index,
	filePath,
	folderName,
	fileName string,
	forceIndex bool,
) (string, error) {
	// Read the file content
	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}

	markdown := string(content)

	fileId := filepath.Join(folderName, fileName)

	docInfo := getDocumentByIdFromIndex(index, fileId)
	shouldIndex := false

	if !docInfo.Exists {
		shouldIndex = true
	} else {
		// Document exists, check if lastUpdated has changed
		currentLastUpdated, _ := notes.GetLastUpdatedFromFrontmatter(markdown)
		// If there's no lastUpdated in current file or index, or they differ, re-index
		if forceIndex || (currentLastUpdated == "" || docInfo.LastUpdated == "" || currentLastUpdated != docInfo.LastUpdated) {
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
func AddAttachmentToBatch(
	batch *bleve.Batch,
	index bleve.Index,
	folderName,
	fileName,
	fileExtension string,
) (string, error) {
	// For attachments, use the file path as the unique ID
	fileId := filepath.Join(folderName, fileName)
	docInfo := getDocumentByIdFromIndex(index, fileId)

	if !docInfo.Exists {
		bleveDocument := createAttachmentBleveDocument(folderName, fileName, fileExtension)
		batch.Index(fileId, bleveDocument)
	}

	return fileId, nil
}

// AddFolderToBatch processes a folder and adds it to the batch if it needs indexing.
// Returns the ID used for indexing and any error encountered.
func AddFolderToBatch(
	batch *bleve.Batch,
	index bleve.Index,
	folderName string,
) (string, error) {
	// For folders, use the folder name as the unique ID
	folderId := folderName
	docInfo := getDocumentByIdFromIndex(index, folderId)

	if !docInfo.Exists {
		bleveDocument := createFolderBleveDocument(folderName)
		batch.Index(folderId, bleveDocument)
	}

	return folderId, nil
}

// IndexAllFilesInFolderWithBatch processes all files in a specific folder and adds them to the provided batch.
// It flushes the batch to the index when it reaches the default batch size.
// The flushCallback function is used to execute the flush operation and update the batch reference.
func IndexAllFilesInFolderWithBatch(
	folderPath,
	folderName string,
	index bleve.Index,
	batch *bleve.Batch,
) error {
	if batch == nil {
		return nil
	}

	if _, err := os.Stat(folderPath); os.IsNotExist(err) {
		return err
	}

	// Index the folder itself
	_, err := AddFolderToBatch(batch, index, folderName)
	if err != nil {
		log.Printf("Error indexing folder %s: %v", folderName, err)
		// Continue with file indexing even if folder indexing fails
	}

	// Process all files in the folder
	files, err := os.ReadDir(folderPath)
	if err != nil {
		return err
	}

	for _, file := range files {
		if file.IsDir() {
			continue // Skip subdirectories
		}

		filePath := filepath.Join(folderPath, file.Name())

		if strings.HasSuffix(file.Name(), ".md") {
			// Handle markdown files
			_, err := AddMarkdownNoteToBatch(
				batch,
				index,
				filePath,
				folderName,
				file.Name(),
				false,
			)
			if err != nil {
				log.Printf("Error processing markdown file %s: %v", filePath, err)
				continue
			}
		} else {
			// Handle attachment files
			fileExtension := filepath.Ext(file.Name())
			_, err := AddAttachmentToBatch(batch, index, folderName, file.Name(), fileExtension)
			if err != nil {
				log.Printf("Error processing attachment file %s: %v", filePath, err)
				continue
			}
		}

		if batch.Size() >= defaultIndexBatchSize {
			if err := FlushBatch(index, batch); err != nil {
				log.Printf("Error flushing batch: %v", err)
				return err
			}
		}
	}
	return nil
}

// IndexAllFiles processes all folders in the project's notes directory and ensures their files are properly indexed.
// It iterates through each folder in the notes directory and calls IndexAllFilesInFolderWithBatch for each one.
// This function should be called during application startup to ensure all files are indexed.
func IndexAllFiles(projectPath string, index bleve.Index) error {
	notesPath := filepath.Join(projectPath, "notes")

	if _, err := os.Stat(notesPath); os.IsNotExist(err) {
		return nil // Notes directory doesn't exist, which is fine
	}

	folders, err := os.ReadDir(notesPath)
	if err != nil {
		return err
	}

	batch := index.NewBatch()

	for _, folder := range folders {
		if !folder.IsDir() {
			continue
		}

		folderPath := filepath.Join(notesPath, folder.Name())
		err := IndexAllFilesInFolderWithBatch(
			folderPath,
			folder.Name(),
			index,
			batch,
		)
		if err != nil {
			log.Printf("Error indexing folder %s: %v", folder.Name(), err)
			continue
		}
	}

	if err := FlushBatch(index, batch); err != nil {
		return err
	}

	totalDocumentsIndexed, err := index.DocCount()
	if err != nil {
		log.Println("Error getting document count:", err)
	} else {
		log.Println("Indexing complete. Total documents indexed:", totalDocumentsIndexed)
	}

	return nil
}

// RegenerateSearchIndex regenerates the search index by closing the existing index,
// deleting it, creating a new index, and re-indexing all files.
// It returns the new index and any error encountered during the process.
func RegenerateSearchIndex(projectPath string, index bleve.Index) (bleve.Index, error) {
	// Close the existing index if it's open
	if index != nil {
		err := index.Close()
		if err != nil {
			log.Printf("Error closing existing index: %v", err)
			// Continue with regeneration even if close fails
		}
	}

	// Delete the existing index directory
	pathToIndex := GetPathToIndex(projectPath)
	indexExists, err := util.FileOrFolderExists(pathToIndex)
	if err != nil {
		return nil, err
	}
	if indexExists {
		err := os.RemoveAll(pathToIndex)
		if err != nil {
			return nil, err
		}
	}

	// Create a new index
	newIndex, err := createIndex(projectPath)
	if err != nil {
		return nil, err
	}

	// Re-index all files
	err = IndexAllFiles(projectPath, newIndex)
	if err != nil {
		// Close the new index if re-indexing fails
		newIndex.Close()
		return nil, err
	}

	return newIndex, nil
}
