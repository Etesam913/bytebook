package search

import (
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/search/query"
	"github.com/etesam913/bytebook/internal/util"
)

// CreateSearchRequest creates a search request with common options
// used by the application (fields, size, and highlighting for text_content and code_content).
func CreateSearchRequest(q query.Query) *bleve.SearchRequest {
	req := bleve.NewSearchRequest(q)
	req.Fields = []string{FieldFolder, FieldFileName, FieldLastUpdated, FieldCreatedDate, FieldTags}
	req.Size = 50
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

// ProcessDocumentSearchResults converts Bleve search results into SearchResult structs
// for frontend consumption. It extracts folder, file_name, last_updated fields
// and highlight fragments from the search hits.
func ProcessDocumentSearchResults(searchResult *bleve.SearchResult) []SearchResult {
	if searchResult == nil {
		return []SearchResult{}
	}

	results := []SearchResult{}

	for _, hit := range searchResult.Hits {
		folder, folderOk := hit.Fields[FieldFolder].(string)
		fileName, fileNameOk := hit.Fields[FieldFileName].(string)
		if !folderOk || !fileNameOk {
			continue
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

		// extract tags from search result
		tags := []string{}
		if tagsField, ok := hit.Fields[FieldTags]; ok {
			fmt.Println("tagsField: ", tagsField)
			fmt.Printf("Type of Tags field: %T\n", tagsField)
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

		// collect highlight fragments for text_content and code_content with deduplication
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

		results = append(results, SearchResult{
			Title:       fileName,
			Folder:      folder,
			Note:        fileName,
			LastUpdated: lastUpdated,
			Created:     created,
			Tags:        tags,
			Highlights:  highlights,
		})
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
		return []string{}, errors.New("failed to get tags")
	}

	terms := facetResult.Terms.Terms()
	tags := make([]string, 0, len(terms))
	for _, t := range terms {
		tags = append(tags, t.Term)
	}
	return tags, nil
}
