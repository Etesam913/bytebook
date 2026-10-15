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

	// Captures the language tag (group 1) and body (group 2); the tag may include attributes, e.g. ```python id="..."
	CODE_BLOCK_WITH_LANG_REGEX = regexp.MustCompile("(?s)```(?:([a-zA-Z0-9_+-]+)[^\n]*)?\n(.*?)```")
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
	return strings.TrimSpace(CODE_BLOCK_REGEX.ReplaceAllString(markdown, ""))
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

// frontmatterTime returns a frontmatter date field as a string.
// YAML converts ISO 8601 values to time.Time, which is formatted as RFC3339.
func frontmatterTime(frontmatter map[string]interface{}, key string) (string, bool) {
	switch value := frontmatter[key].(type) {
	case string:
		return value, true
	case time.Time:
		return value.Format(time.RFC3339), true
	}
	return "", false
}

// tagsFromFrontmatter extracts the tags field from parsed frontmatter.
// Returns the tags slice and a boolean indicating whether the tags field was found and is a valid slice.
func tagsFromFrontmatter(frontmatter map[string]interface{}) ([]string, bool) {
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

// GetTagsFromFrontmatter extracts the tags field from YAML frontmatter in markdown.
func GetTagsFromFrontmatter(markdown string) ([]string, bool) {
	frontmatter, _ := parseFrontmatter(markdown)
	return tagsFromFrontmatter(frontmatter)
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
		return FRONTMATTER_REGEX.ReplaceAllLiteralString(markdown, "---\n"+yamlContent+"\n---\n")
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

// CodeBlocks summarizes the fenced code blocks in a note, grouped by language.
type CodeBlocks struct {
	// Contents of non-empty blocks
	All, Go, Java, Python, JavaScript []string

	// Presence flags. Empty blocks still count, so these can be true when the content slices are empty.
	HasLanguage, HasGo, HasJava, HasPython, HasJavaScript bool
}

// isJavaLang reports whether a fence tag is java. Like the old `java\b` regex, it also accepts tags such as java-17.
func isJavaLang(lang string) bool {
	rest, found := strings.CutPrefix(lang, "java")
	return found && (rest == "" || rest[0] == '-' || rest[0] == '+')
}

// ParseCodeBlocks scans the code blocks in markdown once and groups them by language.
func ParseCodeBlocks(markdown string) CodeBlocks {
	var blocks CodeBlocks
	for _, match := range CODE_BLOCK_WITH_LANG_REGEX.FindAllStringSubmatch(markdown, -1) {
		lang, content := match[1], strings.TrimSpace(match[2])
		blocks.HasLanguage = blocks.HasLanguage || lang != ""

		var group *[]string
		switch {
		case strings.HasPrefix(lang, "go"):
			blocks.HasGo = true
			group = &blocks.Go
		case isJavaLang(lang):
			blocks.HasJava = true
			group = &blocks.Java
		case strings.HasPrefix(lang, "python"):
			blocks.HasPython = true
			group = &blocks.Python
		case strings.HasPrefix(lang, "javascript"), strings.HasPrefix(lang, "js"):
			blocks.HasJavaScript = true
			group = &blocks.JavaScript
		}

		if content == "" {
			continue
		}
		blocks.All = append(blocks.All, content)
		if group != nil {
			*group = append(*group, content)
		}
	}
	return blocks
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
// Returns the updated tags and an error if the file cannot be read, parsed, or written.
func AddTagsToNote(projectPath string, folderAndNoteName string, newTags []string) ([]string, error) {
	// Construct the full file path
	noteFilePath := filepath.Join(projectPath, "notes", folderAndNoteName)

	// Read the existing file content
	content, err := os.ReadFile(noteFilePath)
	if err != nil {
		return nil, err
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

	if err := os.WriteFile(noteFilePath, []byte(updatedMarkdown), 0644); err != nil {
		return nil, err
	}
	return finalTags, nil
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

// Search Metadata

// MarkdownMetadata is the frontmatter and code data the search index stores for a note.
type MarkdownMetadata struct {
	LastUpdated string
	CreatedDate string
	Tags        []string
	Code        CodeBlocks
}

// ParseMarkdownMetadata parses the frontmatter and code blocks of markdown in one pass each.
func ParseMarkdownMetadata(markdown string) MarkdownMetadata {
	frontmatter, _ := parseFrontmatter(markdown)
	lastUpdated, _ := frontmatterTime(frontmatter, "lastUpdated")
	createdDate, _ := frontmatterTime(frontmatter, "createdDate")
	tags, _ := tagsFromFrontmatter(frontmatter)

	return MarkdownMetadata{
		LastUpdated: lastUpdated,
		CreatedDate: createdDate,
		Tags:        tags,
		Code:        ParseCodeBlocks(markdown),
	}
}
