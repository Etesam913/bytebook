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

// GetTags extracts all valid tags from a Markdown string.
// A tag starts with a #, followed by text (no spaces), and ends with a space, another tag, or newline.
// It treats something like #joe#mama as two separate tags.
func GetTags(markdown string) []string {
	// Regular expression to match each # followed by text (no spaces)
	tagRegex := regexp.MustCompile(`#([^\s#]+)`)

	// Find all matches in the markdown string
	matches := tagRegex.FindAllStringSubmatch(markdown, -1)

	var tags []string
	for _, match := range matches {
		tags = append(tags, match[0]) // match[0] is the full tag (e.g., "#joe" or "#mama")
	}

	return tags
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
