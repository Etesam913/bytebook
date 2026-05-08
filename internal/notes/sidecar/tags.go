package sidecar

import (
	"strings"

	"github.com/etesam913/bytebook/internal/util"
)

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

// ReadTags returns the tags stored in the file's sidecar, or an empty slice if absent.
func ReadTags(projectPath, folder, fileName string) ([]string, error) {
	data, err := read(PathForFile(projectPath, folder, fileName))
	if err != nil {
		return []string{}, err
	}
	return sanitizeTags(data.Tags), nil
}

// WriteTags persists tags into the file's sidecar, preserving any other fields (e.g. CodeResults).
func WriteTags(projectPath, folder, fileName string, tags []string) error {
	sidecarPath := PathForFile(projectPath, folder, fileName)
	data, err := read(sidecarPath)
	if err != nil {
		return err
	}
	data.Tags = sanitizeTags(tags)
	return write(sidecarPath, data)
}

// GetTags reads sidecar tags for the file at folder/fileName.
func GetTags(projectPath, folderAndFileName string) ([]string, error) {
	folder, fileName := util.SplitFolderAndFile(folderAndFileName)
	return ReadTags(projectPath, folder, fileName)
}

// AddTags merges newTags into the file's sidecar tags and returns the resulting set.
func AddTags(projectPath, folderAndFileName string, newTags []string) ([]string, error) {
	folder, fileName := util.SplitFolderAndFile(folderAndFileName)
	existing, err := ReadTags(projectPath, folder, fileName)
	if err != nil {
		return nil, err
	}
	finalTags := sanitizeTags(append(existing, newTags...))
	if err := WriteTags(projectPath, folder, fileName, finalTags); err != nil {
		return nil, err
	}
	return finalTags, nil
}

// DeleteTags removes tagsToDelete from the file's sidecar tags and returns the resulting set.
func DeleteTags(projectPath, folderAndFileName string, tagsToDelete []string) ([]string, error) {
	folder, fileName := util.SplitFolderAndFile(folderAndFileName)
	existing, err := ReadTags(projectPath, folder, fileName)
	if err != nil {
		return nil, err
	}
	deleteSet := util.SliceToSet(tagsToDelete)
	finalTags := sanitizeTags(util.Filter(existing, func(tag string) bool {
		return !deleteSet.Has(tag)
	}))
	if err := WriteTags(projectPath, folder, fileName, finalTags); err != nil {
		return nil, err
	}
	return finalTags, nil
}
