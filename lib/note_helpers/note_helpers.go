package note_helpers

import (
	"regexp"
	"strings"
)

/*
ExcludeCodeBlocks is a function that takes a markdown string as input and returns a new string with all code blocks removed.
Code blocks are identified as text surrounded by either ``` or ~~~.
This function uses regular expressions to find all code blocks, replaces them with an empty string, and trims leading/trailing whitespace from the resulting string.
*/
func ExcludeCodeBlocks(markdown string) string {
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

// ExcludeFrontmatter removes the frontmatter from a Markdown string.
// Frontmatter is the content enclosed between two lines of "---".
func ExcludeFrontmatter(markdown string) string {
	// Regex to match frontmatter, which starts and ends with "---"
	frontmatterRegex := regexp.MustCompile(`(?s)^---.*?---\s*`)

	// Remove the frontmatter from the markdown content
	markdownWithoutFrontmatter := frontmatterRegex.ReplaceAllString(markdown, "")

	// Trim leading/trailing whitespace and return the result
	return strings.TrimSpace(markdownWithoutFrontmatter)
}

// URLType represents the type of URL found in markdown
type URLType int

const (
	ImageURL URLType = iota
	VideoURL
	LinkURL
)

// URLMatch represents a matched URL with its type and full match
type URLMatch struct {
	Type    URLType
	URL     string
	AltText string
}

// replaceLocalURL updates the folder name in a localhost URL
func replaceLocalURL(url string, newFolderName string) string {
	if !strings.HasPrefix(url, "http://localhost") {
		return url
	}

	segments := strings.Split(url, "/")
	if len(segments) < 2 {
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

// GetMediaRefs returns a list of all image, link, and video references in a markdown string
func GetMediaRefs(markdown string) []string {
	// Regular expressions for different media types
	imageRegex := regexp.MustCompile(`!\[.*?\]\((.*?)\)`)   // ![alt](url)
	linkRegex := regexp.MustCompile(`[^!]\[.*?\]\((.*?)\)`) // [text](url)
	videoRegex := regexp.MustCompile(`\[video\]\((.*?)\)`)  // [video](url)

	var refs []string

	// Find all image references
	imageMatches := imageRegex.FindAllStringSubmatch(markdown, -1)
	for _, match := range imageMatches {
		refs = append(refs, match[1]) // match[1] contains the URL
	}

	// Find all link references
	linkMatches := linkRegex.FindAllStringSubmatch(markdown, -1)
	for _, match := range linkMatches {
		refs = append(refs, match[1])
	}

	// Find all video references
	videoMatches := videoRegex.FindAllStringSubmatch(markdown, -1)
	for _, match := range videoMatches {
		refs = append(refs, match[1])
	}

	return refs
}

// Helper function to check if the tag is valid based on the next character in the string.
func isValidTag(tag string, markdown string) bool {
	index := strings.Index(markdown, tag)
	if index == -1 {
		return false
	}
	// Check if the character after the tag is a space or newline
	if index+len(tag) < len(markdown) {
		nextChar := markdown[index+len(tag)]
		return nextChar == ' ' || nextChar == '\n' || nextChar == '\r'
	}
	// If it's at the end of the string, it's valid
	return true
}
