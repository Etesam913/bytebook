package search

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/blevesearch/bleve/v2"
	_ "github.com/blevesearch/bleve/v2/analysis/analyzer/custom"
	_ "github.com/blevesearch/bleve/v2/analysis/analyzer/keyword"
	_ "github.com/blevesearch/bleve/v2/analysis/analyzer/simple"
	_ "github.com/blevesearch/bleve/v2/analysis/lang/en"
	"github.com/blevesearch/bleve/v2/analysis/token/edgengram"
	"github.com/blevesearch/bleve/v2/analysis/token/lowercase"
	_ "github.com/blevesearch/bleve/v2/analysis/token/ngram"
	"github.com/etesam913/bytebook/internal/util"
)

const INDEX_NAME = ".index.bleve"

var FilenameAnalyzer = "filename_analyzer"

const DefaultBatchSize = 750

// MaxDeleteSearchResults is the upper bound on documents returned when
// querying for folder contents to delete. Bleve defaults to 10 if unset.
const MaxDeleteSearchResults = 100000

// FlushBatch commits a non-empty batch without resetting it.
func FlushBatch(index bleve.Index, batch *bleve.Batch) error {
	if batch == nil || batch.Size() == 0 {
		return nil
	}
	return index.Batch(batch)
}

// GetPathToIndex returns the full path to the search index file for a given project.
// It combines the project path with the search directory and the index filename.
func GetPathToIndex(projectPath string) string {
	return filepath.Join(projectPath, "search", INDEX_NAME)
}

// doesIndexExist checks whether a search index file exists for the given project path.
// It returns true if the index file exists, false otherwise.
func doesIndexExist(projectPath string) bool {
	exists, _ := util.FileOrFolderExists(GetPathToIndex(projectPath))
	return exists
}

// createIndex creates a new Bleve search index at the given on-disk path.
// It returns the created index or an error if the creation fails.
func createIndex(pathToIndex string) (bleve.Index, error) {
	indexMapping := bleve.NewIndexMapping()
	err := indexMapping.AddCustomTokenFilter(
		NGramTokenFilter,
		map[string]interface{}{
			"type": edgengram.Name,
			"min":  float64(3),
			"max":  float64(10),
			"side": "front",
		},
	)
	if err != nil {
		return nil, err
	}

	err = indexMapping.AddCustomAnalyzer(NGramAnalyzer,
		map[string]interface{}{
			"type":      "custom",
			"tokenizer": "unicode",
			"token_filters": []interface{}{
				lowercase.Name,
				NGramTokenFilter,
			},
		},
	)

	if err != nil {
		return nil, err
	}

	// Create a custom analyzer for filenames that lowercases but doesn't tokenize on apostrophes
	err = indexMapping.AddCustomAnalyzer(FilenameAnalyzer,
		map[string]interface{}{
			"type":      "custom",
			"tokenizer": "single", // single tokenizer treats the entire input as one token
			"token_filters": []interface{}{
				lowercase.Name, // lowercase the entire filename
			},
		},
	)

	if err != nil {
		return nil, err
	}

	// Use the "type" field in documents to select the document mapping
	indexMapping.TypeField = "type"
	indexMapping.DefaultMapping = createNoteDocumentMapping()
	indexMapping.AddDocumentMapping(NOTE_TYPE, createNoteDocumentMapping())
	indexMapping.AddDocumentMapping(ATTACHMENT_TYPE, createAttachmentDocumentMapping())
	indexMapping.AddDocumentMapping(FOLDER_TYPE, createFolderDocumentMapping())
	index, err := bleve.New(pathToIndex, indexMapping)
	if err != nil {
		return nil, err
	}

	return index, nil
}

// OpenOrCreateIndex opens an existing search index or creates a new one if it doesn't exist.
// It first checks if an index exists at the project path, and if so, opens it.
// If no index exists, it creates a new one. Returns the index or an error if the operation fails.
func OpenOrCreateIndex(projectPath string) (bleve.Index, error) {
	indexExists := doesIndexExist(projectPath)
	if indexExists {
		openedIndex, err := bleve.Open(GetPathToIndex(projectPath))
		if err != nil {
			return nil, err
		}
		return openedIndex, nil
	}

	index, err := createIndex(GetPathToIndex(projectPath))
	if err != nil {
		return nil, err
	}
	return index, nil
}

// buildDocument uses supplied Markdown when non-nil, including an empty string.
// Otherwise notes are read from disk; attachments always use filesystem metadata.
func buildDocument(projectPath, folder, fileName string, markdown *string) (any, error) {
	if filepath.Ext(fileName) != ".md" {
		return createAttachmentBleveDocument(projectPath, folder, fileName, filepath.Ext(fileName))
	}
	if markdown == nil {
		content, err := os.ReadFile(filepath.Join(projectPath, "notes", folder, fileName))
		if err != nil {
			return nil, fmt.Errorf("read note %s: %w", filepath.Join(folder, fileName), err)
		}
		text := string(content)
		markdown = &text
	}
	return CreateNoteBleveDocument(*markdown, folder, fileName), nil
}

// IndexFile upserts a note or attachment in batch. A nil Markdown payload reads notes from disk.
// Returns a document-building or batch-indexing error.
func IndexFile(batch *bleve.Batch, projectPath, folder, fileName string, markdown *string) error {
	document, err := buildDocument(projectPath, folder, fileName, markdown)
	if err != nil {
		return err
	}
	if err := batch.Index(filepath.Join(folder, fileName), document); err != nil {
		return fmt.Errorf("index file %s: %w", filepath.Join(folder, fileName), err)
	}
	return nil
}

// RegenerateSearchIndex builds a fresh search index before replacing the existing
// one. Callers must hold the IndexHolder write lock throughout the rebuild so
// concurrent updates are not lost. A commit failure returns a reopened index
// alongside the error, which the holder must install before releasing its lock.
func RegenerateSearchIndex(projectPath string, index bleve.Index) (bleve.Index, error) {
	return regenerateSearchIndex(projectPath, index, indexRebuildOperations{
		removeAll: os.RemoveAll,
		rename:    os.Rename,
		open:      bleve.Open,
	})
}

// Keep filesystem failure injection local to a rebuild instead of changing globals.
type indexRebuildOperations struct {
	removeAll func(string) error
	rename    func(string, string) error
	open      func(string) (bleve.Index, error)
}

func regenerateSearchIndex(projectPath string, index bleve.Index, operations indexRebuildOperations) (bleve.Index, error) {
	finalPath := GetPathToIndex(projectPath)
	if err := os.MkdirAll(filepath.Dir(finalPath), 0o700); err != nil {
		return nil, fmt.Errorf("create search directory: %w", err)
	}
	// Recovery may leave the active index at a staging path. Never reuse it.
	tempPath, err := os.MkdirTemp(filepath.Dir(finalPath), INDEX_NAME+".regen-")
	if err != nil {
		return nil, fmt.Errorf("create rebuild directory: %w", err)
	}

	newIndex, err := createIndex(tempPath)
	if err != nil {
		os.RemoveAll(tempPath)
		return nil, err
	}

	if err := IndexFolderTree(projectPath, "", newIndex); err != nil {
		newIndex.Close()
		os.RemoveAll(tempPath)
		return nil, err
	}

	if err := newIndex.Close(); err != nil {
		os.RemoveAll(tempPath)
		return nil, err
	}

	oldPath := finalPath
	if index != nil {
		oldPath = index.Name()
		if err := index.Close(); err != nil {
			log.Printf("Error closing existing index: %v", err)
		}
	}

	// Remove only staging directories that no longer back a live handle.
	cleanupStaging := func(activePath string) {
		for _, path := range []string{tempPath, oldPath} {
			if path == activePath || path == finalPath || filepath.Dir(path) != filepath.Dir(finalPath) ||
				!strings.HasPrefix(filepath.Base(path), INDEX_NAME+".regen-") {
				continue
			}
			if err := os.RemoveAll(path); err != nil {
				log.Printf("Error removing unused staging index: %v", err)
			}
		}
	}

	// Once the old handle is closed, every failure must try to reopen a valid
	// directory. Keep the fully built staging index available during recovery.
	recoverIndex := func(commitError error) (bleve.Index, error) {
		errorsToReport := []error{commitError}
		for _, path := range []string{tempPath, finalPath, oldPath} {
			recovered, err := operations.open(path)
			if err == nil {
				cleanupStaging(path)
				return recovered, commitError
			}
			errorsToReport = append(errorsToReport, fmt.Errorf("reopen index at %s: %w", path, err))
		}
		return nil, errors.Join(errorsToReport...)
	}

	if err := operations.removeAll(finalPath); err != nil {
		return recoverIndex(fmt.Errorf("remove previous index: %w", err))
	}
	if err := operations.rename(tempPath, finalPath); err != nil {
		return recoverIndex(fmt.Errorf("replace search index: %w", err))
	}
	opened, err := operations.open(finalPath)
	if err != nil {
		return recoverIndex(fmt.Errorf("open rebuilt index: %w", err))
	}

	cleanupStaging(finalPath)
	return opened, nil
}
