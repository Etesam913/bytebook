package notes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestReplaceLocalURL(t *testing.T) {
	t.Run("should replace folder name in localhost URL", func(t *testing.T) {
		url := "http://localhost:3000/old-folder/image.png"
		result := replaceLocalURL(url, "new-folder")
		assert.Equal(t, "http://localhost:3000/new-folder/image.png", result)
	})

	t.Run("should not modify non-localhost URLs", func(t *testing.T) {
		url := "https://example.com/folder/image.png"
		result := replaceLocalURL(url, "new-folder")
		assert.Equal(t, url, result)
	})

	t.Run("should handle URLs with insufficient segments", func(t *testing.T) {
		url := "http://localhost"
		result := replaceLocalURL(url, "new-folder")
		assert.Equal(t, url, result)
	})
}

func TestReplaceMarkdownURLs(t *testing.T) {
	t.Run("should replace image URLs", func(t *testing.T) {
		markdown := "![Image](http://localhost:3000/old-folder/image.png)"
		result := ReplaceMarkdownURLs(markdown, "new-folder")
		assert.Equal(t, "![Image](http://localhost:3000/new-folder/image.png)", result)
	})

	t.Run("should replace link URLs", func(t *testing.T) {
		markdown := "[Link](http://localhost:3000/old-folder/page.html)"
		result := ReplaceMarkdownURLs(markdown, "new-folder")
		assert.Equal(t, "[Link](http://localhost:3000/new-folder/page.html)", result)
	})

	t.Run("should not modify non-localhost URLs", func(t *testing.T) {
		markdown := "![Image](https://example.com/image.png) [Link](https://example.com/page.html)"
		result := ReplaceMarkdownURLs(markdown, "new-folder")
		assert.Equal(t, markdown, result)
	})

	t.Run("should handle multiple URLs", func(t *testing.T) {
		markdown := "![Image1](http://localhost:3000/old-folder/image1.png) ![Image2](http://localhost:3000/old-folder/image2.png)"
		result := ReplaceMarkdownURLs(markdown, "new-folder")
		expected := "![Image1](http://localhost:3000/new-folder/image1.png) ![Image2](http://localhost:3000/new-folder/image2.png)"
		assert.Equal(t, expected, result)
	})
}

func TestGetFirstImageSrc(t *testing.T) {
	t.Run("should return the first image URL", func(t *testing.T) {
		markdown := "# Title\n![Image](http://localhost:3000/folder/image.png)\nSome text\n![Another](http://example.com/another.jpg)"
		result := GetFirstImageSrcFromMarkdown(markdown)
		assert.Equal(t, "http://localhost:3000/folder/image.png", result)
	})

	t.Run("should return empty string if no image is found", func(t *testing.T) {
		markdown := "# Title\nSome text without images"
		result := GetFirstImageSrcFromMarkdown(markdown)
		assert.Equal(t, "", result)
	})

	t.Run("should handle image with empty alt text", func(t *testing.T) {
		markdown := "![](http://localhost:3000/folder/image.png)"
		result := GetFirstImageSrcFromMarkdown(markdown)
		assert.Equal(t, "http://localhost:3000/folder/image.png", result)
	})
}

func TestExcludeMediaTagsFromMarkdown(t *testing.T) {
	t.Run("should remove image tags", func(t *testing.T) {
		markdown := "# Title\n![Image](http://localhost:3000/folder/image.png)\nSome text"
		result := excludeMediaTagsFromMarkdown(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})

	t.Run("should remove video tags", func(t *testing.T) {
		markdown := "# Title\n[video](http://localhost:3000/folder/video.mp4)\nSome text"
		result := excludeMediaTagsFromMarkdown(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})

	t.Run("should remove both image and video tags", func(t *testing.T) {
		markdown := "# Title\n![Image](http://localhost:3000/folder/image.png)\nSome text\n[video](http://localhost:3000/folder/video.mp4)"
		result := excludeMediaTagsFromMarkdown(markdown)
		assert.Equal(t, "# Title\n\nSome text\n", result)
	})
}

func TestExcludeCodeBlocksFromMarkdown(t *testing.T) {
	t.Run("should remove code blocks with backticks", func(t *testing.T) {
		markdown := "# Title\n```\ncode block\n```\nSome text"
		result := excludeCodeBlocksFromMarkdown(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})

	t.Run("should remove code blocks with tildes", func(t *testing.T) {
		markdown := "# Title\n~~~\ncode block\n~~~\nSome text"
		result := excludeCodeBlocksFromMarkdown(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})

	t.Run("should remove multiple code blocks", func(t *testing.T) {
		markdown := "# Title\n```\ncode block 1\n```\nSome text\n~~~\ncode block 2\n~~~"
		result := excludeCodeBlocksFromMarkdown(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})
}

func TestExcludeFrontmatterFromMarkdown(t *testing.T) {
	t.Run("should remove frontmatter", func(t *testing.T) {
		markdown := "---\ntitle: Test\ndate: 2023-01-01\n---\n# Title\nSome text"
		result := excludeFrontmatterFromMarkdown(markdown)
		assert.Equal(t, "# Title\nSome text", result)
	})

	t.Run("should handle markdown without frontmatter", func(t *testing.T) {
		markdown := "# Title\nSome text"
		result := excludeFrontmatterFromMarkdown(markdown)
		assert.Equal(t, markdown, result)
	})
}

func TestExtractLinkText(t *testing.T) {
	t.Run("should extract text from links", func(t *testing.T) {
		markdown := "This is a [link](http://example.com) in text"
		result := extractLinkText(markdown)
		assert.Equal(t, "This is a link in text", result)
	})

	t.Run("should handle multiple links", func(t *testing.T) {
		markdown := "[Link1](http://example1.com) and [Link2](http://example2.com)"
		result := extractLinkText(markdown)
		assert.Equal(t, "Link1 and Link2", result)
	})

	t.Run("should handle text without links", func(t *testing.T) {
		markdown := "Plain text without links"
		result := extractLinkText(markdown)
		assert.Equal(t, markdown, result)
	})
}

func TestGetFirstLine(t *testing.T) {
	t.Run("should get first line from simple markdown", func(t *testing.T) {
		markdown := "This is the first line\nThis is the second line"
		result := GetFirstLineFromMarkdown(markdown)
		assert.Equal(t, "This is the first line", result)
	})

	t.Run("should exclude frontmatter", func(t *testing.T) {
		markdown := "---\ntitle: Test\n---\nThis is the content"
		result := GetFirstLineFromMarkdown(markdown)
		assert.Equal(t, "This is the content", result)
	})

	t.Run("should exclude code blocks", func(t *testing.T) {
		markdown := "```\ncode block\n```\nThis is the content"
		result := GetFirstLineFromMarkdown(markdown)
		assert.Equal(t, "This is the content", result)
	})

	t.Run("should exclude media tags", func(t *testing.T) {
		markdown := "![Image](image.png)\nThis is the content"
		result := GetFirstLineFromMarkdown(markdown)
		assert.Equal(t, "This is the content", result)
	})

	t.Run("should extract text from links", func(t *testing.T) {
		markdown := "[Link text](http://example.com) is the content"
		result := GetFirstLineFromMarkdown(markdown)
		assert.Equal(t, "Link text is the content", result)
	})

	t.Run("should remove HTML tags", func(t *testing.T) {
		markdown := "<strong>Bold text</strong> is the content"
		result := GetFirstLineFromMarkdown(markdown)
		assert.Equal(t, "Bold text is the content", result)
	})

	t.Run("should remove header symbols", func(t *testing.T) {
		markdown := "# Header text is the content"
		result := GetFirstLineFromMarkdown(markdown)
		assert.Equal(t, "Header text is the content", result)
	})

	t.Run("should limit to 10 words", func(t *testing.T) {
		markdown := "This is a very long first line with more than ten words that should be truncated"
		result := GetFirstLineFromMarkdown(markdown)
		assert.Equal(t, "This is a very long first line with more than", result)
	})

	t.Run("should handle complex markdown", func(t *testing.T) {
		markdown := "---\ntitle: Test\n---\n# Header\n![Image](image.png)\n```\ncode\n```\n<em>This</em> is [the content](http://example.com) with many elements"
		result := GetFirstLineFromMarkdown(markdown)
		assert.Equal(t, "Header", result)
	})
}
