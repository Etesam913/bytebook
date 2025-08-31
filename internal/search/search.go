package search

import (
	"errors"
	"regexp"
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/search/query"
	"github.com/etesam913/bytebook/internal/util"
)

// createPrefixQuery returns a case-insensitive prefix query targeting the specified field.
// The provided prefix is lowercased to ensure case-insensitive behavior.
func createPrefixQuery(field, prefix string) query.Query {
	normalizedPrefix := strings.ToLower(prefix)
	q := bleve.NewPrefixQuery(normalizedPrefix)
	q.SetField(field)
	return q
}

// createExactQuery returns a phrase query for exact matching in the specified field.
func createExactQuery(field, phrase string, boost float64) query.Query {
	q := bleve.NewMatchPhraseQuery(phrase)
	q.SetField(field)
	q.SetBoost(boost)
	return q
}

// createMatchQuery returns a match query for the specified field and term.
func createMatchQuery(field, term string, boost float64) query.Query {
	q := bleve.NewMatchQuery(term)
	q.SetField(field)
	q.SetBoost(boost)
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
// Special characters like parentheses are preserved within tokens.
// Example: input `"foo bar" baz` yields tokens: [{foo bar true}, {baz false}]
// Example: input `func()` yields tokens: [{func() false}]
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
				booleanQuery.AddMust(createPrefixQuery(FieldFolder, prefixTermSplit[0]))
				booleanQuery.AddMust(createPrefixQuery(FieldFileNameLC, prefixTermSplit[1]))
			} else {
				newBooleanQuery := bleve.NewBooleanQuery()
				newBooleanQuery.AddShould(createPrefixQuery(FieldFolder, prefixTerm))
				newBooleanQuery.AddShould(createPrefixQuery(FieldFileNameLC, prefixTerm))
				booleanQuery.AddMust(newBooleanQuery)
			}
		} else if token.IsExact {
			// Exact phrase search in both text and code content
			contentQuery := bleve.NewBooleanQuery()
			contentQuery.AddShould(createExactQuery(FieldTextContent, token.Text, 1.0))
			contentQuery.AddShould(createExactQuery(FieldCodeContent, token.Text, 1.0))
			booleanQuery.AddMust(contentQuery)
		} else {
			contentQuery := bleve.NewBooleanQuery()

			// We want exact matches to rank higher
			exactQuery := createMatchQuery(
				FieldTextContent,
				token.Text,
				2.0,
			)
			nGramQuery := createMatchQuery(
				FieldTextContentNgram,
				token.Text,
				1.0,
			)

			contentQuery.AddShould(exactQuery)
			contentQuery.AddShould(nGramQuery)

			// contentQuery.AddShould(createMatchQuery(FieldCodeContent, token.Text))
			booleanQuery.AddMust(contentQuery)
		}
	}
	return booleanQuery
}

// CreateSearchRequest creates a search request with common options
// used by the application (fields, size, and highlighting for text_content and code_content).
func CreateSearchRequest(q query.Query) *bleve.SearchRequest {
	req := bleve.NewSearchRequest(q)
	req.Fields = []string{FieldFolder, FieldFileName, FieldLastUpdated}
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
