package notes

import (
	"regexp"
	"strings"

	"github.com/etesam913/bytebook/internal/util"
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
	HEADER_REGEX      = regexp.MustCompile(`^#+\s+`)
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

// IsInternalURL determines if a URL is considered internal.
// Internal URLs include relative paths, localhost URLs, and non-HTTP protocols.
// External HTTP/HTTPS URLs (except localhost) are considered external.
func IsInternalURL(url string) bool {
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
			if IsInternalURL(url) {
				urlSet.Add(url)
			}
		}
	}

	// Extract link URLs
	linkMatches := LINK_REGEX.FindAllStringSubmatch(markdown, -1)
	for _, match := range linkMatches {
		if len(match) >= 3 {
			url := strings.TrimSpace(match[2])
			if IsInternalURL(url) {
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

// ExcludeMediaTags removes image and video markdown syntax from content.
func ExcludeMediaTags(markdown string) string {
	// Remove image markdown syntax
	content := IMAGE_REGEX.ReplaceAllString(markdown, "")
	// Remove video markdown syntax
	content = VIDEO_REGEX.ReplaceAllString(content, "")
	return content
}

// ExcludeCodeBlocks removes all code blocks (``` or ~~~ delimited) from markdown.
func ExcludeCodeBlocks(markdown string) string {
	// Find and replace all code blocks with empty string
	codeBlocks := CODE_BLOCK_REGEX.FindAllString(markdown, -1)
	for _, block := range codeBlocks {
		markdown = strings.Replace(markdown, block, "", 1)
	}
	return strings.TrimSpace(markdown)
}

// ExcludeFrontmatter removes YAML frontmatter (content between ---) from markdown.
func ExcludeFrontmatter(markdown string) string {
	return strings.TrimSpace(FRONTMATTER_REGEX.ReplaceAllString(markdown, ""))
}

// ExtractLinkText replaces markdown links with just their text content.
// For example: [link text](url) becomes "link text".
func ExtractLinkText(markdown string) string {
	return LINK_REGEX.ReplaceAllString(markdown, "$1")
}

// Content Processing Functions

// GetFirstLine returns the first meaningful line from markdown content.
// It excludes frontmatter, code blocks, media elements, and HTML tags.
// Returns up to the first 10 words from the first non-empty line.
func GetFirstLine(markdown string) string {
	// Clean the content step by step
	content := ExcludeFrontmatter(markdown)
	content = ExcludeCodeBlocks(content)
	content = ExcludeMediaTags(content)
	content = ExtractLinkText(content)

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
