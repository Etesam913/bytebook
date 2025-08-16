package search

import (
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/blevesearch/bleve/v2"
	_ "github.com/blevesearch/bleve/v2/analysis/analyzer/keyword"
	_ "github.com/blevesearch/bleve/v2/analysis/analyzer/simple"
	_ "github.com/blevesearch/bleve/v2/analysis/lang/en"
	"github.com/blevesearch/bleve/v2/mapping"
	"github.com/blevesearch/bleve/v2/search/query"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/util"
)

// Bump index name to force reindex when mappings change
var INDEX_NAME = ".index.v6.bleve"
var MARKDOWN_NOTE_TYPE = "markdown_note"
var ATTACHMENT_TYPE = "attachment"

type MarkdownNoteBleveDocument struct {
	Type                  string   `json:"type"`
	Folder                string   `json:"folder"`
	FileName              string   `json:"file_name"`
	FileNameLC            string   `json:"file_name_lc"`
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
	Type          string `json:"type"`
	FileName      string `json:"file_name"`
	FileNameLC    string `json:"file_name_lc"`
	FileExtension string `json:"file_extension"`
}

// CreateMarkdownNoteBleveDocument constructs a MarkdownNoteBleveDocument from markdown content.
// It extracts all relevant information using the markdown processing functions and populates
// the document structure for search indexing.
func CreateMarkdownNoteBleveDocument(markdown, folder, fileName string) MarkdownNoteBleveDocument {
	lastUpdated, _ := notes.GetLastUpdatedFromFrontmatter(markdown)
	createdDate, _ := notes.GetCreatedDateFromFrontmatter(markdown)

	return MarkdownNoteBleveDocument{
		Type:                  MARKDOWN_NOTE_TYPE,
		Folder:                folder,
		FileName:              fileName,
		FileNameLC:            strings.ToLower(fileName),
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
		Type:          ATTACHMENT_TYPE,
		FileName:      fileName,
		FileNameLC:    strings.ToLower(fileName),
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

	// Use the "type" field in documents to select the document mapping
	indexMapping.TypeField = "type"
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

	// Use simple analyzer for text content - it preserves word boundaries without stemming,
	// making it suitable for both fuzzy and exact phrase matching
	textFieldMapping := bleve.NewTextFieldMapping()
	textFieldMapping.Analyzer = "simple"

	keywordTextFieldMapping := bleve.NewTextFieldMapping()
	keywordTextFieldMapping.Analyzer = "keyword"

	// Set store = true for folder
	storedKeywordMapping := bleve.NewTextFieldMapping()
	storedKeywordMapping.Analyzer = "simple"
	storedKeywordMapping.Store = true

	// file_name should use keyword analyzer to preserve punctuation and spaces
	fileNameFieldMapping := bleve.NewTextFieldMapping()
	fileNameFieldMapping.Analyzer = "keyword"
	fileNameFieldMapping.Store = true

	// file_name_lc stores a lowercased copy for case-insensitive prefix queries
	fileNameLowerFieldMapping := bleve.NewTextFieldMapping()
	fileNameLowerFieldMapping.Analyzer = "keyword"
	fileNameLowerFieldMapping.Store = false

	// Set store = true for last_updated
	lastUpdatedFieldMapping := bleve.NewDateTimeFieldMapping()
	lastUpdatedFieldMapping.Store = true

	documentMapping.AddFieldMappingsAt("folder", storedKeywordMapping)
	documentMapping.AddFieldMappingsAt("file_name", fileNameFieldMapping)
	documentMapping.AddFieldMappingsAt("file_name_lc", fileNameLowerFieldMapping)
	documentMapping.AddFieldMappingsAt("file_extension", keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt("text_content", textFieldMapping)
	documentMapping.AddFieldMappingsAt("code_content", keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt("go_code_content", keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt("java_code_content", keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt("python_code_content", keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt("javascript_code_content", keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt("has_drawing", bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt("has_code", bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt("has_go_code", bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt("has_java_code", bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt("has_python_code", bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt("has_javascript_code", bleve.NewBooleanFieldMapping())
	documentMapping.AddFieldMappingsAt("last_updated", lastUpdatedFieldMapping)
	documentMapping.AddFieldMappingsAt("created_date", bleve.NewDateTimeFieldMapping())

	return documentMapping
}

// CreatePrefixQuery returns a case-insensitive prefix query targeting the specified field.
// The provided prefix is lowercased to ensure case-insensitive behavior.
func CreatePrefixQuery(field, prefix string) query.Query {
	normalizedPrefix := strings.ToLower(prefix)
	q := bleve.NewPrefixQuery(normalizedPrefix)
	q.SetField(field)
	return q
}

// CreateFuzzyQuery returns a fuzzy query over the specified field.
// The term is lowercased and the provided fuzziness value is applied.
func CreateFuzzyQuery(field, term string, fuzziness int) query.Query {
	normalizedTerm := strings.ToLower(term)
	q := bleve.NewFuzzyQuery(normalizedTerm)
	q.SetField(field)
	q.SetFuzziness(fuzziness)
	return q
}

// CreateExactQuery returns a phrase query for exact matching in the specified field.
func CreateExactQuery(field, phrase string) query.Query {
	q := bleve.NewMatchPhraseQuery(phrase)
	q.SetField(field)
	return q
}

// SearchToken represents a parsed search token with metadata
type SearchToken struct {
	Text    string
	IsExact bool // true if the token was in quotes for exact matching
}

// parseTokens splits the input string into a slice of SearchToken,
// handling quoted phrases as exact matches and unquoted words as fuzzy tokens.
// Quoted phrases (enclosed in double quotes) are treated as exact matches (IsExact=true).
// Unquoted words are split by spaces and treated as non-exact (IsExact=false).
// Example: input `"foo bar" baz` yields tokens: [{foo bar true}, {baz false}]
func parseTokens(input string) []SearchToken {
	tokens := []SearchToken{}
	curToken := strings.Builder{}
	inQuotes := false
	for _, char := range input {
		if char == '"' {
			inQuotes = !inQuotes
			// end of quotes
			if !inQuotes {
				tokens = append(tokens, SearchToken{
					Text:    curToken.String(),
					IsExact: true,
				})
				curToken.Reset()
			}
		} else {
			if inQuotes {
				curToken.WriteRune(char)
			} else {
				if char == ' ' {
					// Only append non-empty tokens
					if curToken.Len() > 0 {
						tokens = append(tokens, SearchToken{
							Text:    curToken.String(),
							IsExact: false,
						})
						curToken.Reset()
					}
				} else {
					curToken.WriteRune(char)
				}
			}
		}
	}
	// Append the last token if not empty and not in quotes
	if curToken.Len() > 0 && !inQuotes {
		tokens = append(tokens, SearchToken{
			Text:    curToken.String(),
			IsExact: false,
		})
	}
	return tokens
}

// BuildBooleanQueryFromUserInput builds a boolean query from a user input string.
// Tokens prefixed with "f:" are treated as filename prefixes; tokens with quotes are exact matches;
// all others query text content and code content with fuzzy matching.
func BuildBooleanQueryFromUserInput(input string, fuzziness int) query.Query {
	booleanQuery := bleve.NewBooleanQuery()
	tokens := parseTokens(input)

	for _, token := range tokens {
		if strings.HasPrefix(token.Text, "f:") {
			// Filename prefix query
			prefixTerm := token.Text[2:]
			prefixTermSplit := strings.Split(prefixTerm, "/")
			if len(prefixTermSplit) > 1 {
				booleanQuery.AddMust(CreatePrefixQuery("folder", prefixTermSplit[0]))
				booleanQuery.AddMust(CreatePrefixQuery("file_name_lc", prefixTermSplit[1]))
			} else {
				newBooleanQuery := bleve.NewBooleanQuery()
				newBooleanQuery.AddShould(CreatePrefixQuery("folder", prefixTerm))
				newBooleanQuery.AddShould(CreatePrefixQuery("file_name_lc", prefixTerm))
				booleanQuery.AddMust(newBooleanQuery)
			}
		} else if token.IsExact {
			// Exact phrase search in both text and code content
			contentQuery := bleve.NewBooleanQuery()
			contentQuery.AddShould(CreateExactQuery("text_content", token.Text))
			contentQuery.AddShould(CreateExactQuery("code_content", token.Text))
			booleanQuery.AddMust(contentQuery)
		} else {
			// Fuzzy search in both text and code content
			contentQuery := bleve.NewBooleanQuery()
			contentQuery.AddShould(CreatePrefixQuery("text_content", token.Text))
			contentQuery.AddShould(CreatePrefixQuery("code_content", token.Text))
			booleanQuery.AddMust(contentQuery)
		}
	}
	return booleanQuery
}

// CreateSearchRequestWithStandardOptions creates a search request with common options
// used by the application (fields, size, and highlighting for text_content and code_content).
func CreateSearchRequestWithStandardOptions(q query.Query) *bleve.SearchRequest {
	req := bleve.NewSearchRequest(q)
	req.Fields = []string{"folder", "file_name", "last_updated"}
	req.Size = 50
	req.Highlight = bleve.NewHighlightWithStyle("html")
	if req.Highlight != nil {
		req.Highlight.Fields = []string{"text_content", "code_content"}
	}
	return req
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
	searchRequest.Fields = []string{"last_updated"} // Request specific field
	searchResult, err := index.Search(searchRequest)

	if err != nil || searchResult.Total == 0 {
		return DocumentIndexInfo{Exists: false}
	}

	// Since Size=1, if Total > 0, there's exactly one hit at index 0
	hit := searchResult.Hits[0]
	lastUpdated := ""

	if indexedLastUpdated, exists := hit.Fields["last_updated"]; exists {
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

	fileId := filepath.Join(folderName, fileName+".md")

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

// HighlightResult represents a single highlight with its type
type HighlightResult struct {
	Content string `json:"content"`
	IsCode  bool   `json:"isCode"`
}

// SearchResult represents one search hit returned to the frontend
type SearchResult struct {
	Title       string            `json:"title"`
	Path        string            `json:"path"`
	LastUpdated string            `json:"lastUpdated"`
	Highlights  []HighlightResult `json:"highlights"`
}

// hasHighlightContent checks if a fragment contains actual highlighted content
func hasHighlightContent(fragment string) bool {
	return strings.Contains(fragment, "<mark>") || strings.Contains(fragment, "<em>")
}

// ProcessDocumentSearchResults converts Bleve search results into SearchResult structs
// for frontend consumption. It extracts folder, file_name, last_updated fields
// and highlight fragments from the search hits.
func ProcessDocumentSearchResults(searchResult *bleve.SearchResult) []SearchResult {
	if searchResult == nil {
		return []SearchResult{}
	}

	results := []SearchResult{}

	for _, hit := range searchResult.Hits {
		folder, folderOk := hit.Fields["folder"]
		fileName, fileNameOk := hit.Fields["file_name"]
		if !folderOk || !fileNameOk {
			continue
		}

		// title is the file name; path is folder/file_name
		title := fileName.(string)
		path := folder.(string) + "/" + fileName.(string)

		// last_updated is stored as a datetime; retrieve as string if present
		lastUpdated := ""
		if lu, ok := hit.Fields["last_updated"]; ok {
			switch t := lu.(type) {
			case string:
				lastUpdated = t
			default:
				lastUpdated = ""
			}
		}

		// collect highlight fragments for text_content and code_content
		highlights := []HighlightResult{}
		if hit.Fragments != nil {
			// Process text_content highlights
			if frags, ok := hit.Fragments["text_content"]; ok {
				for _, frag := range frags {
					if hasHighlightContent(frag) {
						highlights = append(highlights, HighlightResult{
							Content: frag,
							IsCode:  false,
						})
					}
				}
			}
			// Process code_content highlights
			if frags, ok := hit.Fragments["code_content"]; ok {
				for _, frag := range frags {
					if hasHighlightContent(frag) {
						highlights = append(highlights, HighlightResult{
							Content: frag,
							IsCode:  true,
						})
					}
				}
			}
		}

		results = append(results, SearchResult{
			Title:       title,
			Path:        path,
			LastUpdated: lastUpdated,
			Highlights:  highlights,
		})
	}

	return results
}
