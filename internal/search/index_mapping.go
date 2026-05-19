package search

import (
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

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
	"github.com/etesam913/bytebook/internal/notes/sidecar"
	"github.com/etesam913/bytebook/internal/util"
)

var INDEX_NAME = ".index.bleve"
var MARKDOWN_NOTE_TYPE = "note"
var ATTACHMENT_TYPE = "attachment"
var FilenameAnalyzer = "filename_analyzer"

const DefaultBatchSize = 750

// MaxDeleteSearchResults is the upper bound on documents returned when
// querying for folder contents to delete. Bleve defaults to 10 if unset.
const MaxDeleteSearchResults = 100000

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
	HasCode               bool     `json:"has_code"`
	HasGoCode             bool     `json:"has_go_code"`
	HasJavaCode           bool     `json:"has_java_code"`
	HasPythonCode         bool     `json:"has_python_code"`
	HasJavascriptCode     bool     `json:"has_javascript_code"`
	Tags                  []string `json:"tags"`
	Links                 []string `json:"links"`
	LastUpdated           string   `json:"last_updated"`
	CreatedDate           string   `json:"created_date"`
	Size                  int64    `json:"size"`
}

type AttachmentBleveDocument struct {
	Type          string   `json:"type"`
	Folder        string   `json:"folder"`
	FileName      string   `json:"file_name"`
	FileNameLC    string   `json:"file_name_lc"`
	FileExtension string   `json:"file_extension"`
	Tags          []string `json:"tags"`
	CreatedDate   string   `json:"created_date"`
	Size          int64    `json:"size"`
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
	links := notes.GetInternalLinksFromBody(markdown)
	textContent := notes.GetTextContent(markdown)
	return MarkdownNoteBleveDocument{
		Type:                  MARKDOWN_NOTE_TYPE,
		Folder:                folder,
		FileName:              fileName,
		FileNameLC:            strings.ToLower(fileName),
		FileExtension:         ".md",
		TextContent:           textContent,
		TextContentNgram:      textContent,
		CodeContent:           notes.GetCodeContent(markdown),
		GoCodeContent:         notes.GetGoCodeContent(markdown),
		JavaCodeContent:       notes.GetJavaCodeContent(markdown),
		PythonCodeContent:     notes.GetPythonCodeContent(markdown),
		JavascriptCodeContent: notes.GetJavaScriptCodeContent(markdown),
		HasCode:               notes.HasCode(markdown),
		HasGoCode:             notes.HasGoCode(markdown),
		HasJavaCode:           notes.HasJavaCode(markdown),
		HasPythonCode:         notes.HasPythonCode(markdown),
		HasJavascriptCode:     notes.HasJavaScriptCode(markdown),
		Tags:                  tags,
		Links:                 links,
		LastUpdated:           lastUpdated,
		CreatedDate:           createdDate,
		Size:                  int64(len([]byte(markdown))),
	}
}

// createAttachmentBleveDocument constructs an AttachmentBleveDocument from file information.
// It extracts the filename, file extension, and attachment tags for search indexing.
func createAttachmentBleveDocument(projectPath, folder, fileName, fileExtension string) AttachmentBleveDocument {
	tags, err := sidecar.ReadTags(projectPath, folder, fileName)
	if err != nil {
		tags = []string{}
	}

	size := int64(0)
	createdDate := ""
	attachmentPath := filepath.Join(projectPath, "notes", folder, fileName)
	fileInfo, statErr := os.Stat(attachmentPath)
	if statErr == nil {
		size = fileInfo.Size()
		createdDate = fileInfo.ModTime().UTC().Format(time.RFC3339)
	}

	return AttachmentBleveDocument{
		Type:          ATTACHMENT_TYPE,
		Folder:        folder,
		FileName:      fileName,
		FileNameLC:    strings.ToLower(fileName),
		FileExtension: fileExtension,
		Tags:          tags,
		CreatedDate:   createdDate,
		Size:          size,
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

// createIndex creates a new Bleve search index at the given on-disk path.
// It returns the created index or an error if the creation fails.
func createIndex(pathToIndex string) (bleve.Index, error) {
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

	index, err := createIndex(GetPathToIndex(projectPath))
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

	storedKeywordTextFieldMapping := bleve.NewTextFieldMapping()
	storedKeywordTextFieldMapping.Analyzer = "keyword"
	storedKeywordTextFieldMapping.Store = true

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
	createdDateFieldMapping := bleve.NewDateTimeFieldMapping()
	createdDateFieldMapping.Store = true
	sizeFieldMapping := bleve.NewNumericFieldMapping()
	sizeFieldMapping.Store = true

	documentMapping.AddFieldMappingsAt(FieldFolder, folderLowerFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldFileName, fileNameFieldMapping)
	// FieldFileNameLC removed - using FieldFileName for both search and display
	documentMapping.AddFieldMappingsAt(FieldFileExtension, keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldTextContent, textFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldTextContentNgram, textNgramFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldCodeContent, storedKeywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldGoCodeContent, storedKeywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldJavaCodeContent, storedKeywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldPythonCodeContent, storedKeywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldJavascriptCodeContent, storedKeywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldHasCode, bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt(FieldHasGoCode, bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt(FieldHasJavaCode, bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt(FieldHasPythonCode, bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt(FieldHasJavascriptCode, bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt(FieldTags, keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldLinks, keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldLastUpdated, lastUpdatedFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldCreatedDate, createdDateFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldSize, sizeFieldMapping)

	return documentMapping
}

// createAttachmentDocumentMapping creates a Bleve document mapping for attachments.
// It defines field mappings for all the fields in AttachmentBleveDocument to enable
// proper indexing and searching of attachment metadata.
func createAttachmentDocumentMapping() *mapping.DocumentMapping {
	keywordTextFieldMapping := bleve.NewTextFieldMapping()
	keywordTextFieldMapping.Analyzer = "keyword"

	createdDateFieldMapping := bleve.NewDateTimeFieldMapping()
	createdDateFieldMapping.Store = true
	sizeFieldMapping := bleve.NewNumericFieldMapping()
	sizeFieldMapping.Store = true

	documentMapping := bleve.NewDocumentMapping()

	// Use filename analyzer for attachments too
	attachmentFileNameFieldMapping := bleve.NewTextFieldMapping()
	attachmentFileNameFieldMapping.Analyzer = FilenameAnalyzer
	attachmentFileNameFieldMapping.Store = true

	attachmentFolderFieldMapping := bleve.NewTextFieldMapping()
	attachmentFolderFieldMapping.Analyzer = FilenameAnalyzer
	attachmentFolderFieldMapping.Store = true

	documentMapping.AddFieldMappingsAt(FieldFolder, attachmentFolderFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldFileName, attachmentFileNameFieldMapping)
	// FieldFileNameLC removed - using FieldFileName for both search and display
	documentMapping.AddFieldMappingsAt(FieldFileExtension, keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldTags, keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldCreatedDate, createdDateFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldSize, sizeFieldMapping)

	return documentMapping
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

	docInfo, err := index.Document(fileId)
	if err != nil {
		return "", err
	}

	if docInfo == nil || forceIndex {
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
	projectPath,
	folderName,
	fileName,
	fileExtension string,
	forceIndex bool,
) (string, error) {
	// For attachments, use the file path as the unique ID
	fileId := filepath.Join(folderName, fileName)
	docInfo, err := index.Document(fileId)
	if err != nil {
		return "", err
	}

	if docInfo == nil || forceIndex {
		bleveDocument := createAttachmentBleveDocument(projectPath, folderName, fileName, fileExtension)
		batch.Index(fileId, bleveDocument)
	}

	return fileId, nil
}

// IndexFilesInFolderWithBatch processes all files in a specific folder and adds them to the provided batch.
// It flushes the batch to the index when it reaches the default batch size.
// The flushCallback function is used to execute the flush operation and update the batch reference.
func IndexFilesInFolderWithBatch(
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

	// Compute project path from folder path (../.. from notes/<folder>)
	projectPath := filepath.Dir(filepath.Dir(folderPath))

	// Process all files in the folder
	files, err := os.ReadDir(folderPath)
	if err != nil {
		return err
	}

	for _, file := range files {
		// Ignore hidden files and folders.
		if strings.HasPrefix(file.Name(), ".") {
			continue
		}

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
			_, err := AddAttachmentToBatch(batch, index, projectPath, folderName, file.Name(), fileExtension, false)
			if err != nil {
				log.Printf("Error processing attachment file %s: %v", filePath, err)
				continue
			}
		}

		if batch.Size() >= DefaultBatchSize {
			if err := FlushBatch(index, batch); err != nil {
				log.Printf("Error flushing batch: %v", err)
				return err
			}
		}
	}
	return nil
}

// RegenerateSearchIndex builds a fresh search index without disturbing the
// existing one until the new one is fully populated. The new index is created
// at a sibling temp path and re-indexed; only after that succeeds does this
// function close the old index, remove its data on disk, and rename the temp
// directory into place. On any failure during build/reindex the old index is
// left untouched so the IndexHolder's existing handle remains usable.
func RegenerateSearchIndex(projectPath string, index bleve.Index) (bleve.Index, error) {
	finalPath := GetPathToIndex(projectPath)
	tempPath := finalPath + ".regen"

	// Clean up any leftover temp directory from a previous failed run.
	if exists, _ := util.FileOrFolderExists(tempPath); exists {
		if err := os.RemoveAll(tempPath); err != nil {
			return nil, err
		}
	}

	newIndex, err := createIndex(tempPath)
	if err != nil {
		return nil, err
	}

	if err := IndexAllFiles(projectPath, newIndex); err != nil {
		newIndex.Close()
		os.RemoveAll(tempPath)
		return nil, err
	}

	// New index is fully populated. Close it so we can move its directory.
	if err := newIndex.Close(); err != nil {
		os.RemoveAll(tempPath)
		return nil, err
	}

	// Commit the swap on disk: close the old index, remove its data, and
	// rename the temp directory into the final location.
	if index != nil {
		if err := index.Close(); err != nil {
			log.Printf("Error closing existing index: %v", err)
		}
	}

	if exists, _ := util.FileOrFolderExists(finalPath); exists {
		if err := os.RemoveAll(finalPath); err != nil {
			os.RemoveAll(tempPath)
			return nil, err
		}
	}

	if err := os.Rename(tempPath, finalPath); err != nil {
		return nil, err
	}

	return bleve.Open(finalPath)
}
