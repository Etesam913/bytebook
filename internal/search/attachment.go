package search

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/mapping"
	"github.com/etesam913/bytebook/internal/notes/sidecar"
)

const ATTACHMENT_TYPE = "attachment"

type AttachmentBleveDocument struct {
	Type          string   `json:"type"`
	Folder        string   `json:"folder"`
	FileName      string   `json:"file_name"`
	FileExtension string   `json:"file_extension"`
	Tags          []string `json:"tags"`
	CreatedDate   string   `json:"created_date"`
	Size          int64    `json:"size"`
}

// createAttachmentBleveDocument constructs an AttachmentBleveDocument from file information.
// It extracts the filename, file extension, and attachment tags for search indexing.
func createAttachmentBleveDocument(projectPath, folder, fileName, fileExtension string) (AttachmentBleveDocument, error) {
	tags, err := sidecar.ReadTags(projectPath, folder, fileName)
	if err != nil {
		tags = []string{}
	}

	attachmentPath := filepath.Join(projectPath, "notes", folder, fileName)
	fileInfo, err := os.Stat(attachmentPath)
	if err != nil {
		return AttachmentBleveDocument{}, fmt.Errorf("stat attachment %s: %w", attachmentPath, err)
	}

	return AttachmentBleveDocument{
		Type:          ATTACHMENT_TYPE,
		Folder:        folder,
		FileName:      fileName,
		FileExtension: fileExtension,
		Tags:          tags,
		CreatedDate:   fileInfo.ModTime().UTC().Format(time.RFC3339),
		Size:          fileInfo.Size(),
	}, nil
}

// createAttachmentDocumentMapping creates a Bleve document mapping for attachments.
// It defines field mappings for all the fields in AttachmentBleveDocument to enable
// proper indexing and searching of attachment metadata.
func createAttachmentDocumentMapping() *mapping.DocumentMapping {
	keywordTextFieldMapping := bleve.NewTextFieldMapping()
	keywordTextFieldMapping.Analyzer = "keyword"

	createdDateFieldMapping := bleve.NewDateTimeFieldMapping()
	createdDateFieldMapping.Store = true
	sizeFieldMapping := bleve.NewNumericFieldMapping()
	sizeFieldMapping.Store = true

	documentMapping := bleve.NewDocumentMapping()

	// Use filename analyzer for attachments too
	attachmentFileNameFieldMapping := bleve.NewTextFieldMapping()
	attachmentFileNameFieldMapping.Analyzer = FilenameAnalyzer
	attachmentFileNameFieldMapping.Store = true

	attachmentFolderFieldMapping := bleve.NewTextFieldMapping()
	attachmentFolderFieldMapping.Analyzer = FilenameAnalyzer
	attachmentFolderFieldMapping.Store = true

	documentMapping.AddFieldMappingsAt(FieldFolder, attachmentFolderFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldFileName, attachmentFileNameFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldFileExtension, keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldTags, keywordTextFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldCreatedDate, createdDateFieldMapping)
	documentMapping.AddFieldMappingsAt(FieldSize, sizeFieldMapping)

	return documentMapping
}
