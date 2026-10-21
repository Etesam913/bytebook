package search

import (
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/mapping"
	"github.com/etesam913/bytebook/internal/notes"
)

const NOTE_TYPE = "note"

type NoteBleveDocument struct {
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

// CreateNoteBleveDocument constructs a NoteBleveDocument from markdown content.
// It extracts all relevant information using the markdown processing functions and populates
// the document structure for search indexing.
func CreateNoteBleveDocument(markdown, folder, fileName string) NoteBleveDocument {
	metadata := notes.ParseMarkdownMetadata(markdown)
	links := notes.GetInternalLinksFromBody(markdown)
	textContent := notes.GetTextContent(markdown)
	code := metadata.Code
	return NoteBleveDocument{
		Type:                  NOTE_TYPE,
		Folder:                folder,
		FileName:              fileName,
		FileNameLC:            strings.ToLower(fileName),
		FileExtension:         ".md",
		TextContent:           textContent,
		TextContentNgram:      textContent,
		CodeContent:           code.All,
		GoCodeContent:         code.Go,
		JavaCodeContent:       code.Java,
		PythonCodeContent:     code.Python,
		JavascriptCodeContent: code.JavaScript,
		HasCode:               code.HasLanguage,
		HasGoCode:             code.HasGo,
		HasJavaCode:           code.HasJava,
		HasPythonCode:         code.HasPython,
		HasJavascriptCode:     code.HasJavaScript,
		Tags:                  metadata.Tags,
		Links:                 links,
		LastUpdated:           metadata.LastUpdated,
		CreatedDate:           metadata.CreatedDate,
		Size:                  int64(len([]byte(markdown))),
	}
}

// createNoteDocumentMapping creates a Bleve document mapping for notes.
// It defines field mappings for all the fields in NoteBleveDocument to enable
// proper indexing and searching of note content.
func createNoteDocumentMapping() *mapping.DocumentMapping {
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
