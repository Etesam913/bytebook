package notes

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/etesam913/bytebook/internal/util"
	"gopkg.in/yaml.v3"
)

// Regex patterns used throughout the package
var (
	// Markdown link patterns
	LINK_REGEX  = regexp.MustCompile(`\[([^\]]+)\]\(([^)]+)\)`)
	MEDIA_REGEX = regexp.MustCompile(`!\[.*?\]\((.*?)\)`)
	VIDEO_REGEX = regexp.MustCompile(`\[video\]\(.*?\)`)

	// Content filtering patterns
	CODE_BLOCK_REGEX  = regexp.MustCompile("(?s)```.*?```|~~~.*?~~~")
	FRONTMATTER_REGEX = regexp.MustCompile(`(?s)^---.*?---\s*`)
	HTML_TAG_REGEX    = regexp.MustCompile(`<[^>]*>`)
	HEADER_REGEX      = regexp.MustCompile(`(?m)^#+\s*`)

	// Language-specific code block patterns
	// Support optional attributes after the language (CommonMark info string), e.g. ```python id="..."
	CODE_BLOCK_WITH_LANG_REGEX  = regexp.MustCompile("(?s)```(?:([a-zA-Z0-9_+-]+)[^\n]*)?\n(.*?)```")
	GO_CODE_BLOCK_REGEX         = regexp.MustCompile("(?s)```go[^\n]*\n(.*?)```")
	JAVA_CODE_BLOCK_REGEX       = regexp.MustCompile("(?s)```java\\b[^\n]*\n(.*?)```")
	PYTHON_CODE_BLOCK_REGEX     = regexp.MustCompile("(?s)```python[^\n]*\n(.*?)```")
	JAVASCRIPT_CODE_BLOCK_REGEX = regexp.MustCompile("(?s)```(?:javascript|js)[^\n]*\n(.*?)```")
)

// Content Filtering Functions

// excludeMediaTags removes image and video markdown syntax from content.
func excludeMediaTags(markdown string) string {
	// Remove image markdown syntax
	content := MEDIA_REGEX.ReplaceAllString(markdown, "")
	// Remove video markdown syntax
	content = VIDEO_REGEX.ReplaceAllString(content, "")
	return content
}

// excludeCodeBlocks removes all code blocks (``` or ~~~ delimited) from markdown.
func excludeCodeBlocks(markdown string) string {
	// Find and replace all code blocks with empty string
	codeBlocks := CODE_BLOCK_REGEX.FindAllString(markdown, -1)
	for _, block := range codeBlocks {
		markdown = strings.Replace(markdown, block, "", 1)
	}
	return strings.TrimSpace(markdown)
}

// excludeFrontmatter removes YAML frontmatter (content between ---) from markdown.
func excludeFrontmatter(markdown string) string {
	return strings.TrimSpace(FRONTMATTER_REGEX.ReplaceAllString(markdown, ""))
}

// extractLinkText replaces markdown links with just their text content.
// For example: [link text](url) becomes "link text".
func extractLinkText(markdown string) string {
	return LINK_REGEX.ReplaceAllString(markdown, "$1")
}

// Frontmatter Functions

// parseFrontmatter is a helper function that extracts and parses YAML frontmatter from markdown.
// Returns the parsed frontmatter as a map and a boolean indicating success.
func parseFrontmatter(markdown string) (map[string]interface{}, bool) {
	frontmatterMatch := FRONTMATTER_REGEX.FindStringSubmatch(markdown)
	if len(frontmatterMatch) < 1 {
		return nil, false
	}

	// Extract the YAML content (remove the --- delimiters)
	yamlContent := strings.Trim(frontmatterMatch[0], "-")
	yamlContent = strings.TrimSpace(yamlContent)

	// Parse YAML to extract frontmatter
	var frontmatter map[string]interface{}
	if err := yaml.Unmarshal([]byte(yamlContent), &frontmatter); err != nil {
		return nil, false
	}

	return frontmatter, true
}

// GetLastUpdatedFromFrontmatter extracts the lastUpdated field from YAML frontmatter.
// Returns the lastUpdated string and a boolean indicating whether the field was found and is a valid string or time.Time.
func GetLastUpdatedFromFrontmatter(markdown string) (string, bool) {
	frontmatter, ok := parseFrontmatter(markdown)
	if !ok {
		return "", false
	}

	if lastUpdated, exists := frontmatter["lastUpdated"]; exists {
		// Handle string type
		if lastUpdatedStr, ok := lastUpdated.(string); ok {
			return lastUpdatedStr, true
		}
		// Handle time.Time type (YAML parser converts ISO 8601 dates automatically)
		if lastUpdatedTime, ok := lastUpdated.(time.Time); ok {
			return lastUpdatedTime.Format(time.RFC3339), true
		}
	}

	return "", false
}

// GetCreatedDateFromFrontmatter extracts the createdDate field from YAML frontmatter.
// Returns the createdDate string and a boolean indicating whether the field was found and is a valid string or time.Time.
func GetCreatedDateFromFrontmatter(markdown string) (string, bool) {
	frontmatter, ok := parseFrontmatter(markdown)
	if !ok {
		return "", false
	}

	if createdDate, exists := frontmatter["createdDate"]; exists {
		// Handle string type
		if createdDateStr, ok := createdDate.(string); ok {
			return createdDateStr, true
		}
		// Handle time.Time type (YAML parser converts ISO 8601 dates automatically)
		if createdDateTime, ok := createdDate.(time.Time); ok {
			return createdDateTime.Format(time.RFC3339), true
		}
	}

	return "", false
}

// GetTagsFromFrontmatter extracts the tags field from YAML frontmatter.
// Returns the tags slice and a boolean indicating whether the tags field was found and is a valid slice.
func GetTagsFromFrontmatter(markdown string) ([]string, bool) {
	frontmatter, ok := parseFrontmatter(markdown)
	if !ok {
		return []string{}, false
	}

	if tags, exists := frontmatter["tags"]; exists {
		// Handle slice type ([]interface{})
		if tagsSlice, ok := tags.([]interface{}); ok {
			stringTags := make([]string, 0, len(tagsSlice))
			for _, tag := range tagsSlice {
				if tagStr, ok := tag.(string); ok {
					stringTags = append(stringTags, tagStr)
				}
			}
			return stringTags, true
		}
		// Handle single string converted to slice
		if tagStr, ok := tags.(string); ok {
			return []string{tagStr}, true
		}
	}

	return []string{}, false
}

// updateFrontmatterWithTags updates the frontmatter in markdown with the provided tags.
// If no frontmatter exists, it creates new frontmatter with the tags.
// Returns the updated markdown content.
func updateFrontmatterWithTags(markdown string, tags []string) string {
	frontmatter, hasFrontmatter := parseFrontmatter(markdown)
	if !hasFrontmatter {
		frontmatter = make(map[string]interface{})
	}

	// Update the tags in frontmatter
	if len(tags) > 0 {
		frontmatter["tags"] = tags
	} else {
		delete(frontmatter, "tags")
	}

	yamlBytes, err := yaml.Marshal(frontmatter)
	if err != nil {
		return markdown
	}
	yamlContent := strings.TrimSpace(string(yamlBytes))

	if hasFrontmatter {
		// Replace existing frontmatter
		return FRONTMATTER_REGEX.ReplaceAllString(markdown, "---\n"+yamlContent+"\n---\n")
	} else {
		// Add new frontmatter at the beginning
		if len(tags) > 0 {
			return "---\n" + yamlContent + "\n---\n\n" + markdown
		}
		return markdown
	}
}

// Text Content Functions

// GetTextContent extracts all text content excluding image/media URLs and code blocks.
// Returns the cleaned text content as a single string.
func GetTextContent(markdown string) string {
	// Clean the content step by step
	content := excludeFrontmatter(markdown)
	content = excludeCodeBlocks(content)
	content = excludeMediaTags(content)
	content = extractLinkText(content)

	// Remove HTML tags and markdown headers
	content = HTML_TAG_REGEX.ReplaceAllString(content, "")
	content = HEADER_REGEX.ReplaceAllString(content, "")

	return strings.TrimSpace(content)
}

// Code Content Functions

// getCodeContentWithLangRegex is a helper function that extracts code content from language-aware regex.
func getCodeContentWithLangRegex(markdown string, regex *regexp.Regexp, contentIndex int) []string {
	var codeContents []string

	matches := regex.FindAllStringSubmatch(markdown, -1)
	for _, match := range matches {
		if len(match) > contentIndex {
			codeContent := strings.TrimSpace(match[contentIndex])
			if codeContent != "" {
				codeContents = append(codeContents, codeContent)
			}
		}
	}

	return codeContents
}

// GetCodeContent extracts all code block contents regardless of language.
// Returns a slice of strings containing the code from each block.
func GetCodeContent(markdown string) []string {
	return getCodeContentWithLangRegex(markdown, CODE_BLOCK_WITH_LANG_REGEX, 2)
}

// GetGoCodeContent extracts all Go code block contents.
// Returns a slice of strings containing the Go code from each block.
func GetGoCodeContent(markdown string) []string {
	return getCodeContentWithLangRegex(markdown, GO_CODE_BLOCK_REGEX, 1)
}

// GetJavaCodeContent extracts all Java code block contents.
// Returns a slice of strings containing the Java code from each block.
func GetJavaCodeContent(markdown string) []string {
	return getCodeContentWithLangRegex(markdown, JAVA_CODE_BLOCK_REGEX, 1)
}

// GetPythonCodeContent extracts all Python code block contents.
// Returns a slice of strings containing the Python code from each block.
func GetPythonCodeContent(markdown string) []string {
	return getCodeContentWithLangRegex(markdown, PYTHON_CODE_BLOCK_REGEX, 1)
}

// GetJavaScriptCodeContent extracts all JavaScript code block contents.
// Returns a slice of strings containing the JavaScript code from each block.
func GetJavaScriptCodeContent(markdown string) []string {
	return getCodeContentWithLangRegex(markdown, JAVASCRIPT_CODE_BLOCK_REGEX, 1)
}

// GetInternalLinksFromBody extracts all internal link targets from markdown content.
// It finds both regular links [text](/notes/...) and image links ![alt](/notes/...).
// Returns a deduplicated slice of link paths starting with /notes/.
func GetInternalLinksFromBody(markdown string) []string {
	seen := make(map[string]bool)
	var links []string

	// Extract URLs from regular links (capture group 2)
	for _, match := range LINK_REGEX.FindAllStringSubmatch(markdown, -1) {
		url := match[2]
		if strings.HasPrefix(url, "/notes/") && !seen[url] {
			seen[url] = true
			links = append(links, url)
		}
	}

	// Extract URLs from image links (capture group 1)
	for _, match := range MEDIA_REGEX.FindAllStringSubmatch(markdown, -1) {
		url := match[1]
		if strings.HasPrefix(url, "/notes/") && !seen[url] {
			seen[url] = true
			links = append(links, url)
		}
	}

	return links
}

// Tag Management Functions

// GetTagsFromNote reads a note file and extracts tags from its frontmatter.
// The folderAndNoteName parameter should be in format "folderName/noteName.md".
// Returns the tags slice, a boolean indicating if tags exist, and any file reading error.
func GetTagsFromNote(projectPath string, folderAndNoteName string) ([]string, bool, error) {
	// Construct the full file path
	noteFilePath := filepath.Join(projectPath, "notes", folderAndNoteName)

	// Read the file content
	content, err := os.ReadFile(noteFilePath)
	if err != nil {
		return []string{}, false, err
	}

	// Extract tags from the frontmatter
	tags, exists := GetTagsFromFrontmatter(string(content))
	return tags, exists, nil
}

// AddTagsToNote adds the specified tags to a note's frontmatter.
// It reads the existing tags from the frontmatter, adds new tags while removing duplicates, and writes the file back.
// The folderAndNoteName parameter should be in format "folderName/noteName.md".
// Returns an error if the file cannot be read, parsed, or written.
func AddTagsToNote(projectPath string, folderAndNoteName string, newTags []string) error {
	// Construct the full file path
	noteFilePath := filepath.Join(projectPath, "notes", folderAndNoteName)

	// Read the existing file content
	content, err := os.ReadFile(noteFilePath)
	if err != nil {
		return err
	}

	markdown := string(content)

	existingTags, _ := GetTagsFromFrontmatter(markdown)

	// Use util.Set for deduplication
	tagSet := util.SliceToSet(existingTags)

	// Add new tags to the set
	for _, tag := range newTags {
		trimmed := strings.TrimSpace(tag)
		if trimmed != "" {
			tagSet.Add(trimmed)
		}
	}

	// Convert set back to slice
	finalTags := tagSet.Elements()

	updatedMarkdown := updateFrontmatterWithTags(markdown, finalTags)

	return os.WriteFile(noteFilePath, []byte(updatedMarkdown), 0644)
}

// DeleteTagsFromNote removes the specified tags from a note's frontmatter.
// It reads the existing tags from the frontmatter, removes the specified tags, and writes the file back.
// The folderAndNoteName parameter should be in format "folderName/noteName.md".
// Returns the updated tags and an error if the file cannot be read, parsed, or written.
func DeleteTagsFromNote(projectPath string, folderAndNoteName string, tagsToDelete []string) ([]string, error) {
	// Construct the full file path
	noteFilePath := filepath.Join(projectPath, "notes", folderAndNoteName)

	content, err := os.ReadFile(noteFilePath)
	if err != nil {
		return nil, err
	}

	markdown := string(content)

	existingTags, hasTags := GetTagsFromFrontmatter(markdown)
	if !hasTags {
		return []string{}, nil
	}

	// Create a map of tags to delete for efficient lookup
	deleteMap := util.SliceToSet(tagsToDelete)

	finalTags := util.Filter(existingTags, func(tag string) bool {
		return !deleteMap.Has(tag)
	})

	updatedMarkdown := updateFrontmatterWithTags(markdown, finalTags)

	err = os.WriteFile(noteFilePath, []byte(updatedMarkdown), 0644)
	if err != nil {
		return nil, err
	}

	return finalTags, nil
}

// Boolean Check Functions

// hasCodeByRegex is a helper function that checks if code blocks exist using a regex pattern.
func hasCodeByRegex(markdown string, regex *regexp.Regexp) bool {
	return regex.MatchString(markdown)
}

// HasCode returns true if the markdown contains any code blocks with language identifiers.
func HasCode(markdown string) bool {
	matches := CODE_BLOCK_WITH_LANG_REGEX.FindAllStringSubmatch(markdown, -1)
	for _, match := range matches {
		if len(match) >= 2 {
			// Check if there's a language identifier (not empty)
			lang := strings.TrimSpace(match[1])
			if lang != "" {
				return true
			}
		}
	}
	return false
}

// HasGoCode returns true if the markdown contains Go code blocks.
func HasGoCode(markdown string) bool {
	return hasCodeByRegex(markdown, GO_CODE_BLOCK_REGEX)
}

// HasJavaCode returns true if the markdown contains Java code blocks.
func HasJavaCode(markdown string) bool {
	return hasCodeByRegex(markdown, JAVA_CODE_BLOCK_REGEX)
}

// HasPythonCode returns true if the markdown contains Python code blocks.
func HasPythonCode(markdown string) bool {
	return hasCodeByRegex(markdown, PYTHON_CODE_BLOCK_REGEX)
}

// HasJavaScriptCode returns true if the markdown contains JavaScript code blocks.
func HasJavaScriptCode(markdown string) bool {
	return hasCodeByRegex(markdown, JAVASCRIPT_CODE_BLOCK_REGEX)
}
