package notes

import (
	"errors"
	"os"
	"path/filepath"
	"strings"

	"github.com/etesam913/bytebook/internal/util"
)

const CodeResultsSidecarVersion = 1

// FileSidecar represents JSON stored alongside a file.
// Example filename: photo.jpg -> .photo.json
type FileSidecar struct {
	Tags        []string            `json:"tags,omitempty"`
	CodeResults *CodeResultsSidecar `json:"codeResults,omitempty"`
}

type CodeBlockResult struct {
	CodeBlockID      string `json:"codeBlockId"`
	LastRan          string `json:"lastRan"`
	AreResultsHidden bool   `json:"areResultsHidden"`
	ResultHTML       string `json:"resultHtml"`
}

type CodeResultsSidecar struct {
	Version    int               `json:"version"`
	CodeBlocks []CodeBlockResult `json:"codeBlocks"`
}

type NoteMarkdownWithCodeResults struct {
	Markdown    string             `json:"markdown"`
	CodeResults CodeResultsSidecar `json:"codeResults"`
}

// GetFileSidecarPath builds the absolute path to the sidecar for a project file.
func GetFileSidecarPath(projectPath, folder, fileName string) string {
	return constructFileSidecarPath(filepath.Join(projectPath, "notes", folder, fileName))
}

// ConstructCodeResultsSidecarPath builds the sidecar path for a markdown note path.
func ConstructCodeResultsSidecarPath(notePath string) string {
	return constructFileSidecarPath(notePath)
}

func constructFileSidecarPath(filePath string) string {
	dir := filepath.Dir(filePath)
	fileName := filepath.Base(filePath)
	ext := filepath.Ext(fileName)
	base := strings.TrimSuffix(fileName, ext)
	return filepath.Join(dir, "."+base+".json")
}

func isFileSidecarName(fileName string) bool {
	return strings.HasPrefix(fileName, ".") && strings.HasSuffix(fileName, ".json") && len(fileName) > len(".json")+1
}

func notePathFromFileSidecarPath(sidecarPath string) string {
	fileName := filepath.Base(sidecarPath)
	if !isFileSidecarName(fileName) {
		return ""
	}
	noteName := strings.TrimSuffix(strings.TrimPrefix(fileName, "."), ".json") + ".md"
	return filepath.Join(filepath.Dir(sidecarPath), noteName)
}

func readFileSidecar(sidecarPath string) (FileSidecar, error) {
	var sidecar FileSidecar
	if err := util.ReadJsonFromPath(sidecarPath, &sidecar); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return FileSidecar{}, nil
		}
		return FileSidecar{}, err
	}
	return sidecar, nil
}

func writeFileSidecar(sidecarPath string, sidecar FileSidecar) error {
	if err := os.MkdirAll(filepath.Dir(sidecarPath), 0755); err != nil {
		return err
	}
	return util.WriteJsonToPath(sidecarPath, sidecar)
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
	sidecar, err := readFileSidecar(GetFileSidecarPath(projectPath, folder, fileName))
	if err != nil {
		return []string{}, err
	}
	return sanitizeTags(sidecar.Tags), nil
}

// WriteAttachmentTags writes the tags to the sidecar file, creating it if necessary.
func WriteAttachmentTags(projectPath, folder, fileName string, tags []string) error {
	sidecarPath := GetFileSidecarPath(projectPath, folder, fileName)
	sidecar, err := readFileSidecar(sidecarPath)
	if err != nil {
		return err
	}
	sidecar.Tags = sanitizeTags(tags)
	return writeFileSidecar(sidecarPath, sidecar)
}

// EnsureAttachmentSidecar makes sure a sidecar exists for the attachment. If it already
// exists, it is left untouched. If missing, it is created with an empty tag list.
func EnsureAttachmentSidecar(projectPath, folder, fileName string) error {
	sidecarPath := GetFileSidecarPath(projectPath, folder, fileName)
	if _, err := os.Stat(sidecarPath); err == nil {
		return nil
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return writeFileSidecar(sidecarPath, FileSidecar{Tags: []string{}})
}

// DeleteAttachmentSidecar removes the sidecar file if it exists.
func DeleteAttachmentSidecar(projectPath, folder, fileName string) error {
	sidecarPath := GetFileSidecarPath(projectPath, folder, fileName)
	if _, err := os.Stat(sidecarPath); errors.Is(err, os.ErrNotExist) {
		return nil
	}
	return os.Remove(sidecarPath)
}

// RenameAttachmentSidecar moves/renames the sidecar alongside an attachment rename.
// If the old sidecar does not exist, it will create a new one for the destination.
func RenameAttachmentSidecar(projectPath, oldFolder, oldFileName, newFolder, newFileName string) error {
	tags, err := ReadAttachmentTags(projectPath, oldFolder, oldFileName)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
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

func ReadCodeResultsSidecar(notePath string) (CodeResultsSidecar, error) {
	sidecar := CodeResultsSidecar{
		Version:    CodeResultsSidecarVersion,
		CodeBlocks: []CodeBlockResult{},
	}

	fileSidecar, err := readFileSidecar(ConstructCodeResultsSidecarPath(notePath))
	if err != nil {
		return CodeResultsSidecar{}, err
	}
	if fileSidecar.CodeResults == nil {
		return sidecar, nil
	}
	sidecar = *fileSidecar.CodeResults
	if sidecar.Version == 0 {
		sidecar.Version = CodeResultsSidecarVersion
	}
	if sidecar.CodeBlocks == nil {
		sidecar.CodeBlocks = []CodeBlockResult{}
	}
	return sidecar, nil
}

func WriteCodeResultsSidecar(notePath string, sidecar CodeResultsSidecar) error {
	filtered := make([]CodeBlockResult, 0, len(sidecar.CodeBlocks))
	seenIDs := make(map[string]struct{}, len(sidecar.CodeBlocks))
	for _, codeBlock := range sidecar.CodeBlocks {
		if codeBlock.CodeBlockID == "" {
			continue
		}
		if codeBlock.ResultHTML == "" {
			continue
		}
		if _, exists := seenIDs[codeBlock.CodeBlockID]; exists {
			continue
		}
		seenIDs[codeBlock.CodeBlockID] = struct{}{}
		filtered = append(filtered, codeBlock)
	}

	sidecarPath := ConstructCodeResultsSidecarPath(notePath)
	fileSidecar, err := readFileSidecar(sidecarPath)
	if err != nil {
		return err
	}
	if len(filtered) == 0 {
		fileSidecar.CodeResults = nil
		if len(fileSidecar.Tags) == 0 {
			if err := os.Remove(sidecarPath); err != nil && !errors.Is(err, os.ErrNotExist) {
				return err
			}
			return nil
		}
		return writeFileSidecar(sidecarPath, fileSidecar)
	}

	fileSidecar.CodeResults = &CodeResultsSidecar{
		Version:    CodeResultsSidecarVersion,
		CodeBlocks: filtered,
	}
	return writeFileSidecar(sidecarPath, fileSidecar)
}

func MoveCodeResultsSidecar(oldNotePath, newNotePath string) error {
	oldSidecarPath := ConstructCodeResultsSidecarPath(oldNotePath)
	if _, err := os.Stat(oldSidecarPath); errors.Is(err, os.ErrNotExist) {
		return nil
	} else if err != nil {
		return err
	}

	newSidecarPath := ConstructCodeResultsSidecarPath(newNotePath)
	if _, err := os.Stat(newSidecarPath); err == nil {
		return errors.New("code results sidecar already exists at destination")
	} else if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(newSidecarPath), 0755); err != nil {
		return err
	}
	return os.Rename(oldSidecarPath, newSidecarPath)
}
