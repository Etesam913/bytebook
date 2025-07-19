package notes

import (
	"regexp"
	"strings"
)

// Regex patterns used throughout the package
var (
	// Markdown link patterns
	linkRegex  = regexp.MustCompile(`\[([^\]]+)\]\(([^)]+)\)`)
	mediaRegex = regexp.MustCompile(`!\[([^\]]*)\]\(([^)]+)\)`)
	imageRegex = regexp.MustCompile(`!\[.*?\]\((.*?)\)`)
	videoRegex = regexp.MustCompile(`\[video\]\(.*?\)`)

	// Content filtering patterns
	codeBlockRegex   = regexp.MustCompile("(?s)```.*?```|~~~.*?~~~")
	frontmatterRegex = regexp.MustCompile(`(?s)^---.*?---\s*`)
	htmlTagRegex     = regexp.MustCompile(`<[^>]*>`)
	headerRegex      = regexp.MustCompile(`^#+\s+`)
)

// URL Management Functions

// ReplaceLocalURL updates the folder name in a localhost URL.
// Returns the original URL if it's not a localhost URL.
func ReplaceLocalURL(url string, newFolderName string) string {
	if !strings.HasPrefix(url, "http://localhost") {
		return url
	}

	segments := strings.Split(url, "/")
	// An empty localhost url will have 3 segments: http:, '', and localhost
	if len(segments) <= 3 {
		return url
	}

	segments[len(segments)-2] = newFolderName
	return strings.Join(segments, "/")
}

// ReplaceMarkdownURLs finds and replaces local URLs in markdown content.
// Updates both image and link URLs with the new folder name.
func ReplaceMarkdownURLs(markdown string, newFolderName string) string {
	// Replace image URLs
	markdown = mediaRegex.ReplaceAllStringFunc(markdown, func(match string) string {
		submatches := mediaRegex.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match
		}
		url := ReplaceLocalURL(submatches[2], newFolderName)
		return "![" + submatches[1] + "](" + url + ")"
	})

	// Replace link URLs
	markdown = linkRegex.ReplaceAllStringFunc(markdown, func(match string) string {
		submatches := linkRegex.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match
		}
		url := ReplaceLocalURL(submatches[2], newFolderName)
		return "[" + submatches[1] + "](" + url + ")"
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
	if strings.HasPrefix(url, "http://localhost") {
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
	match := imageRegex.FindStringSubmatch(markdown)
	if len(match) >= 2 {
		return match[1]
	}
	return ""
}

// GetInternalLinksAndMedia extracts all internal links and media URLs from markdown.
// Returns an array of URL strings that are considered internal.
func GetInternalLinksAndMedia(markdown string) []string {
	urlSet := make(map[string]bool)

	// Extract media URLs
	mediaMatches := mediaRegex.FindAllStringSubmatch(markdown, -1)
	for _, match := range mediaMatches {
		if len(match) >= 3 {
			url := strings.TrimSpace(match[2])
			if IsInternalURL(url) {
				urlSet[url] = true
			}
		}
	}

	// Extract link URLs (skip if already found in media)
	linkMatches := linkRegex.FindAllStringSubmatch(markdown, -1)
	for _, match := range linkMatches {
		if len(match) >= 3 {
			url := strings.TrimSpace(match[2])
			if IsInternalURL(url) && !urlSet[url] {
				urlSet[url] = true
			}
		}
	}

	// Convert map to slice
	var internalURLs []string
	for url := range urlSet {
		internalURLs = append(internalURLs, url)
	}

	return internalURLs
}

// Content Filtering Functions

// ExcludeMediaTags removes image and video markdown syntax from content.
func ExcludeMediaTags(markdown string) string {
	// Remove image markdown syntax
	content := imageRegex.ReplaceAllString(markdown, "")
	// Remove video markdown syntax
	content = videoRegex.ReplaceAllString(content, "")
	return content
}

// ExcludeCodeBlocks removes all code blocks (``` or ~~~ delimited) from markdown.
func ExcludeCodeBlocks(markdown string) string {
	// Find and replace all code blocks with empty string
	codeBlocks := codeBlockRegex.FindAllString(markdown, -1)
	for _, block := range codeBlocks {
		markdown = strings.Replace(markdown, block, "", 1)
	}
	return strings.TrimSpace(markdown)
}

// ExcludeFrontmatter removes YAML frontmatter (content between ---) from markdown.
func ExcludeFrontmatter(markdown string) string {
	return strings.TrimSpace(frontmatterRegex.ReplaceAllString(markdown, ""))
}

// ExtractLinkText replaces markdown links with just their text content.
// For example: [link text](url) becomes "link text".
func ExtractLinkText(markdown string) string {
	return linkRegex.ReplaceAllString(markdown, "$1")
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
	content = htmlTagRegex.ReplaceAllString(content, "")
	content = headerRegex.ReplaceAllString(content, "")

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
