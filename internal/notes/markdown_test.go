package notes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestReplaceLocalURL(t *testing.T) {
	t.Run("should replace folder name in localhost URL", func(t *testing.T) {
		url := "http://localhost:3000/old-folder/image.png"
		result := ReplaceLocalURL(url, "new-folder")
		assert.Equal(t, "http://localhost:3000/new-folder/image.png", result)
	})

	t.Run("should not modify non-localhost URLs", func(t *testing.T) {
		url := "https://example.com/folder/image.png"
		result := ReplaceLocalURL(url, "new-folder")
		assert.Equal(t, url, result)
	})

	t.Run("should handle URLs with insufficient segments", func(t *testing.T) {
		url := "http://localhost"
		result := ReplaceLocalURL(url, "new-folder")
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
		result := GetFirstImageSrc(markdown)
		assert.Equal(t, "http://localhost:3000/folder/image.png", result)
	})

	t.Run("should return empty string if no image is found", func(t *testing.T) {
		markdown := "# Title\nSome text without images"
		result := GetFirstImageSrc(markdown)
		assert.Equal(t, "", result)
	})

	t.Run("should handle image with empty alt text", func(t *testing.T) {
		markdown := "![](http://localhost:3000/folder/image.png)"
		result := GetFirstImageSrc(markdown)
		assert.Equal(t, "http://localhost:3000/folder/image.png", result)
	})
}

func TestExcludeMediaTags(t *testing.T) {
	t.Run("should remove image tags", func(t *testing.T) {
		markdown := "# Title\n![Image](http://localhost:3000/folder/image.png)\nSome text"
		result := ExcludeMediaTags(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})

	t.Run("should remove video tags", func(t *testing.T) {
		markdown := "# Title\n[video](http://localhost:3000/folder/video.mp4)\nSome text"
		result := ExcludeMediaTags(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})

	t.Run("should remove both image and video tags", func(t *testing.T) {
		markdown := "# Title\n![Image](http://localhost:3000/folder/image.png)\nSome text\n[video](http://localhost:3000/folder/video.mp4)"
		result := ExcludeMediaTags(markdown)
		assert.Equal(t, "# Title\n\nSome text\n", result)
	})
}

func TestExcludeCodeBlocks(t *testing.T) {
	t.Run("should remove code blocks with backticks", func(t *testing.T) {
		markdown := "# Title\n```\ncode block\n```\nSome text"
		result := ExcludeCodeBlocks(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})

	t.Run("should remove code blocks with tildes", func(t *testing.T) {
		markdown := "# Title\n~~~\ncode block\n~~~\nSome text"
		result := ExcludeCodeBlocks(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})

	t.Run("should remove multiple code blocks", func(t *testing.T) {
		markdown := "# Title\n```\ncode block 1\n```\nSome text\n~~~\ncode block 2\n~~~"
		result := ExcludeCodeBlocks(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})
}

func TestExcludeFrontmatter(t *testing.T) {
	t.Run("should remove frontmatter", func(t *testing.T) {
		markdown := "---\ntitle: Test\ndate: 2023-01-01\n---\n# Title\nSome text"
		result := ExcludeFrontmatter(markdown)
		assert.Equal(t, "# Title\nSome text", result)
	})

	t.Run("should handle markdown without frontmatter", func(t *testing.T) {
		markdown := "# Title\nSome text"
		result := ExcludeFrontmatter(markdown)
		assert.Equal(t, markdown, result)
	})
}

func TestExtractLinkText(t *testing.T) {
	t.Run("should extract text from links", func(t *testing.T) {
		markdown := "This is a [link](http://example.com) in text"
		result := ExtractLinkText(markdown)
		assert.Equal(t, "This is a link in text", result)
	})

	t.Run("should handle multiple links", func(t *testing.T) {
		markdown := "[Link1](http://example1.com) and [Link2](http://example2.com)"
		result := ExtractLinkText(markdown)
		assert.Equal(t, "Link1 and Link2", result)
	})

	t.Run("should handle text without links", func(t *testing.T) {
		markdown := "Plain text without links"
		result := ExtractLinkText(markdown)
		assert.Equal(t, markdown, result)
	})
}

func TestIsInternalURL(t *testing.T) {
	t.Run("should identify localhost URLs as internal", func(t *testing.T) {
		assert.True(t, IsInternalURL("http://localhost:3000/path"))
		assert.True(t, IsInternalURL("http://localhost/path"))
	})

	t.Run("should identify relative paths as internal", func(t *testing.T) {
		assert.True(t, IsInternalURL("./file.md"))
		assert.True(t, IsInternalURL("../folder/file.md"))
		assert.True(t, IsInternalURL("file.md"))
	})

	t.Run("should identify absolute paths as internal", func(t *testing.T) {
		assert.True(t, IsInternalURL("/path/to/file"))
	})

	t.Run("should identify anchor links as internal", func(t *testing.T) {
		assert.True(t, IsInternalURL("#section"))
	})

	t.Run("should identify file protocols as internal", func(t *testing.T) {
		assert.True(t, IsInternalURL("file:///path/to/file"))
	})

	t.Run("should identify mailto as internal", func(t *testing.T) {
		assert.True(t, IsInternalURL("mailto:test@example.com"))
	})

	t.Run("should identify external HTTP URLs as external", func(t *testing.T) {
		assert.False(t, IsInternalURL("http://example.com/path"))
		assert.False(t, IsInternalURL("http://google.com"))
	})

	t.Run("should identify HTTPS URLs as external", func(t *testing.T) {
		assert.False(t, IsInternalURL("https://example.com/path"))
		assert.False(t, IsInternalURL("https://google.com"))
	})

	t.Run("should handle empty URLs", func(t *testing.T) {
		assert.False(t, IsInternalURL(""))
		assert.False(t, IsInternalURL("   "))
	})
}

func TestGetInternalLinksAndMedia(t *testing.T) {
	t.Run("should extract internal media URLs", func(t *testing.T) {
		markdown := "![Image](http://localhost:3000/folder/image.png)"
		result := GetInternalLinksAndMedia(markdown)
		assert.True(t, result.Has("http://localhost:3000/folder/image.png"))
	})

	t.Run("should extract internal link URLs", func(t *testing.T) {
		markdown := "[Link](./local-file.md)"
		result := GetInternalLinksAndMedia(markdown)
		assert.True(t, result.Has("./local-file.md"))
	})

	t.Run("should exclude external URLs", func(t *testing.T) {
		markdown := "![External](https://example.com/image.png) [External Link](https://example.com/page.html)"
		result := GetInternalLinksAndMedia(markdown)
		assert.Len(t, result.Elements(), 0)
	})

	t.Run("should deduplicate URLs", func(t *testing.T) {
		markdown := "![ellaalove-1?width=100%](http://localhost:5890/notes/tests/ellaalove-1.mp4) ![ellaalove-1?width=100%](http://localhost:5890/notes/tests/ellaalove-1.mp4)"
		result := GetInternalLinksAndMedia(markdown)
		assert.Len(t, result.Elements(), 1)
		assert.True(t, result.Has("http://localhost:5890/notes/tests/ellaalove-1.mp4"))
	})

	t.Run("should handle mixed internal and external URLs", func(t *testing.T) {
		markdown := "![Local](./image.png) ![External](https://example.com/image.png) [Local Link](./page.md) [External Link](https://example.com/page.html)"
		result := GetInternalLinksAndMedia(markdown)
		assert.Len(t, result.Elements(), 2)
		assert.True(t, result.Has("./image.png"))
		assert.True(t, result.Has("./page.md"))
	})
}

func TestGetInternalLinksAndMediaAsSlice(t *testing.T) {
	t.Run("should extract internal media URLs as slice", func(t *testing.T) {
		markdown := "![Image](http://localhost:3000/folder/image.png)"
		result := GetInternalLinksAndMediaAsSlice(markdown)
		assert.Contains(t, result, "http://localhost:3000/folder/image.png")
	})

	t.Run("should extract internal link URLs as slice", func(t *testing.T) {
		markdown := "[Link](./local-file.md)"
		result := GetInternalLinksAndMediaAsSlice(markdown)
		assert.Contains(t, result, "./local-file.md")
	})

	t.Run("should exclude external URLs as slice", func(t *testing.T) {
		markdown := "![External](https://example.com/image.png) [External Link](https://example.com/page.html)"
		result := GetInternalLinksAndMediaAsSlice(markdown)
		assert.Len(t, result, 0)
	})

	t.Run("should deduplicate URLs as slice", func(t *testing.T) {
		markdown := "![ellaalove-1?width=100%](http://localhost:5890/notes/tests/ellaalove-1.mp4) ![ellaalove-1?width=100%](http://localhost:5890/notes/tests/ellaalove-1.mp4)"
		result := GetInternalLinksAndMediaAsSlice(markdown)
		assert.Len(t, result, 1)
		assert.Contains(t, result, "http://localhost:5890/notes/tests/ellaalove-1.mp4")
	})

	t.Run("should handle mixed internal and external URLs as slice", func(t *testing.T) {
		markdown := "![Local](./image.png) ![External](https://example.com/image.png) [Local Link](./page.md) [External Link](https://example.com/page.html)"
		result := GetInternalLinksAndMediaAsSlice(markdown)
		assert.Len(t, result, 2)
		assert.Contains(t, result, "./image.png")
		assert.Contains(t, result, "./page.md")
	})
}

func TestCalculateInternalLinksDiff(t *testing.T) {
	t.Run("should identify newly added links", func(t *testing.T) {
		previousMarkdown := "![Image1](./image1.png) [Link1](./page1.md)"
		newMarkdown := "![Image1](./image1.png) [Link1](./page1.md) ![Image2](./image2.png) [Link2](./page2.md)"

		added, removed := CalculateInternalLinksDiff(previousMarkdown, newMarkdown)

		assert.Len(t, added, 2)
		assert.Contains(t, added, "./image2.png")
		assert.Contains(t, added, "./page2.md")
		assert.Len(t, removed, 0)
	})

	t.Run("should identify newly removed links", func(t *testing.T) {
		previousMarkdown := "![Image1](./image1.png) [Link1](./page1.md) ![Image2](./image2.png) [Link2](./page2.md)"
		newMarkdown := "![Image1](./image1.png) [Link1](./page1.md)"

		added, removed := CalculateInternalLinksDiff(previousMarkdown, newMarkdown)

		assert.Len(t, added, 0)
		assert.Len(t, removed, 2)
		assert.Contains(t, removed, "./image2.png")
		assert.Contains(t, removed, "./page2.md")
	})

	t.Run("should identify both added and removed links", func(t *testing.T) {
		previousMarkdown := "![Image1](./image1.png) [Link1](./page1.md)"
		newMarkdown := "![Image2](./image2.png) [Link2](./page2.md)"

		added, removed := CalculateInternalLinksDiff(previousMarkdown, newMarkdown)

		assert.Len(t, added, 2)
		assert.Contains(t, added, "./image2.png")
		assert.Contains(t, added, "./page2.md")
		assert.Len(t, removed, 2)
		assert.Contains(t, removed, "./image1.png")
		assert.Contains(t, removed, "./page1.md")
	})

	t.Run("should handle no changes", func(t *testing.T) {
		markdown := "![Image1](./image1.png) [Link1](./page1.md)"

		added, removed := CalculateInternalLinksDiff(markdown, markdown)

		assert.Len(t, added, 0)
		assert.Len(t, removed, 0)
	})

	t.Run("should handle empty markdown", func(t *testing.T) {
		added, removed := CalculateInternalLinksDiff("", "")

		assert.Len(t, added, 0)
		assert.Len(t, removed, 0)
	})

	t.Run("should ignore external URLs", func(t *testing.T) {
		previousMarkdown := "![External](https://example.com/image.png) [Internal](./page.md)"
		newMarkdown := "![External2](https://example.com/image2.png) [Internal2](./page2.md)"

		added, removed := CalculateInternalLinksDiff(previousMarkdown, newMarkdown)

		assert.Len(t, added, 1)
		assert.Contains(t, added, "./page2.md")
		assert.Len(t, removed, 1)
		assert.Contains(t, removed, "./page.md")
	})
}

func TestGetFirstLine(t *testing.T) {
	t.Run("should get first line from simple markdown", func(t *testing.T) {
		markdown := "This is the first line\nThis is the second line"
		result := GetFirstLine(markdown)
		assert.Equal(t, "This is the first line", result)
	})

	t.Run("should exclude frontmatter", func(t *testing.T) {
		markdown := "---\ntitle: Test\n---\nThis is the content"
		result := GetFirstLine(markdown)
		assert.Equal(t, "This is the content", result)
	})

	t.Run("should exclude code blocks", func(t *testing.T) {
		markdown := "```\ncode block\n```\nThis is the content"
		result := GetFirstLine(markdown)
		assert.Equal(t, "This is the content", result)
	})

	t.Run("should exclude media tags", func(t *testing.T) {
		markdown := "![Image](image.png)\nThis is the content"
		result := GetFirstLine(markdown)
		assert.Equal(t, "This is the content", result)
	})

	t.Run("should extract text from links", func(t *testing.T) {
		markdown := "[Link text](http://example.com) is the content"
		result := GetFirstLine(markdown)
		assert.Equal(t, "Link text is the content", result)
	})

	t.Run("should remove HTML tags", func(t *testing.T) {
		markdown := "<strong>Bold text</strong> is the content"
		result := GetFirstLine(markdown)
		assert.Equal(t, "Bold text is the content", result)
	})

	t.Run("should remove header symbols", func(t *testing.T) {
		markdown := "# Header text is the content"
		result := GetFirstLine(markdown)
		assert.Equal(t, "Header text is the content", result)
	})

	t.Run("should limit to 10 words", func(t *testing.T) {
		markdown := "This is a very long first line with more than ten words that should be truncated"
		result := GetFirstLine(markdown)
		assert.Equal(t, "This is a very long first line with more than", result)
	})

	t.Run("should handle complex markdown", func(t *testing.T) {
		markdown := "---\ntitle: Test\n---\n# Header\n![Image](image.png)\n```\ncode\n```\n<em>This</em> is [the content](http://example.com) with many elements"
		result := GetFirstLine(markdown)
		assert.Equal(t, "Header", result)
	})
}
