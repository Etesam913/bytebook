package notes

import (
	"regexp"
	"strings"
)

// replaceLocalURL updates the folder name in a localhost URL
func replaceLocalURL(url string, newFolderName string) string {
	if !strings.HasPrefix(url, "http://localhost") {
		return url
	}

	segments := strings.Split(url, "/")
	// An empty localhost url will have 3 segments, http:, '', and localhost
	if len(segments) <= 3 {
		return url
	}

	segments[len(segments)-2] = newFolderName
	return strings.Join(segments, "/")
}

// ReplaceMarkdownURLs finds and replaces local URLs in a markdown string
func ReplaceMarkdownURLs(markdown string, newFolderName string) string {
	// Regex patterns for different URL types
	mediaRegex := regexp.MustCompile(`!\[([^\]]*)\]\(([^)]+)\)`)
	linkRegex := regexp.MustCompile(`\[([^\]]+)\]\(([^)]+)\)`)

	// Replace image URLs
	markdown = mediaRegex.ReplaceAllStringFunc(markdown, func(match string) string {
		submatches := mediaRegex.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match
		}

		url := replaceLocalURL(submatches[2], newFolderName)
		return "![" + submatches[1] + "](" + url + ")"
	})

	// Replace link URLs
	markdown = linkRegex.ReplaceAllStringFunc(markdown, func(match string) string {
		submatches := linkRegex.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match
		}

		url := replaceLocalURL(submatches[2], newFolderName)
		return "[" + submatches[1] + "](" + url + ")"
	})

	return markdown
}

// GetFirstImageSrcFromMarkdown returns the source URL of the first image found in a markdown string.
// It uses a regular expression to find the first image markdown syntax and extract its URL.
// If no image is found, it returns an empty string.
func GetFirstImageSrcFromMarkdown(markdown string) string {
	// Regular expression to match image markdown syntax: ![alt text](url)
	imageRegex := regexp.MustCompile(`!\[.*?\]\((.*?)\)`)

	// Find the first match
	match := imageRegex.FindStringSubmatch(markdown)

	// If there's a match, return the captured URL (first capture group)
	if len(match) >= 2 {
		return match[1]
	}

	// Return empty string if no image is found
	return ""
}

// excludeMediaTagsFromMarkdown removes image and video markdown syntax from the given string.
// It uses regular expressions to identify and remove image and video tags from markdown content.
// Returns the markdown string with all media tags removed.
func excludeMediaTagsFromMarkdown(markdown string) string {
	// Remove image markdown syntax
	imageRegex := regexp.MustCompile(`!\[.*?\]\(.*?\)`)
	content := imageRegex.ReplaceAllString(markdown, "")

	// Remove video markdown syntax
	videoRegex := regexp.MustCompile(`\[video\]\(.*?\)`)
	content = videoRegex.ReplaceAllString(content, "")

	return content
}

// excludeCodeBlocksFromMarkdown takes a markdown string as input and returns a new string with all code blocks removed.
// Code blocks are identified as text surrounded by either ``` or ~~~.
// This function uses regular expressions to find all code blocks, replaces them with an empty string,
// and trims leading/trailing whitespace from the resulting string.
func excludeCodeBlocksFromMarkdown(markdown string) string {
	// Regex to find all code blocks surrounded by ``` or ~~~
	codeBlockRegex := regexp.MustCompile("(?s)```.*?```|~~~.*?~~~")

	// Find all code blocks
	codeBlocks := codeBlockRegex.FindAllString(markdown, -1)

	// Replace code blocks with an empty string in the markdown content
	for _, block := range codeBlocks {
		markdown = strings.Replace(markdown, block, "", 1)
	}

	// Trim leading/trailing whitespace
	return strings.TrimSpace(markdown)
}

// excludeFrontmatterFromMarkdown removes the frontmatter from a Markdown string.
// Frontmatter is the content enclosed between two lines of "---".
// Returns the markdown string with frontmatter removed and whitespace trimmed.
func excludeFrontmatterFromMarkdown(markdown string) string {
	// Regex to match frontmatter, which starts and ends with "---"
	frontmatterRegex := regexp.MustCompile(`(?s)^---.*?---\s*`)

	// Remove the frontmatter from the markdown content
	markdownWithoutFrontmatter := frontmatterRegex.ReplaceAllString(markdown, "")

	// Trim leading/trailing whitespace and return the result
	return strings.TrimSpace(markdownWithoutFrontmatter)
}

// extractLinkText replaces markdown links with just their text content.
// For example, [link text](url) becomes "link text".
// Returns the markdown with all link URLs replaced by their text content.
func extractLinkText(markdown string) string {
	linkRegex := regexp.MustCompile(`\[([^\]]+)\]\([^)]+\)`)
	return linkRegex.ReplaceAllString(markdown, "$1")
}

// GetFirstLineFromMarkdown returns the first few meaningful words from a markdown string.
// It excludes frontmatter, code blocks, and media elements, and extracts text from links.
// The function returns up to the first 10 words from the first non-empty line.
func GetFirstLineFromMarkdown(markdown string) string {
	// First, remove frontmatter and code blocks
	content := excludeFrontmatterFromMarkdown(markdown)
	content = excludeCodeBlocksFromMarkdown(content)

	// Remove media tags
	content = excludeMediaTagsFromMarkdown(content)

	// Extract text from link tags
	content = extractLinkText(content)

	// Remove HTML tags
	htmlRegex := regexp.MustCompile(`<[^>]*>`)
	content = htmlRegex.ReplaceAllString(content, "")

	// Remove markdown header symbols
	headerRegex := regexp.MustCompile(`^#+\s+`)
	content = headerRegex.ReplaceAllString(content, "")

	// Split into lines and get the first non-empty line
	lines := strings.Split(content, "\n")
	var firstLine string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			firstLine = trimmed
			break
		}
	}

	// Split into words and take up to first 10
	words := strings.Fields(firstLine)
	if len(words) > 10 {
		words = words[:10]
	}

	// Join words back together
	return strings.Join(words, " ")
}
