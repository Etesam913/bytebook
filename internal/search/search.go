package search

import (
	"regexp"
	"strings"

	"github.com/blevesearch/bleve/v2"
	blevesearch "github.com/blevesearch/bleve/v2/search"
	"github.com/blevesearch/bleve/v2/search/query"
	"github.com/etesam913/bytebook/internal/util"
)

// CreateSearchRequest creates a search request with common options
// used by the application (fields, size, and highlighting for text_content and code_content).
func CreateSearchRequest(q query.Query, limit int) *bleve.SearchRequest {
	req := bleve.NewSearchRequest(q)
	req.Fields = []string{FieldType, FieldFolder, FieldFileName, FieldLastUpdated, FieldCreatedDate, FieldTags}
	req.Size = limit
	req.IncludeLocations = true
	req.Highlight = bleve.NewHighlightWithStyle("html")
	if req.Highlight != nil {
		req.Highlight.Fields = HIGHLIGHT_FIELDS
	}
	return req
}

// HighlightResult represents a single highlight with its type
type HighlightResult struct {
	Content         string `json:"content"`
	IsCode          bool   `json:"isCode"`
	HighlightedTerm string `json:"highlightedTerm"`
}

// SearchResult represents one search hit returned to the frontend
type SearchResult struct {
	Type        string            `json:"type"`
	Title       string            `json:"title"`
	Folder      string            `json:"folder"`
	Note        string            `json:"note"`
	LastUpdated string            `json:"lastUpdated"`
	Created     string            `json:"created"`
	Tags        []string          `json:"tags"`
	Highlights  []HighlightResult `json:"highlights"`
}

// hasHighlightContent checks if a fragment contains actual highlighted content
func hasHighlightContent(fragment string) bool {
	return strings.Contains(fragment, "<mark>") || strings.Contains(fragment, "<em>")
}

// extractHighlightedText extracts the text content from the first <mark> or <em> tag in a fragment.
// Returns the text from the first highlighted portion, or empty string if none found.
func extractHighlightedText(fragment string) string {
	// Regex to match content inside <mark> or <em> tags
	re := regexp.MustCompile(`<(?:mark|em)>(.*?)</(?:mark|em)>`)
	match := re.FindStringSubmatch(fragment)

	if len(match) > 1 {
		return match[1]
	}

	return ""
}

// extractMarkdownNoteFields extracts markdown note-specific fields (tags, lastUpdated, created) from a search hit
func extractMarkdownNoteFields(hit *blevesearch.DocumentMatch) ([]string, string, string) {
	// extract tags from search result
	var tags []string
	if tagsField, ok := hit.Fields[FieldTags]; ok {
		switch t := tagsField.(type) {
		case []interface{}:
			for _, tag := range t {
				if tagStr, ok := tag.(string); ok {
					tags = append(tags, tagStr)
				}
			}
		case []string:
			tags = t
		case string:
			tags = []string{t}
		}
	}

	// last_updated is stored as a datetime; retrieve as string if present
	lastUpdated := ""
	if lu, ok := hit.Fields[FieldLastUpdated]; ok {
		switch t := lu.(type) {
		case string:
			lastUpdated = t
		default:
			lastUpdated = ""
		}
	}

	// created date is stored as a datetime; retrieve as string if present
	created := ""
	if cd, ok := hit.Fields[FieldCreatedDate]; ok {
		switch t := cd.(type) {
		case string:
			created = t
		default:
			created = ""
		}
	}

	return tags, lastUpdated, created
}

// extractHighlights extracts highlight fragments from a search hit
func extractHighlights(hit *blevesearch.DocumentMatch) []HighlightResult {
	highlights := []HighlightResult{}
	seen := util.Set[string]{}

	if hit.Fragments != nil {
		// Process highlights for all highlight fields
		for _, field := range HIGHLIGHT_FIELDS {
			if frags, ok := hit.Fragments[field]; ok {
				for _, frag := range frags {
					if !seen.Has(frag) {
						seen.Add(frag)
						if hasHighlightContent(frag) {
							highlights = append(highlights, HighlightResult{
								Content:         frag,
								IsCode:          field == FieldCodeContent,
								HighlightedTerm: extractHighlightedText(frag),
							})
						}
					}
				}
			}
		}
	}

	return highlights
}

// processMarkdownNoteResult processes a markdown note search hit
func processMarkdownNoteResult(hit *blevesearch.DocumentMatch) *SearchResult {
	folder, folderOk := hit.Fields[FieldFolder].(string)
	if !folderOk {
		return nil
	}

	fileName, fileNameOk := hit.Fields[FieldFileName].(string)
	if !fileNameOk {
		return nil
	}

	tags, lastUpdated, created := extractMarkdownNoteFields(hit)
	highlights := extractHighlights(hit)

	return &SearchResult{
		Type:        MARKDOWN_NOTE_TYPE,
		Title:       fileName,
		Folder:      folder,
		Note:        fileName,
		LastUpdated: lastUpdated,
		Created:     created,
		Tags:        tags,
		Highlights:  highlights,
	}
}

// processAttachmentResult processes an attachment search hit
func processAttachmentResult(hit *blevesearch.DocumentMatch) *SearchResult {
	folder, folderOk := hit.Fields[FieldFolder].(string)
	if !folderOk {
		return nil
	}

	fileName, fileNameOk := hit.Fields[FieldFileName].(string)
	if !fileNameOk {
		return nil
	}

	highlights := extractHighlights(hit)

	return &SearchResult{
		Type:        ATTACHMENT_TYPE,
		Title:       fileName,
		Folder:      folder,
		Note:        fileName,
		LastUpdated: "",         // Attachments don't have lastUpdated
		Created:     "",         // Attachments don't have created date
		Tags:        []string{}, // Attachments don't have tags
		Highlights:  highlights,
	}
}

// processFolderResult processes a folder search hit
func processFolderResult(hit *blevesearch.DocumentMatch) *SearchResult {
	folder, folderOk := hit.Fields[FieldFolder].(string)
	if !folderOk {
		return nil
	}

	highlights := extractHighlights(hit)

	// Folders don't have file names, so use folder name as title
	return &SearchResult{
		Type:        FOLDER_TYPE,
		Title:       folder,
		Folder:      folder,
		Note:        "",         // Folders don't have note files
		LastUpdated: "",         // Folders don't have lastUpdated
		Created:     "",         // Folders don't have created date
		Tags:        []string{}, // Folders don't have tags
		Highlights:  highlights,
	}
}

// ProcessDocumentSearchResults converts Bleve search results into SearchResult structs
// for frontend consumption. It extracts type, folder, file_name, last_updated fields
// and highlight fragments from the search hits.
func ProcessDocumentSearchResults(searchResult *bleve.SearchResult) []SearchResult {
	if searchResult == nil {
		return []SearchResult{}
	}

	results := []SearchResult{}

	for _, hit := range searchResult.Hits {
		// Extract document type (markdown_note, attachment, or folder)
		docType := ""
		if typeField, ok := hit.Fields[FieldType]; ok {
			if typeStr, ok := typeField.(string); ok {
				docType = typeStr
			}
		}

		var result *SearchResult

		switch docType {
		case MARKDOWN_NOTE_TYPE:
			result = processMarkdownNoteResult(hit)
		case ATTACHMENT_TYPE:
			result = processAttachmentResult(hit)
		case FOLDER_TYPE:
			result = processFolderResult(hit)
		default:
			// Unknown type, skip
			continue
		}

		if result != nil {
			results = append(results, *result)
		}
	}

	return results
}

var TAGS_SEARCH_LIMIT = 1000

// GetTags retrieves a list of all unique tags from the search index.
// It performs a faceted search on the "tags" field and returns the tags
// as a slice of strings in the response data. If the search fails or no
// facet result is found, it returns an error response.
func GetTags(searchIndex bleve.Index) ([]string, error) {
	searchRequest := bleve.NewSearchRequest(bleve.NewMatchAllQuery())
	searchRequest.Size = 0

	// Create a terms facet on field "tags"
	facetRequest := bleve.NewFacetRequest(FieldTags, TAGS_SEARCH_LIMIT)
	searchRequest.AddFacet(FieldTags, facetRequest)

	searchResult, err := searchIndex.Search(searchRequest)
	if err != nil {
		return []string{}, err
	}

	facetResult := searchResult.Facets[FieldTags]
	if facetResult == nil {
		// No tags in the index yet, return empty array
		return []string{}, nil
	}

	terms := facetResult.Terms.Terms()
	if terms == nil {
		// No terms found, return empty array
		return []string{}, nil
	}

	tags := make([]string, 0, len(terms))
	for _, t := range terms {
		tags = append(tags, t.Term)
	}
	return tags, nil
}
