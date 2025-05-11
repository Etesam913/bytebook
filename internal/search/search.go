package search

import (
	"log"
	"os"
	"path/filepath"
	"strings"
)

// GenerateTrigrams creates a slice of trigrams (3-character sequences) from a given word
// using a sliding window approach. It iterates through the word and creates trigrams
// from consecutive characters.
// Parameters:
//   - word: A slice of runes representing the input word
//
// Returns:
//   - A slice of strings containing all trigrams generated from the word
func GenerateTrigrams(word []rune) []string {
	trigrams := []string{}
	for j := 2; j < len(word); j++ {
		trigram := string([]rune{word[j-2], word[j-1], word[j]})
		trigrams = append(trigrams, trigram)
	}
	return trigrams
}

// addTrigramToInverseMap adds a trigram to the inverse map data structure, which maps
// trigrams to files containing them and their frequency counts.
// Parameters:
//   - trigram: The trigram string to add
//   - fileName: The name of the file containing the trigram
//   - inverseMap: Pointer to the map that stores trigram-to-file relationships
func addTrigramToInverseMap(
	trigram string,
	fileName string,
	inverseMap *map[string]map[string]int,
) {
	// Dereference the pointer to access the map
	if _, trigramExists := (*inverseMap)[trigram]; !trigramExists {
		// Initialize the inner map if the trigram does not exist
		(*inverseMap)[trigram] = make(map[string]int)
	}

	// Increment the count for the file name; initialize if not present
	(*inverseMap)[trigram][fileName]++
}

// GetNoteNamesStream creates a channel that streams note file paths from the given notes directory.
// It traverses the directory structure, finds all note files, and sends their relative paths
// to the returned channel.
// Parameters:
//   - notesPath: The path to the notes directory
//
// Returns:
//   - A channel that streams note file paths
func GetNoteNamesStream(notesPath string) <-chan string {
	noteChannel := make(chan string)
	folders, err := os.ReadDir(notesPath)

	if err != nil {
		log.Fatalf("Failed to read notes directory: %v", err)
	}

	go func() {
		for _, folderName := range folders {
			if folderName.IsDir() {
				// We want to look at notes
				pathToUserFiles := filepath.Join(notesPath, folderName.Name())
				markdownFiles, err := os.ReadDir(pathToUserFiles)
				if err != nil {
					continue
				}
				for _, userFile := range markdownFiles {
					if !userFile.IsDir() {
						pathToFile := filepath.Join(pathToUserFiles, userFile.Name())
						pathSegments := strings.Split(pathToFile, "/")
						trimmedPathToFile := strings.Join([]string{
							pathSegments[len(pathSegments)-2],
							pathSegments[len(pathSegments)-1],
						}, "/")
						noteChannel <- trimmedPathToFile
					}
				}
			}
		}
		close(noteChannel)
	}()

	return noteChannel
}

// ConstructInverseMap builds an inverse map that associates trigrams with the files that contain them.
// This map is used for efficient searching of notes based on trigram matching.
// Parameters:
//   - projectPath: The root path of the project
//
// Returns:
//   - A map where keys are trigrams and values are maps of file names to occurrence counts
func ConstructInverseMap(projectPath string) map[string]map[string]int {
	notesPath := filepath.Join(projectPath, "notes")

	filePathsChannel := GetNoteNamesStream(notesPath)

	inverseMap := map[string]map[string]int{}

	for filePath := range filePathsChannel {
		filePathWithoutExtension := strings.Split(filePath, ".")[0]
		filePathWithoutExtensionLowercase := strings.ToLower(filePathWithoutExtension)
		fileNameRunes := []rune(filePathWithoutExtensionLowercase)
		trigrams := GenerateTrigrams(fileNameRunes)
		for j := 0; j < len(trigrams); j++ {
			addTrigramToInverseMap(trigrams[j], filePathWithoutExtension, &inverseMap)
		}
	}

	return inverseMap
}

// jaroDistance calculates the Jaro distance between two strings, which is a measure of similarity.
// The score ranges from 0 (completely different) to 1 (identical).
// Parameters:
//   - s1: First string to compare
//   - s2: Second string to compare
//
// Returns:
//   - A float64 value representing the Jaro distance (0-1)
func jaroDistance(s1 string, s2 string) float64 {
	s1Len := len(s1)
	s2Len := len(s2)

	// If both strings are empty, return 1.0 (identical)
	if s1Len == 0 && s2Len == 0 {
		return 1.0
	}

	// If only one string is empty, return 0.0 (completely different)
	if s1Len == 0 || s2Len == 0 {
		return 0.0
	}

	/*
		Maximum distance up to which matching is allowed
		There is a window because transpositions are allowed
	*/
	matchDistance := max(s1Len, s2Len)/2 - 1
	s1Matches := make([]bool, s1Len)
	s2Matches := make([]bool, s2Len)
	matches := 0
	transpositions := 0

	/*
		Goes through each char in s1 if the char has a match for its window
		then store hte match.
	*/
	for i := 0; i < s1Len; i++ {
		start := max(0, i-matchDistance)
		end := min(i+matchDistance+1, s2Len)

		for j := start; j < end; j++ {
			// You can't rematch something that is already matched'
			if s2Matches[j] {
				continue
			}
			// This value of j is not the match, try the others in the window
			if s1[i] != s2[j] {
				continue
			}

			// Match found
			s1Matches[i] = true
			s2Matches[j] = true
			matches++
			break
		}
	}

	// If no matches found, return 0.0
	if matches == 0 {
		return 0.0
	}

	// Count transpositions
	k := 0
	for i := 0; i < s1Len; i++ {
		if !s1Matches[i] {
			continue
		}
		for !s2Matches[k] {
			k++
		}
		if s1[i] != s2[k] {
			transpositions++
		}
		k++
	}

	// Compute Jaro distance
	transpositions /= 2
	jaroDistance := (float64(matches)/float64(s1Len) +
		float64(matches)/float64(s2Len) +
		float64(matches-(transpositions))/float64(matches)) / 3.0

	return jaroDistance
}

// JaroWinklerSimilarity calculates the Jaro-Winkler similarity between two strings.
// This is an extension of the Jaro distance that gives more weight to strings with matching prefixes.
// Parameters:
//   - s1: First string to compare
//   - s2: Second string to compare
//
// Returns:
//   - A float64 value representing the Jaro-Winkler similarity (0-1)
func JaroWinklerSimilarity(s1, s2 string) float64 {
	jaroDist := jaroDistance(s1, s2)

	// Find the common prefix length (up to a maximum of 4)
	prefixLength := 0
	for i := range min(min(len(s1), len(s2)), 4) {
		if s1[i] == s2[i] {
			prefixLength++
		} else {
			break
		}
	}

	// Scaling factor for how much the score is adjusted upwards for having common prefixes
	scalingFactor := 0.05

	// Calculate the Jaro-Winkler similarity
	jaroWinklerSimilarity := jaroDist + float64(prefixLength)*scalingFactor*(1.0-jaroDist)

	return jaroWinklerSimilarity
}
