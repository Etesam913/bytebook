package search_helpers

import (
	"log"
	"os"
	"path/filepath"
	"strings"
)

/*
Generates trigrams for a given word using sliding window
*/
func GenerateTrigrams(word []rune) []string{
	trigrams := []string{}
	for j:=2; j < len(word); j++{
		trigram := string([]rune{word[j-2],word[j-1], word[j]})
		trigrams = append(trigrams, trigram)
	}
	return trigrams
}

/*
Adds a trigram to the inverse map
*/
func addTrigramToInverseMap(trigram string, fileName string, inverseMap *map[string]map[string]int) {
	// Dereference the pointer to access the map
	if _, trigramExists := (*inverseMap)[trigram]; !trigramExists {
		// Initialize the inner map if the trigram does not exist
		(*inverseMap)[trigram] = make(map[string]int)
	}

	// Increment the count for the file name; initialize if not present
	(*inverseMap)[trigram][fileName]++
}

func getNoteNames(notesPath string) []string{
	folders, err := os.ReadDir(notesPath)

	if err != nil{
		log.Fatalf("Failed to read notes directory: %v", err)
	}

	filePaths := []string{}
	for _, folderName := range folders {
		// We only want to look at folders
		if folderName.IsDir(){
			// We want to look at notes
			pathToUserFiles := filepath.Join(notesPath, folderName.Name())
			markdownFiles, err := os.ReadDir(pathToUserFiles)
			if err != nil{
				log.Fatalf("Failed to read %v directory: %v", pathToUserFiles, err)
			}
			for _, userFile := range markdownFiles{
				if !userFile.IsDir(){
					pathToFile := filepath.Join(pathToUserFiles, userFile.Name())
					pathSegments := strings.Split(pathToFile, "/")
					trimmedPathToFile := strings.Join([]string{pathSegments[len(pathSegments)-2], pathSegments[len(pathSegments)-1]}, "/")
					filePaths = append(filePaths, trimmedPathToFile)
				}
			}
		}
	}
	return filePaths
}

func ConstructInverseMap(projectPath string) map[string]map[string]int {
	notesPath := filepath.Join(projectPath, "notes")

	filePaths := getNoteNames(notesPath)

	inverseMap := map[string]map[string]int{}

	for i := 0; i < len(filePaths); i++ {
		filePathWithoutExtension := strings.Split(filePaths[i], ".")[0]
		filePathWithoutExtensionLowercase := strings.ToLower(filePathWithoutExtension)
		fileNameRunes := []rune(filePathWithoutExtensionLowercase)
		trigrams := GenerateTrigrams(fileNameRunes)
		for j := 0; j < len(trigrams); j++{
			addTrigramToInverseMap(trigrams[j], filePathWithoutExtension, &inverseMap)
		}
	}

	return inverseMap
}
