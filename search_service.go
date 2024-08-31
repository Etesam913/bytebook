package main

import (
	"fmt"
	"path/filepath"
	"sort"
	"strings"

	"github.com/etesam913/bytebook/lib/search_helpers"
)

type SearchService struct {
	ProjectPath string
	InverseSearchMap  map[string]map[string]int
}

func (s *SearchService) SearchFileNamesFromQueryTrigram(searchQuery string) []string{

	queryTrigrams := search_helpers.GenerateTrigrams([]rune(strings.ToLower(searchQuery)))
	searchResults := map[string]int{}

	// Populating the searchResults map by aggregating the frequencies from each matching trigram
	for i:=0; i < len(queryTrigrams); i++{
		trigram := queryTrigrams[i]
		fileNameMap, exists := s.InverseSearchMap[trigram]
		if !exists{
			continue
		}

		for fileName := range fileNameMap{
			_, nameInResults := searchResults[fileName]
			if nameInResults{
				searchResults[fileName] += fileNameMap[fileName]
			} else{
				searchResults[fileName] = fileNameMap[fileName]
			}
		}
	}

	searchResultsSortedByRankDescending := []string{}

	for fileName := range searchResults{
		searchResultsSortedByRankDescending = append(searchResultsSortedByRankDescending, fileName)
	}

	sort.Slice(searchResultsSortedByRankDescending, func(i,j int) bool {
		return searchResults[searchResultsSortedByRankDescending[i]] > searchResults[searchResultsSortedByRankDescending[j]]
	})

	return searchResultsSortedByRankDescending
}

/*
Uses JaroWinklerSimilarity algorithm to rank file names off of a calculated similarity
metic.
*/
func (s *SearchService) SearchFileNamesFromQuery(searchQuery string) []string{
	notesPath := filepath.Join(s.ProjectPath, "notes")
	lowerSearchQuery := strings.ToLower(searchQuery)
	filePaths := search_helpers.GetNoteNames(notesPath)

	// Ignore results less than similarity threshold
	similarityThreshold := 0.7

	type searchResult struct {
		shortenedNotePath string
		similarity float64
	}

	searchResults := []searchResult{}

	// Collecting all the search results
	for _, filePath := range filePaths {
		segments := strings.Split(filePath, "/")
		// folderName := strings.ToLower(segments[len(segments)-2])
		// noteName:= strings.ToLower(segments[len(segments)-1])
		folder := segments[len(segments)-2]
		note := segments[len(segments)-1]

		noteSimilarity := search_helpers.JaroWinklerSimilarity(lowerSearchQuery, strings.ToLower(note))
		folderSimilarity := search_helpers.JaroWinklerSimilarity(lowerSearchQuery, strings.ToLower(folder))

		if len(segments) < 2 {
			continue
		}

		// Only keep results that are similar enough
		if noteSimilarity >= similarityThreshold || folderSimilarity >= similarityThreshold {
			searchResults = append(searchResults, searchResult{
				shortenedNotePath: folder + "/" + note,
				similarity: noteSimilarity,
			})
		}

	}
	fmt.Println(searchResults)

	// Sort the results descending via similarity so that most relevant results show first
	sort.Slice(searchResults, func(i, j int) bool{
		return searchResults[i].similarity > searchResults[j].similarity
	})

	searchResultsWithoutSimilarity := []string{}

	for _, result := range searchResults {
		searchResultsWithoutSimilarity = append(searchResultsWithoutSimilarity, result.shortenedNotePath)
	}

	return searchResultsWithoutSimilarity
}
