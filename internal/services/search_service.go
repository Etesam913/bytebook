package services

import (
	"log"
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
)

type SearchService struct {
	ProjectPath string
	SearchIndex bleve.Index
}

// FilePickerSearchResult represents a search hit returned to the editor's @ mention picker.
type FilePickerSearchResult struct {
	Type   string `json:"type"`
	Folder string `json:"folder"`
	Note   string `json:"note,omitempty"`
}

func (s *SearchService) FullTextSearch(searchQuery string) []search.SearchResult {
	// Build the boolean query and request using helpers for clarity
	totalQuery := search.BuildBooleanQueryFromUserInput(searchQuery, 1)
	request := search.CreateSearchRequest(totalQuery, 10000)

	res, err := s.SearchIndex.Search(request)
	if err != nil {
		log.Println("full text search failed:", err)
		return []search.SearchResult{}
	}

	return search.ProcessDocumentSearchResults(res)
}

// SearchFileNamesFromQuery performs a fuzzy filename search using the Bleve index.
// It reuses the filename query logic from the search package to align editor @ mentions
// with the backend search experience and now returns both files and folders.
func (s *SearchService) SearchFileNamesFromQuery(searchQuery string) []FilePickerSearchResult {
	normalizedQuery := strings.ToLower(strings.TrimSpace(searchQuery))
	filenameQuery := search.CreateFilenameQuery(normalizedQuery, 1.0)
	searchRequest := search.CreateSearchRequest(filenameQuery, 20)

	results, err := s.SearchIndex.Search(searchRequest)
	if err != nil {
		log.Println("filename search failed:", err)
		return []FilePickerSearchResult{}
	}

	searchResults := []FilePickerSearchResult{}
	seen := make(util.Set[string])

	for _, hit := range results.Hits {
		docType, _ := hit.Fields[search.FieldType].(string)
		folder, _ := hit.Fields[search.FieldFolder].(string)
		fileName, _ := hit.Fields[search.FieldFileName].(string)

		switch docType {
		case search.FOLDER_TYPE:
			if folder == "" {
				continue
			}
			key := docType + ":" + folder
			if exists := seen.Has(key); exists {
				continue
			}
			seen.Add(key)
			searchResults = append(searchResults, FilePickerSearchResult{
				Type:   docType,
				Folder: folder,
			})
		default:
			if folder == "" || fileName == "" {
				continue
			}

			key := docType + ":" + folder + "/" + fileName
			if exists := seen.Has(key); exists {
				continue
			}
			seen[key] = struct{}{}

			searchResults = append(searchResults, FilePickerSearchResult{
				Type:   docType,
				Folder: folder,
				Note:   fileName,
			})
		}
	}

	return searchResults
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
