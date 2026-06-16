package services

import (
	"log"
	"strconv"
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/events"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
)

type SearchService struct {
	ProjectPath string
	Index       *search.IndexHolder
}

func buildSearchAfterFromHit(sortValues []string, score float64, docID string) []string {
	if len(sortValues) >= 2 && sortValues[0] == "_score" {
		// Bleve returns "_score" as a sentinel in hit.Sort for score sorting.
		// SearchAfter needs the concrete score value for stable cursor pagination.
		return []string{strconv.FormatFloat(score, 'g', -1, 64), docID}
	}
	return append([]string{}, sortValues...)
}

// FilePickerSearchResult represents a search hit returned to the editor's @ mention picker.
type FilePickerSearchResult struct {
	Type   string `json:"type"`
	Folder string `json:"folder"`
	Note   string `json:"note,omitempty"`
}

// LinkedMention is a single note that links to a queried note.
type LinkedMention struct {
	Folder string `json:"folder"`
	Note   string `json:"note"`
}

func buildEncodedNoteURLPath(pathToNote string) string {
	trimmed := strings.Trim(pathToNote, "/")
	if trimmed == "" {
		return ""
	}

	encodedSegments := make([]string, 0, len(strings.Split(trimmed, "/")))
	for _, segment := range strings.Split(trimmed, "/") {
		if segment == "" {
			continue
		}
		encodedSegments = append(encodedSegments, events.EncodeLinkSegment(segment))
	}

	if len(encodedSegments) == 0 {
		return ""
	}

	return "/notes/" + strings.Join(encodedSegments, "/")
}

func splitNotePath(pathToNote string) (folder string, note string, ok bool) {
	trimmed := strings.Trim(pathToNote, "/")
	if trimmed == "" {
		return "", "", false
	}

	slashIdx := strings.LastIndex(trimmed, "/")
	if slashIdx == -1 {
		return "", trimmed, true
	}
	if slashIdx == len(trimmed)-1 {
		return "", "", false
	}

	return trimmed[:slashIdx], trimmed[slashIdx+1:], true
}

func (s *SearchService) FullTextSearch(searchQuery string, searchAfter []string, pageSize *int) search.FullTextSearchPage {
	effectivePageSize := search.FullTextSearchPageSize
	if pageSize != nil && *pageSize > 0 {
		effectivePageSize = *pageSize
	}

	// Build the boolean query and request using helpers for clarity
	totalQuery, sortOption := search.BuildBooleanQueryFromUserInput(searchQuery, 1)
	request := search.CreateSearchRequest(totalQuery, effectivePageSize+1, sortOption, searchAfter)

	idx := s.Index.RLock()
	defer s.Index.RUnlock()
	res, err := idx.Search(request)
	if err != nil {
		log.Println("full text search failed:", err)
		return search.FullTextSearchPage{
			Results: []search.SearchResult{},
		}
	}

	hasMore := len(res.Hits) > effectivePageSize
	if hasMore {
		res.Hits = res.Hits[:effectivePageSize]
	}

	nextSearchAfter := []string{}
	if hasMore && len(res.Hits) > 0 {
		lastHit := res.Hits[len(res.Hits)-1]
		nextSearchAfter = buildSearchAfterFromHit(lastHit.Sort, lastHit.Score, lastHit.ID)
	}
	processedResults := search.ProcessDocumentSearchResults(res)

	return search.FullTextSearchPage{
		Results:         processedResults,
		NextSearchAfter: nextSearchAfter,
		HasMore:         hasMore,
		Total:           res.Total,
	}
}

// SearchFileNamesFromQuery performs a fuzzy filename search using the Bleve index.
// It reuses the filename query logic from the search package to align editor @ mentions
// with the backend search experience.
func (s *SearchService) SearchFileNamesFromQuery(searchQuery string) []FilePickerSearchResult {
	normalizedQuery := strings.ToLower(strings.TrimSpace(searchQuery))
	filenameQuery := search.CreateFilenameQuery(normalizedQuery, 1.0)
	searchRequest := search.CreateSearchRequest(filenameQuery, 20, nil, nil)

	idx := s.Index.RLock()
	defer s.Index.RUnlock()
	results, err := idx.Search(searchRequest)
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

	return searchResults
}

// GetAllSavedSearches returns all saved searches for the project
func (s *SearchService) GetAllSavedSearches() (config.BackendResponseWithData[[]search.SavedSearch], error) {
	searches, err := search.GetAllSavedSearches(s.ProjectPath)
	if err != nil {
		return config.BackendResponseWithData[[]search.SavedSearch]{
			Success: false,
			Message: err.Error(),
			Data:    []search.SavedSearch{},
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

// GetLinkedMentions returns the list of notes whose markdown body contains an
// internal link to the given note. pathToNote is expected in the form
// "<folder>/<noteName>".
func (s *SearchService) GetLinkedMentions(pathToNote string, pageSize int) config.BackendResponseWithData[[]LinkedMention] {
	urlPath := buildEncodedNoteURLPath(pathToNote)
	if urlPath == "" {
		return config.BackendResponseWithData[[]LinkedMention]{
			Success: true,
			Message: "No linked mentions",
			Data:    []LinkedMention{},
		}
	}

	idx := s.Index.RLock()
	hits := events.FindNotesWithLink(idx, urlPath, pageSize)
	s.Index.RUnlock()

	mentions := make([]LinkedMention, 0, len(hits))
	for _, hit := range hits {
		folder, note, ok := splitNotePath(hit)
		if !ok {
			continue
		}
		mentions = append(mentions, LinkedMention{
			Folder: folder,
			Note:   note,
		})
	}

	return config.BackendResponseWithData[[]LinkedMention]{
		Success: true,
		Message: "Successfully retrieved linked mentions",
		Data:    mentions,
	}
}

// RegenerateSearchIndex regenerates the search index by deleting the existing
// index and creating a new one with all files re-indexed. The swap runs under
// the index holder's write lock, so any in-flight Search/Batch callers finish
// before the old index is closed.
func (s *SearchService) RegenerateSearchIndex() config.BackendResponseWithoutData {
	err := s.Index.Swap(func(old bleve.Index) (bleve.Index, error) {
		return search.RegenerateSearchIndex(s.ProjectPath, old)
	})
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: err.Error(),
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Successfully regenerated search index",
	}
}
