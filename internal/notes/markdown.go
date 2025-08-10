package notes

import (
	"regexp"
	"strings"
	"time"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/google/uuid"
	"gopkg.in/yaml.v3"
)

// Regex patterns used throughout the package
var (
	// Markdown link patterns
	LINK_REGEX  = regexp.MustCompile(`\[([^\]]+)\]\(([^)]+)\)`)
	MEDIA_REGEX = regexp.MustCompile(`!\[([^\]]*)\]\(([^)]+)\)`)
	IMAGE_REGEX = regexp.MustCompile(`!\[.*?\]\((.*?)\)`)
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
	JAVA_CODE_BLOCK_REGEX       = regexp.MustCompile("(?s)```java[^\n]*\n(.*?)```")
	PYTHON_CODE_BLOCK_REGEX     = regexp.MustCompile("(?s)```python[^\n]*\n(.*?)```")
	JAVASCRIPT_CODE_BLOCK_REGEX = regexp.MustCompile("(?s)```(?:javascript|js)[^\n]*\n(.*?)```")
	DRAWING_CODE_BLOCK_REGEX    = regexp.MustCompile("(?s)```drawing[^\n]*\n(.*?)```")
)

// URL Management Functions

// replaceFolderOfLocalURL updates the folder name in a localhost URL.
// Returns the original URL if it's not a localhost URL.
func replaceFolderOfLocalURL(url string, oldFolderName string, newFolderName string) string {
	if !strings.HasPrefix(url, util.FILE_SERVER_URL) && !strings.HasPrefix(url, util.INTERNAL_LINK_PREFIX) {
		return url
	}

	segments := strings.Split(url, "/")
	// An empty localhost url will have 3 segments: http:, '', and localhost
	if len(segments) <= 3 {
		return url
	}

	// Only replace if the URL contains the old folder name
	if segments[len(segments)-2] != oldFolderName {
		return url
	}

	segments[len(segments)-2] = newFolderName
	return strings.Join(segments, "/")
}

// replaceNoteNameOfLocalURL updates the note name (filename) in a localhost URL for a specific folder.
// Returns the original URL if it's not a localhost URL or not in the specified folder.
func replaceNoteNameOfLocalURL(url string, folderName string, newNoteName string) string {
	// Check if it's a localhost URL (either http://localhost or wails://localhost)
	if !strings.Contains(url, "localhost") {
		return url
	}

	segments := strings.Split(url, "/")
	// An empty localhost url will have 3 segments: http:, '', and localhost
	if len(segments) <= 3 {
		return url
	}

	// Check if the second-to-last segment matches the specified folder name
	// This works for both patterns:
	// - http://localhost:3000/folderName/fileName (5 segments)
	// - http://localhost:5890/notes/folderName/fileName (6 segments)
	folderIndex := len(segments) - 2
	if segments[folderIndex] != folderName {
		return url
	}

	// Replace the note name (last segment)
	segments[len(segments)-1] = newNoteName
	return strings.Join(segments, "/")
}

// UpdateFolderNameOfInternalLinksAndMedia finds and replaces folder names in internal URLs within markdown content.
// Updates both image and link URLs that are considered internal with the new folder name.
func UpdateFolderNameOfInternalLinksAndMedia(markdown string, oldFolderName string, newFolderName string) string {
	// Get all internal links and media from the markdown
	internalURLs := GetInternalLinksAndMedia(markdown)

	// Create a map of old URL to new URL for efficient replacement
	urlReplacements := make(map[string]string)
	for _, url := range internalURLs.Elements() {
		newURL := replaceFolderOfLocalURL(url, oldFolderName, newFolderName)
		if newURL != url {
			urlReplacements[url] = newURL
		}
	}

	// Replace image URLs
	markdown = MEDIA_REGEX.ReplaceAllStringFunc(markdown, func(match string) string {
		submatches := MEDIA_REGEX.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match
		}
		url := strings.TrimSpace(submatches[2])
		if newURL, exists := urlReplacements[url]; exists {
			return "![" + submatches[1] + "](" + newURL + ")"
		}
		return match
	})

	// Replace link URLs
	markdown = LINK_REGEX.ReplaceAllStringFunc(markdown, func(match string) string {
		submatches := LINK_REGEX.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match
		}
		url := strings.TrimSpace(submatches[2])
		if newURL, exists := urlReplacements[url]; exists {
			return "[" + submatches[1] + "](" + newURL + ")"
		}
		return match
	})

	return markdown
}

// UpdateNoteNameOfInternalLinksAndMedia finds and replaces note names in internal URLs within markdown content
// for a specific folder. Updates both image and link URLs that are in the specified folder with the new note name.
func UpdateNoteNameOfInternalLinksAndMedia(markdown string, folderName string, newNoteName string) string {
	// Get all internal links and media from the markdown
	internalURLs := GetInternalLinksAndMedia(markdown)

	// Create a map of old URL to new URL for efficient replacement
	urlReplacements := make(map[string]string)
	for _, url := range internalURLs.Elements() {
		newURL := replaceNoteNameOfLocalURL(url, folderName, newNoteName)
		if newURL != url {
			urlReplacements[url] = newURL
		}
	}

	// Replace image URLs
	markdown = MEDIA_REGEX.ReplaceAllStringFunc(markdown, func(match string) string {
		submatches := MEDIA_REGEX.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match
		}
		url := strings.TrimSpace(submatches[2])
		if newURL, exists := urlReplacements[url]; exists {
			return "![" + submatches[1] + "](" + newURL + ")"
		}
		return match
	})

	// Replace link URLs
	markdown = LINK_REGEX.ReplaceAllStringFunc(markdown, func(match string) string {
		submatches := LINK_REGEX.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match
		}
		url := strings.TrimSpace(submatches[2])
		if newURL, exists := urlReplacements[url]; exists {
			return "[" + submatches[1] + "](" + newURL + ")"
		}
		return match
	})

	return markdown
}

// isInternalURL determines if a URL is considered internal.
// Internal URLs include relative paths, localhost URLs, and non-HTTP protocols.
// External HTTP/HTTPS URLs (except localhost) are considered external.
func isInternalURL(url string) bool {
	url = strings.TrimSpace(url)

	if url == "" {
		return false
	}

	// Localhost URLs are internal
	if strings.HasPrefix(url, "http://localhost") || strings.HasPrefix(url, "wails://localhost") {
		return true
	}

	// External HTTP/HTTPS URLs are not internal
	if strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://") {
		return false
	}

	// Everything else is considered internal:
	// - Relative paths (./file.png, ../folder/file.md, file.txt)
	// - Absolute local paths (/path/to/file)
	// - File protocols (file://)
	// - Anchor links (#section)
	// - Email links (mailto:)
	return true
}

// Content Extraction Functions

// GetFirstImageSrc returns the source URL of the first image found in markdown.
// Returns an empty string if no image is found.
func GetFirstImageSrc(markdown string) string {
	match := IMAGE_REGEX.FindStringSubmatch(markdown)
	if len(match) >= 2 {
		return match[1]
	}
	return ""
}

// GetInternalLinksAndMedia extracts all internal links and media URLs from markdown.
// Returns a set of URL strings that are considered internal for efficient lookup.
func GetInternalLinksAndMedia(markdown string) util.Set[string] {
	urlSet := make(util.Set[string])

	// Extract media URLs
	mediaMatches := MEDIA_REGEX.FindAllStringSubmatch(markdown, -1)
	for _, match := range mediaMatches {
		if len(match) >= 3 {
			url := strings.TrimSpace(match[2])
			if isInternalURL(url) {
				urlSet.Add(url)
			}
		}
	}

	// Extract link URLs
	linkMatches := LINK_REGEX.FindAllStringSubmatch(markdown, -1)
	for _, match := range linkMatches {
		if len(match) >= 3 {
			url := strings.TrimSpace(match[2])
			if isInternalURL(url) {
				urlSet.Add(url)
			}
		}
	}

	return urlSet
}

// GetInternalLinksAndMediaAsSlice extracts all internal links and media URLs from markdown.
// Returns an array of URL strings that are considered internal.
func GetInternalLinksAndMediaAsSlice(markdown string) []string {
	urlSet := GetInternalLinksAndMedia(markdown)
	return urlSet.Elements()
}

// CalculateInternalLinksDiff calculates the differences between two sets of internal links.
// Returns newly added links and newly removed links.
func CalculateInternalLinksDiff(projectPath, folderOfNote, previousMarkdown, newMarkdown string) ([]string, []string) {
	previousLinks := GetInternalLinksAndMedia(previousMarkdown)
	newLinks := GetInternalLinksAndMedia(newMarkdown)

	// Calculate newly added links in new but not in previous or not in .attachments.json
	var newlyAddedLinks []string
	for _, link := range newLinks.Elements() {
		isNotInPreviousMarkdown := !previousLinks.Has(link)
		notesForAttachment, _ := GetNotesForAttachment(
			projectPath,
			folderOfNote,
			link,
		)
		if isNotInPreviousMarkdown || notesForAttachment == nil {
			newlyAddedLinks = append(newlyAddedLinks, link)
		}
	}

	// Calculate newly removed links (in previous but not in new)
	var newlyRemovedLinks []string
	for _, link := range previousLinks.Elements() {
		if !newLinks.Has(link) {
			newlyRemovedLinks = append(newlyRemovedLinks, link)
		}
	}

	return newlyAddedLinks, newlyRemovedLinks
}

// Content Filtering Functions

// excludeMediaTags removes image and video markdown syntax from content.
func excludeMediaTags(markdown string) string {
	// Remove image markdown syntax
	content := IMAGE_REGEX.ReplaceAllString(markdown, "")
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

// Content Processing Functions

// GetFirstLine returns the first meaningful line from markdown content.
// It excludes frontmatter, code blocks, media elements, and HTML tags.
// Returns up to the first 10 words from the first non-empty line.
func GetFirstLine(markdown string) string {
	// Clean the content step by step
	content := excludeFrontmatter(markdown)
	content = excludeCodeBlocks(content)
	content = excludeMediaTags(content)
	content = extractLinkText(content)

	// Remove HTML tags and markdown headers
	content = HTML_TAG_REGEX.ReplaceAllString(content, "")
	content = HEADER_REGEX.ReplaceAllString(content, "")

	// Find the first non-empty line
	lines := strings.Split(content, "\n")
	var firstLine string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			firstLine = trimmed
			break
		}
	}

	// Limit to first 10 words
	words := strings.Fields(firstLine)
	if len(words) > 10 {
		words = words[:10]
	}

	return strings.Join(words, " ")
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

// GetIdFromFrontmatter extracts the id field from YAML frontmatter.
// Returns the id string and a boolean indicating whether the id field was found and is a valid string.
func GetIdFromFrontmatter(markdown string) (string, bool) {
	frontmatter, ok := parseFrontmatter(markdown)
	if !ok {
		return "", false
	}

	if id, exists := frontmatter["id"]; exists {
		if idStr, ok := id.(string); ok {
			return idStr, true
		}
	}

	return "", false
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

// createFrontmatterWithId creates a new frontmatter section with the given ID and removes any existing frontmatter.
func createFrontmatterWithId(markdown, id string) string {
	newFrontmatter := "---\nid: " + id + "\n---\n"
	contentWithoutFrontmatter := FRONTMATTER_REGEX.ReplaceAllString(markdown, "")
	return newFrontmatter + contentWithoutFrontmatter
}

// EnsureIdInFrontmatter checks if an id exists in the frontmatter, and if not, creates a new UUID and adds it.
// Returns the updated markdown with the id and the id value that was used (existing or newly created).
func EnsureIdInFrontmatter(markdown string) (string, string) {
	if existingId, exists := GetIdFromFrontmatter(markdown); exists {
		return markdown, existingId
	}

	newId := uuid.New().String()

	// Check if frontmatter exists
	frontmatterMatch := FRONTMATTER_REGEX.FindString(markdown)
	if frontmatterMatch == "" {
		return createFrontmatterWithId(markdown, newId), newId
	}

	// Parse existing frontmatter
	frontmatter, ok := parseFrontmatter(markdown)
	if !ok {
		return createFrontmatterWithId(markdown, newId), newId
	}

	// Add id to existing frontmatter
	frontmatter["id"] = newId

	// Convert back to YAML
	yamlBytes, err := yaml.Marshal(frontmatter)
	if err != nil {
		return createFrontmatterWithId(markdown, newId), newId
	}

	// Replace the old frontmatter with the new one
	newFrontmatter := "---\n" + string(yamlBytes) + "---\n"
	contentWithoutFrontmatter := FRONTMATTER_REGEX.ReplaceAllString(markdown, "")
	return newFrontmatter + contentWithoutFrontmatter, newId
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

// GetCodeContentForLanguage extracts code block contents for a specific language.
// Returns a slice of strings containing the code from blocks with the specified language.
func GetCodeContentForLanguage(markdown string, language string) []string {
	// Create a regex pattern for the specific language
	pattern := "(?s)```" + regexp.QuoteMeta(language) + "[^\\n]*\\n(.*?)```"
	langRegex := regexp.MustCompile(pattern)

	return getCodeContentWithLangRegex(markdown, langRegex, 1)
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

// Boolean Check Functions

// hasCodeByRegex is a helper function that checks if code blocks exist using a regex pattern.
func hasCodeByRegex(markdown string, regex *regexp.Regexp) bool {
	return regex.MatchString(markdown)
}

// HasDrawing returns true if the markdown contains a drawing code block.
func HasDrawing(markdown string) bool {
	return hasCodeByRegex(markdown, DRAWING_CODE_BLOCK_REGEX)
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
