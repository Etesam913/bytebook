package main

import (
	"sort"

	"github.com/etesam913/bytebook/lib/search_helpers"
)

type SearchService struct {
	ProjectPath string
	InverseSearchMap  map[string]map[string]int
}

func (s *SearchService) SearchFileNamesFromQuery(searchQuery string) []string{
	queryTrigrams := search_helpers.GenerateTrigrams([]rune(searchQuery))
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
