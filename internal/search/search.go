package search

import (
	"path/filepath"

	"github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/mapping"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/util"
)

var INDEX_NAME = ".index.bleve"
var MARKDOWN_NOTE_TYPE = "markdown_note"
var ATTACHMENT_TYPE = "attachment"

type MarkdownNoteBleveDocument struct {
	Folder                string
	FileName              string
	FileExtension         string
	TextContent           string
	CodeContent           []string
	GoCodeContent         []string
	JavaCodeContent       []string
	PythonCodeContent     []string
	JavaScriptCodeContent []string
	HasDrawing            bool
	HasCode               bool
	HasGoCode             bool
	HasJavaCode           bool
	HasPythonCode         bool
	HasJavaScriptCode     bool
	LastUpdated           string
	CreatedDate           string
}

type AttachmentBleveDocument struct {
	FileName      string
	FileExtension string
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
		JavaScriptCodeContent: notes.GetJavaScriptCodeContent(markdown),
		HasDrawing:            notes.HasDrawing(markdown),
		HasCode:               notes.HasCode(markdown),
		HasGoCode:             notes.HasGoCode(markdown),
		HasJavaCode:           notes.HasJavaCode(markdown),
		HasPythonCode:         notes.HasPythonCode(markdown),
		HasJavaScriptCode:     notes.HasJavaScriptCode(markdown),
		LastUpdated:           lastUpdated,
		CreatedDate:           createdDate,
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

	documentMapping.AddFieldMappingsAt("folder", keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt("file_name", keywordTextFieldMapping)
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
	documentMapping.AddFieldMappingsAt("last_updated", bleve.NewDateTimeFieldMapping())
	documentMapping.AddFieldMappingsAt("created_date", bleve.NewDateTimeFieldMapping())

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
