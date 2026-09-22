package notes

import (
	"path/filepath"

	"github.com/etesam913/bytebook/internal/notes/sidecar"
)

// Tags live in frontmatter for markdown notes and in the JSON sidecar for
// attachments. These helpers pick the store from the file extension.

func isMarkdownFile(folderAndFileName string) bool {
	return filepath.Ext(folderAndFileName) == ".md"
}

// GetTags returns the tags for the note or attachment at notes/<folderAndFileName>.
func GetTags(projectPath, folderAndFileName string) ([]string, error) {
	if isMarkdownFile(folderAndFileName) {
		tags, _, err := GetTagsFromNote(projectPath, folderAndFileName)
		return tags, err
	}
	return sidecar.GetTags(projectPath, folderAndFileName)
}

// AddTags merges newTags into the file's tags and returns the resulting set.
func AddTags(projectPath, folderAndFileName string, newTags []string) ([]string, error) {
	if isMarkdownFile(folderAndFileName) {
		return AddTagsToNote(projectPath, folderAndFileName, newTags)
	}
	return sidecar.AddTags(projectPath, folderAndFileName, newTags)
}

// DeleteTags removes tagsToDelete from the file's tags and returns the resulting set.
func DeleteTags(projectPath, folderAndFileName string, tagsToDelete []string) ([]string, error) {
	if isMarkdownFile(folderAndFileName) {
		return DeleteTagsFromNote(projectPath, folderAndFileName, tagsToDelete)
	}
	return sidecar.DeleteTags(projectPath, folderAndFileName, tagsToDelete)
}
