package notes

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"

	"github.com/etesam913/bytebook/internal/util"
)

// attachmentSidecar represents the JSON stored alongside non-markdown files.
// Example filename: photo.jpg -> .photo.json
type attachmentSidecar struct {
	Tags []string `json:"tags"`
}

// GetAttachmentSidecarPath builds the absolute path to the sidecar for a given attachment.
func GetAttachmentSidecarPath(projectPath, folder, fileName string) string {
	ext := filepath.Ext(fileName)
	base := strings.TrimSuffix(fileName, ext)
	sidecarFile := "." + base + ".json"
	return filepath.Join(projectPath, "notes", folder, sidecarFile)
}

// sanitizeTags trims, de-duplicates, and removes empty tags.
func sanitizeTags(tags []string) []string {
	tagSet := util.Set[string]{}
	for _, tag := range tags {
		trimmed := strings.TrimSpace(tag)
		if trimmed == "" {
			continue
		}
		tagSet.Add(trimmed)
	}
	return tagSet.Elements()
}

// ReadAttachmentTags returns the tags stored in the sidecar, or an empty slice if missing.
func ReadAttachmentTags(projectPath, folder, fileName string) ([]string, error) {
	sidecarPath := GetAttachmentSidecarPath(projectPath, folder, fileName)
	bytes, err := os.ReadFile(sidecarPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, err
	}

	var sc attachmentSidecar
	if err := json.Unmarshal(bytes, &sc); err != nil {
		return []string{}, err
	}

	return sanitizeTags(sc.Tags), nil
}

// WriteAttachmentTags writes the tags to the sidecar file, creating it if necessary.
func WriteAttachmentTags(projectPath, folder, fileName string, tags []string) error {
	sidecarPath := GetAttachmentSidecarPath(projectPath, folder, fileName)
	sanitized := sanitizeTags(tags)
	payload, err := json.Marshal(attachmentSidecar{Tags: sanitized})
	if err != nil {
		return err
	}
	return os.WriteFile(sidecarPath, payload, 0644)
}

// EnsureAttachmentSidecar makes sure a sidecar exists for the attachment. If it already
// exists, it is left untouched. If missing, it is created with an empty tag list.
func EnsureAttachmentSidecar(projectPath, folder, fileName string) error {
	sidecarPath := GetAttachmentSidecarPath(projectPath, folder, fileName)
	if _, err := os.Stat(sidecarPath); err == nil {
		return nil
	} else if !os.IsNotExist(err) {
		return err
	}
	return WriteAttachmentTags(projectPath, folder, fileName, []string{})
}

// DeleteAttachmentSidecar removes the sidecar file if it exists.
func DeleteAttachmentSidecar(projectPath, folder, fileName string) error {
	sidecarPath := GetAttachmentSidecarPath(projectPath, folder, fileName)
	if _, err := os.Stat(sidecarPath); os.IsNotExist(err) {
		return nil
	}
	return os.Remove(sidecarPath)
}

// RenameAttachmentSidecar moves/renames the sidecar alongside an attachment rename.
// If the old sidecar does not exist, it will create a new one for the destination.
func RenameAttachmentSidecar(projectPath, oldFolder, oldFileName, newFolder, newFileName string) error {
	tags, err := ReadAttachmentTags(projectPath, oldFolder, oldFileName)
	if err != nil && !os.IsNotExist(err) {
		return err
	}

	if err := WriteAttachmentTags(projectPath, newFolder, newFileName, tags); err != nil {
		return err
	}

	// Best-effort cleanup of old sidecar
	_ = DeleteAttachmentSidecar(projectPath, oldFolder, oldFileName)
	return nil
}

// GetTagsFromAttachment reads tags from the attachment sidecar.
func GetTagsFromAttachment(projectPath, folderAndFileName string) ([]string, bool, error) {
	folder, fileName := util.SplitFolderAndFile(folderAndFileName)
	tags, err := ReadAttachmentTags(projectPath, folder, fileName)
	if err != nil {
		return []string{}, false, err
	}
	return tags, len(tags) > 0, nil
}

// AddTagsToAttachment merges new tags into the attachment sidecar and returns the updated list.
func AddTagsToAttachment(projectPath, folderAndFileName string, newTags []string) ([]string, error) {
	folder, fileName := util.SplitFolderAndFile(folderAndFileName)
	existing, err := ReadAttachmentTags(projectPath, folder, fileName)
	if err != nil {
		return nil, err
	}

	tagSet := util.SliceToSet(existing)
	for _, tag := range newTags {
		trimmed := strings.TrimSpace(tag)
		if trimmed != "" {
			tagSet.Add(trimmed)
		}
	}

	finalTags := sanitizeTags(tagSet.Elements())
	if err := WriteAttachmentTags(projectPath, folder, fileName, finalTags); err != nil {
		return nil, err
	}
	return finalTags, nil
}

// DeleteTagsFromAttachment removes tags from the attachment sidecar and returns the updated list.
func DeleteTagsFromAttachment(projectPath, folderAndFileName string, tagsToDelete []string) ([]string, error) {
	folder, fileName := util.SplitFolderAndFile(folderAndFileName)
	existing, err := ReadAttachmentTags(projectPath, folder, fileName)
	if err != nil {
		return nil, err
	}

	deleteSet := util.SliceToSet(tagsToDelete)
	finalTags := util.Filter(existing, func(tag string) bool {
		return !deleteSet.Has(tag)
	})
	finalTags = sanitizeTags(finalTags)

	if err := WriteAttachmentTags(projectPath, folder, fileName, finalTags); err != nil {
		return nil, err
	}
	return finalTags, nil
}
