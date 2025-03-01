package note_helpers

import (
	"errors"
	"path/filepath"
	"regexp"
	"strings"
)

// excludeMediaTags removes image and video markdown syntax from the given string
func excludeMediaTags(markdown string) string {
	// Remove image markdown syntax
	imageRegex := regexp.MustCompile(`!\[.*?\]\(.*?\)`)
	content := imageRegex.ReplaceAllString(markdown, "")

	// Remove video markdown syntax
	videoRegex := regexp.MustCompile(`\[video\]\(.*?\)`)
	content = videoRegex.ReplaceAllString(content, "")

	return content
}

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

// ConvertFileNameForFrontendUrl converts a file path to a frontend-friendly URL format.
// It takes the directory and file name, removes the file extension, and appends it as a query parameter.
// Example: "path/to/file.jpg" becomes "path/to/file?ext=jpg".
func ConvertFileNameForFrontendUrl(pathToFile string) (string, error) {
	if len(strings.Trim(pathToFile, " ")) == 0 {
		return "", errors.New("Empty pathToFile")
	}
	fileDir := filepath.Dir(pathToFile)
	fileNameWithExtension := filepath.Base(pathToFile)
	if len(fileNameWithExtension) == 0 || fileNameWithExtension == "." || strings.HasPrefix(fileNameWithExtension, ".") {
		return "", errors.New("Invalid file name")
	}
	fileExtension := filepath.Ext(fileNameWithExtension)
	if len(strings.Trim(fileExtension, " ")) == 0 {
		return "", errors.New("Invalid file extension")
	}
	fileNameWithoutExtension := fileNameWithExtension[:len(fileNameWithExtension)-len(fileExtension)]
	if len(strings.Trim(fileNameWithExtension, " ")) == 0 {
		return "", errors.New("Invalid file name")
	}
	if fileDir[len(fileDir)-1] != '/' {
		fileDir += "/"
	}
	return fileDir + fileNameWithoutExtension + "?ext=" + fileExtension[1:], nil
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

// extractLinkText replaces markdown links with just their text content
// [link text](url) becomes "link text"
func extractLinkText(markdown string) string {
	linkRegex := regexp.MustCompile(`\[([^\]]+)\]\([^)]+\)`)
	return linkRegex.ReplaceAllString(markdown, "$1")
}

// GetFirstImageSrc returns the source URL of the first image found in a markdown string.
// If no image is found, it returns an empty string.
func GetFirstImageSrc(markdown string) string {
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

// GetFirstLine returns the first few meaningful words from a markdown string,
// excluding frontmatter, code blocks, and media elements.
// It returns up to the first 10 words from the first non-empty line.
func GetFirstLine(markdown string) string {
	// First, remove frontmatter and code blocks
	content := ExcludeFrontmatter(markdown)
	content = ExcludeCodeBlocks(content)

	// Remove media tags
	content = excludeMediaTags(content)

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
