package services

import (
	"path/filepath"
	"sort"
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/search"
)

type SearchService struct {
	ProjectPath string
	SearchIndex bleve.Index
}

// SearchResult represents one search hit returned to the frontend
type SearchResult struct {
	Title       string   `json:"title"`
	Path        string   `json:"path"`
	LastUpdated string   `json:"lastUpdated"`
	Highlights  []string `json:"highlights"`
}

func (s *SearchService) FullTextSearch(searchQuery string) []SearchResult {
	totalQuery := bleve.NewBooleanQuery()
	queryFields := strings.Fields(searchQuery)

	for _, field := range queryFields {
		if strings.HasPrefix(field, "f:") {
			// Case-insensitive file name prefix: use lowercased field
			prefix := strings.ToLower(field[2:])
			fileQuery := bleve.NewPrefixQuery(prefix)
			fileQuery.SetField("file_name_lc")
			totalQuery.AddMust(fileQuery)
		} else {
			// For multi-word queries like "service communication", use a MatchPhraseQuery for exact phrase
			if strings.Contains(field, " ") {
				phraseQuery := bleve.NewMatchPhraseQuery(field)
				phraseQuery.SetField("text_content")
				totalQuery.AddMust(phraseQuery)
			} else {
				matchQuery := bleve.NewMatchQuery(field)
				matchQuery.SetField("text_content")
				totalQuery.AddMust(matchQuery)
			}
		}
	}

	request := bleve.NewSearchRequest(totalQuery)
	request.Fields = []string{"folder", "file_name", "last_updated"}
	// Return a reasonable number of results and enable highlighting for text content
	request.Size = 50
	request.Highlight = bleve.NewHighlightWithStyle("html")
	if request.Highlight != nil {
		request.Highlight.Fields = []string{"text_content"}
	}

	res, err := s.SearchIndex.Search(request)
	if err != nil {
		return []SearchResult{}
	}

	searchResults := []SearchResult{}

	for _, hit := range res.Hits {
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

		// collect highlight fragments for text_content
		highlights := []string{}
		if hit.Fragments != nil {
			if frags, ok := hit.Fragments["text_content"]; ok {
				highlights = append(highlights, frags...)
			}
		}

		searchResults = append(searchResults, SearchResult{
			Title:       title,
			Path:        path,
			LastUpdated: lastUpdated,
			Highlights:  highlights,
		})
	}

	return searchResults
}

// Uses the JaroWinklerSimilarity algorithm to rank file names based on their similarity to the search query.
func (s *SearchService) SearchFileNamesFromQuery(searchQuery string) []string {
	notesPath := filepath.Join(s.ProjectPath, "notes")
	lowerSearchQuery := strings.ToLower(searchQuery)

	filePathsChannel := search.GetNoteNamesStream(notesPath)

	// Ignore results less than similarity threshold
	similarityThreshold := 0.7

	type searchResult struct {
		shortenedNotePath string
		similarity        float64
	}
	// TODO: Convert this to a heap of max size 7 to limit excess space
	searchResults := []searchResult{}

	// Collecting all the search results
	for filePath := range filePathsChannel {
		segments := strings.Split(filePath, "/")
		folder := segments[len(segments)-2]
		note := segments[len(segments)-1]
		noteSimilarity := search.JaroWinklerSimilarity(lowerSearchQuery, strings.ToLower(note))
		folderSimilarity := search.JaroWinklerSimilarity(lowerSearchQuery, strings.ToLower(folder))

		if len(segments) < 2 {
			continue
		}

		// Only keep results that are similar enough
		if noteSimilarity >= similarityThreshold || folderSimilarity >= similarityThreshold {
			searchResults = append(searchResults, searchResult{
				shortenedNotePath: folder + "/" + note,
				similarity:        noteSimilarity,
			})
		}

	}

	// Sort the results descending via similarity so that most relevant results show first
	sort.Slice(searchResults, func(i, j int) bool {
		return searchResults[i].similarity > searchResults[j].similarity
	})

	searchResultsWithoutSimilarity := []string{}

	for _, result := range searchResults {
		searchResultsWithoutSimilarity = append(searchResultsWithoutSimilarity, result.shortenedNotePath)
	}

	return searchResultsWithoutSimilarity
}
