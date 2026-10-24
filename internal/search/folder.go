package search

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/mapping"
)

const FOLDER_TYPE = "folder"

type FolderBleveDocument struct {
	Type     string `json:"type"`
	Folder   string `json:"folder"`
	FileName string `json:"file_name"`
}

// createFolderDocumentMapping indexes folder types and names and stores them for search results.
func createFolderDocumentMapping() *mapping.DocumentMapping {
	documentMapping := bleve.NewDocumentMapping()
	documentMapping.Dynamic = false

	typeFieldMapping := bleve.NewKeywordFieldMapping()
	typeFieldMapping.Store = true

	documentMapping.AddFieldMappingsAt(FieldType, typeFieldMapping)

	for _, field := range []string{FieldFolder, FieldFileName} {
		nameFieldMapping := bleve.NewTextFieldMapping()
		nameFieldMapping.Analyzer = FilenameAnalyzer
		nameFieldMapping.Store = true
		documentMapping.AddFieldMappingsAt(field, nameFieldMapping)
	}
	return documentMapping
}

// AddFolderToBatch indexes a visible notes-relative directory, excluding the notes root.
// Returns an error if the path is invalid or cannot be queued.
func AddFolderToBatch(batch *bleve.Batch, folderPath string) error {
	normalized := filepath.ToSlash(filepath.Clean(folderPath))
	if normalized == "." {
		return nil
	}
	if filepath.IsAbs(normalized) {
		return fmt.Errorf("folder path must be relative: %q", folderPath)
	}
	for _, part := range strings.Split(normalized, "/") {
		if strings.HasPrefix(part, ".") {
			return nil
		}
	}
	parent, name := filepath.Split(normalized)
	return batch.Index(normalized+"/", FolderBleveDocument{
		Type: FOLDER_TYPE, Folder: strings.TrimSuffix(parent, "/"), FileName: name,
	})
}

// IndexDiscoveredFolders indexes directories from the existing discovery pass in bounded batches.
// Returns an error if path conversion or indexing fails.
func IndexDiscoveredFolders(projectPath string, directories []string, index bleve.Index) error {
	batch := index.NewBatch()
	for _, directory := range directories {
		relative, err := filepath.Rel(filepath.Join(projectPath, "notes"), directory)
		if err != nil {
			return fmt.Errorf("relative folder path: %w", err)
		}
		if err := AddFolderToBatch(batch, relative); err != nil {
			return err
		}
		if batch.Size() >= DefaultBatchSize {
			if err := FlushBatch(index, batch); err != nil {
				return err
			}
			batch.Reset()
		}
	}
	return FlushBatch(index, batch)
}
