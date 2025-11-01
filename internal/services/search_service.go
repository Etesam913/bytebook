package services

import (
	"log"
	"path/filepath"
	"sort"
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/search"
)

type SearchService struct {
	ProjectPath string
	SearchIndex bleve.Index
}

func (s *SearchService) FullTextSearch(searchQuery string) []search.SearchResult {
	// Build the boolean query and request using helpers for clarity
	totalQuery := search.BuildBooleanQueryFromUserInput(searchQuery, 1)
	request := search.CreateSearchRequest(totalQuery)

	res, err := s.SearchIndex.Search(request)
	if err != nil {
		log.Println("full text search failed:", err)
		return []search.SearchResult{}
	}

	return search.ProcessDocumentSearchResults(res)
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

// GetAllSavedSearches returns all saved searches for the project
func (s *SearchService) GetAllSavedSearches() (config.BackendResponseWithData[[]search.SavedSearch], error) {
	searches, err := search.GetAllSavedSearches(s.ProjectPath)
	if err != nil {
		return config.BackendResponseWithData[[]search.SavedSearch]{
			Success: false,
			Message: err.Error(),
			Data:    nil,
		}, nil
	}

	return config.BackendResponseWithData[[]search.SavedSearch]{
		Success: true,
		Message: "Successfully retrieved saved searches",
		Data:    searches,
	}, nil
}

// AddSavedSearch adds a new saved search to the project
func (s *SearchService) AddSavedSearch(name, query string) config.BackendResponseWithoutData {
	err := search.AddSavedSearch(s.ProjectPath, name, query)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: err.Error(),
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully added saved search",
	}
}

// RemoveSavedSearch removes a saved search from the project
func (s *SearchService) RemoveSavedSearch(name string) config.BackendResponseWithoutData {
	err := search.RemoveSavedSearch(s.ProjectPath, name)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: err.Error(),
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully removed saved search",
	}
}

// RegenerateSearchIndex regenerates the search index by deleting the existing index
// and creating a new one with all files re-indexed.
// It updates the SearchService's SearchIndex field with the new index.
func (s *SearchService) RegenerateSearchIndex() config.BackendResponseWithoutData {
	newIndex, err := search.RegenerateSearchIndex(s.ProjectPath, s.SearchIndex)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: err.Error(),
		}
	}

	// Update the service's index reference
	s.SearchIndex = newIndex

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully regenerated search index",
	}
}
