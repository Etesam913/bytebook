package services

import (
	"fmt"
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

func (s *SearchService) FullTextSearch(searchQuery string) []string {
	matchQuery := bleve.NewPrefixQuery(searchQuery)
	// matchQuery.SetField("folder")
	matchQuery.SetField("file_name")
	// matchQuery.SetFuzziness(2)
	// matchQuery.SetPrefix(2)
	// matchQuery.SetOperator(query.MatchQueryOperatorAnd)

	request := bleve.NewSearchRequest(matchQuery)
	request.Fields = []string{"folder", "file_name"}

	res, err := s.SearchIndex.Search(request)
	if err != nil {
		return []string{}
	}

	searchResults := []string{}

	fmt.Println("res: ", res)

	for _, hit := range res.Hits {
		fmt.Println("hit.ID: ", hit.ID)
		folder, folderOk := hit.Fields["folder"]
		fileName, fileNameOk := hit.Fields["file_name"]
		if !folderOk || !fileNameOk {
			continue
		}

		searchResults = append(searchResults, folder.(string)+"/"+fileName.(string))

		for k, v := range hit.Fields {
			fmt.Printf("  %s: %v\n", k, v)
		}
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
