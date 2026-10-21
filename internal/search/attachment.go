package search

import (
	"os"
	"path/filepath"
	"strings"
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
	FileNameLC    string   `json:"file_name_lc"`
	FileExtension string   `json:"file_extension"`
	Tags          []string `json:"tags"`
	CreatedDate   string   `json:"created_date"`
	Size          int64    `json:"size"`
}

// createAttachmentBleveDocument constructs an AttachmentBleveDocument from file information.
// It extracts the filename, file extension, and attachment tags for search indexing.
func createAttachmentBleveDocument(projectPath, folder, fileName, fileExtension string) AttachmentBleveDocument {
	tags, err := sidecar.ReadTags(projectPath, folder, fileName)
	if err != nil {
		tags = []string{}
	}

	size := int64(0)
	createdDate := ""
	attachmentPath := filepath.Join(projectPath, "notes", folder, fileName)
	fileInfo, statErr := os.Stat(attachmentPath)
	if statErr == nil {
		size = fileInfo.Size()
		createdDate = fileInfo.ModTime().UTC().Format(time.RFC3339)
	}

	return AttachmentBleveDocument{
		Type:          ATTACHMENT_TYPE,
		Folder:        folder,
		FileName:      fileName,
		FileNameLC:    strings.ToLower(fileName),
		FileExtension: fileExtension,
		Tags:          tags,
		CreatedDate:   createdDate,
		Size:          size,
	}
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
