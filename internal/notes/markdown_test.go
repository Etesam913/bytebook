package notes

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestReplaceFolderOfLocalURL(t *testing.T) {
	t.Run("should replace folder name in localhost URL", func(t *testing.T) {
		url := "http://localhost:5890/old-folder/image.png"
		result := replaceFolderOfLocalURL(url, "old-folder", "new-folder")
		assert.Equal(t, "http://localhost:5890/new-folder/image.png", result)
	})

	t.Run("should replace folder name in wails://localhost URL", func(t *testing.T) {
		url := "wails://localhost:5173/old-folder/image.png"
		result := replaceFolderOfLocalURL(url, "old-folder", "new-folder")
		assert.Equal(t, "wails://localhost:5173/new-folder/image.png", result)
	})

	t.Run("should handle wails URLs with spaces in folder names", func(t *testing.T) {
		url := "wails://localhost:5173/Folder Rename Test 2/Second.md"
		result := replaceFolderOfLocalURL(url, "Folder Rename Test 2", "New Folder")
		assert.Equal(t, "wails://localhost:5173/New Folder/Second.md", result)
	})

	t.Run("should not modify non-localhost URLs", func(t *testing.T) {
		url := "https://example.com/folder/image.png"
		result := replaceFolderOfLocalURL(url, "old-folder", "new-folder")
		assert.Equal(t, url, result)
	})

	t.Run("should handle URLs with insufficient segments", func(t *testing.T) {
		url := "http://localhost"
		result := replaceFolderOfLocalURL(url, "old-folder", "new-folder")
		assert.Equal(t, url, result)
	})

	t.Run("should handle wails URLs with insufficient segments", func(t *testing.T) {
		url := "wails://localhost"
		result := replaceFolderOfLocalURL(url, "old-folder", "new-folder")
		assert.Equal(t, url, result)
	})

	t.Run("should not replace URLs when old folder name doesn't match", func(t *testing.T) {
		url := "http://localhost:5890/different-folder/image.png"
		result := replaceFolderOfLocalURL(url, "old-folder", "new-folder")
		assert.Equal(t, url, result)
	})

	t.Run("should not replace wails URLs when old folder name doesn't match", func(t *testing.T) {
		url := "wails://localhost:5173/some-other-folder/file.md"
		result := replaceFolderOfLocalURL(url, "old-folder", "new-folder")
		assert.Equal(t, url, result)
	})
}

func TestUpdateFolderNameOfInternalLinksAndMedia(t *testing.T) {
	t.Run("should replace http://localhost image URLs", func(t *testing.T) {
		markdown := "![Image](http://localhost:5890/old-folder/image.png)"
		result := UpdateFolderNameOfInternalLinksAndMedia(markdown, "old-folder", "new-folder")
		assert.Equal(t, "![Image](http://localhost:5890/new-folder/image.png)", result)
	})

	t.Run("should replace http://localhost link URLs", func(t *testing.T) {
		markdown := "[Link](http://localhost:5890/old-folder/page.html)"
		result := UpdateFolderNameOfInternalLinksAndMedia(markdown, "old-folder", "new-folder")
		assert.Equal(t, "[Link](http://localhost:5890/new-folder/page.html)", result)
	})

	t.Run("should replace wails://localhost image URLs", func(t *testing.T) {
		markdown := "![Image](wails://localhost:5173/old-folder/image.png)"
		result := UpdateFolderNameOfInternalLinksAndMedia(markdown, "old-folder", "new-folder")
		assert.Equal(t, "![Image](wails://localhost:5173/new-folder/image.png)", result)
	})

	t.Run("should replace wails://localhost link URLs", func(t *testing.T) {
		markdown := "[Link](wails://localhost:5173/Folder Rename Test 2/Second.md)"
		result := UpdateFolderNameOfInternalLinksAndMedia(markdown, "Folder Rename Test 2", "new-folder")
		assert.Equal(t, "[Link](wails://localhost:5173/new-folder/Second.md)", result)
	})

	t.Run("should not modify external URLs", func(t *testing.T) {
		markdown := "![Image](https://example.com/image.png) [Link](https://example.com/page.html)"
		result := UpdateFolderNameOfInternalLinksAndMedia(markdown, "old-folder", "new-folder")
		assert.Equal(t, markdown, result)
	})

	t.Run("should not modify relative URLs", func(t *testing.T) {
		markdown := "![Image](./image.png) [Link](../folder/page.md)"
		result := UpdateFolderNameOfInternalLinksAndMedia(markdown, "old-folder", "new-folder")
		assert.Equal(t, markdown, result)
	})

	t.Run("should handle multiple localhost URLs", func(t *testing.T) {
		markdown := "![Image1](http://localhost:5890/old-folder/image1.png) ![Image2](http://localhost:5890/old-folder/image2.png)"
		result := UpdateFolderNameOfInternalLinksAndMedia(markdown, "old-folder", "new-folder")
		expected := "![Image1](http://localhost:5890/new-folder/image1.png) ![Image2](http://localhost:5890/new-folder/image2.png)"
		assert.Equal(t, expected, result)
	})

	t.Run("should handle mixed localhost and wails URLs", func(t *testing.T) {
		markdown := "![Image](http://localhost:5890/old-folder/image.png) [Link](wails://localhost:5173/old-folder/page.md)"
		result := UpdateFolderNameOfInternalLinksAndMedia(markdown, "old-folder", "new-folder")
		expected := "![Image](http://localhost:5890/new-folder/image.png) [Link](wails://localhost:5173/new-folder/page.md)"
		assert.Equal(t, expected, result)
	})

	t.Run("should handle mixed internal and external URLs", func(t *testing.T) {
		markdown := "![Local](http://localhost:5890/old-folder/image.png) ![External](https://example.com/image.png) [Local](wails://localhost:5173/old-folder/page.md) [External](https://example.com/page.html)"
		result := UpdateFolderNameOfInternalLinksAndMedia(markdown, "old-folder", "new-folder")
		expected := "![Local](http://localhost:5890/new-folder/image.png) ![External](https://example.com/image.png) [Local](wails://localhost:5173/new-folder/page.md) [External](https://example.com/page.html)"
		assert.Equal(t, expected, result)
	})

	t.Run("should handle URLs with spaces in folder names", func(t *testing.T) {
		markdown := "[Link](wails://localhost:5173/Folder Rename Test 2/Second.md)"
		result := UpdateFolderNameOfInternalLinksAndMedia(markdown, "Folder Rename Test 2", "New Folder Name")
		assert.Equal(t, "[Link](wails://localhost:5173/New Folder Name/Second.md)", result)
	})

	t.Run("should handle empty markdown", func(t *testing.T) {
		result := UpdateFolderNameOfInternalLinksAndMedia("", "old-folder", "new-folder")
		assert.Equal(t, "", result)
	})

	t.Run("should handle markdown with no URLs", func(t *testing.T) {
		markdown := "# Title\nThis is just plain text with no links or images."
		result := UpdateFolderNameOfInternalLinksAndMedia(markdown, "old-folder", "new-folder")
		assert.Equal(t, markdown, result)
	})

	t.Run("should only replace URLs with matching old folder name", func(t *testing.T) {
		markdown := "![Image1](http://localhost:5890/old-folder/image1.png) ![Image2](http://localhost:5890/different-folder/image2.png)"
		result := UpdateFolderNameOfInternalLinksAndMedia(markdown, "old-folder", "new-folder")
		expected := "![Image1](http://localhost:5890/new-folder/image1.png) ![Image2](http://localhost:5890/different-folder/image2.png)"
		assert.Equal(t, expected, result)
	})

	t.Run("should not replace URLs when old folder name doesn't match", func(t *testing.T) {
		markdown := "![Image](http://localhost:5890/some-other-folder/image.png) [Link](wails://localhost:5173/another-folder/page.md)"
		result := UpdateFolderNameOfInternalLinksAndMedia(markdown, "old-folder", "new-folder")
		assert.Equal(t, markdown, result)
	})
}

func TestGetFirstImageSrc(t *testing.T) {
	t.Run("should return the first image URL", func(t *testing.T) {
		markdown := "# Title\n![Image](http://localhost:5890/folder/image.png)\nSome text\n![Another](http://example.com/another.jpg)"
		result := GetFirstImageSrc(markdown)
		assert.Equal(t, "http://localhost:5890/folder/image.png", result)
	})

	t.Run("should return empty string if no image is found", func(t *testing.T) {
		markdown := "# Title\nSome text without images"
		result := GetFirstImageSrc(markdown)
		assert.Equal(t, "", result)
	})

	t.Run("should handle image with empty alt text", func(t *testing.T) {
		markdown := "![](http://localhost:5890/folder/image.png)"
		result := GetFirstImageSrc(markdown)
		assert.Equal(t, "http://localhost:5890/folder/image.png", result)
	})
}

func TestExcludeMediaTags(t *testing.T) {
	t.Run("should remove image tags", func(t *testing.T) {
		markdown := "# Title\n![Image](http://localhost:5890/folder/image.png)\nSome text"
		result := excludeMediaTags(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})

	t.Run("should remove video tags", func(t *testing.T) {
		markdown := "# Title\n[video](http://localhost:5890/folder/video.mp4)\nSome text"
		result := excludeMediaTags(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})

	t.Run("should remove both image and video tags", func(t *testing.T) {
		markdown := "# Title\n![Image](http://localhost:5890/folder/image.png)\nSome text\n[video](http://localhost:5890/folder/video.mp4)"
		result := excludeMediaTags(markdown)
		assert.Equal(t, "# Title\n\nSome text\n", result)
	})
}

func TestExcludeCodeBlocks(t *testing.T) {
	t.Run("should remove code blocks with backticks", func(t *testing.T) {
		markdown := "# Title\n```\ncode block\n```\nSome text"
		result := excludeCodeBlocks(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})

	t.Run("should remove code blocks with tildes", func(t *testing.T) {
		markdown := "# Title\n~~~\ncode block\n~~~\nSome text"
		result := excludeCodeBlocks(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})

	t.Run("should remove multiple code blocks", func(t *testing.T) {
		markdown := "# Title\n```\ncode block 1\n```\nSome text\n~~~\ncode block 2\n~~~"
		result := excludeCodeBlocks(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})
}

func TestExcludeFrontmatter(t *testing.T) {
	t.Run("should remove frontmatter", func(t *testing.T) {
		markdown := "---\ntitle: Test\ndate: 2023-01-01\n---\n# Title\nSome text"
		result := excludeFrontmatter(markdown)
		assert.Equal(t, "# Title\nSome text", result)
	})

	t.Run("should handle markdown without frontmatter", func(t *testing.T) {
		markdown := "# Title\nSome text"
		result := excludeFrontmatter(markdown)
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

func TestIsInternalURL(t *testing.T) {
	t.Run("should identify localhost URLs as internal", func(t *testing.T) {
		assert.True(t, isInternalURL("http://localhost:5890/path"))
		assert.True(t, isInternalURL("http://localhost/path"))
	})

	t.Run("should identify wails://localhost URLs as internal", func(t *testing.T) {
		assert.True(t, isInternalURL("wails://localhost:5173/path"))
		assert.True(t, isInternalURL("wails://localhost/path"))
		assert.True(t, isInternalURL("wails://localhost:5173/Folder Rename Test 2/Second.md"))
	})

	t.Run("should identify relative paths as internal", func(t *testing.T) {
		assert.True(t, isInternalURL("./file.md"))
		assert.True(t, isInternalURL("../folder/file.md"))
		assert.True(t, isInternalURL("file.md"))
	})

	t.Run("should identify absolute paths as internal", func(t *testing.T) {
		assert.True(t, isInternalURL("/path/to/file"))
	})

	t.Run("should identify anchor links as internal", func(t *testing.T) {
		assert.True(t, isInternalURL("#section"))
	})

	t.Run("should identify file protocols as internal", func(t *testing.T) {
		assert.True(t, isInternalURL("file:///path/to/file"))
	})

	t.Run("should identify mailto as internal", func(t *testing.T) {
		assert.True(t, isInternalURL("mailto:test@example.com"))
	})

	t.Run("should identify external HTTP URLs as external", func(t *testing.T) {
		assert.False(t, isInternalURL("http://example.com/path"))
		assert.False(t, isInternalURL("http://google.com"))
	})

	t.Run("should identify HTTPS URLs as external", func(t *testing.T) {
		assert.False(t, isInternalURL("https://example.com/path"))
		assert.False(t, isInternalURL("https://google.com"))
	})

	t.Run("should handle empty URLs", func(t *testing.T) {
		assert.False(t, isInternalURL(""))
		assert.False(t, isInternalURL("   "))
	})
}

func TestGetInternalLinksAndMedia(t *testing.T) {
	t.Run("should extract internal media URLs", func(t *testing.T) {
		markdown := "![Image](http://localhost:5890/folder/image.png)"
		result := GetInternalLinksAndMedia(markdown)
		assert.True(t, result.Has("http://localhost:5890/folder/image.png"))
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
		markdown := "![Image](http://localhost:5890/folder/image.png)"
		result := GetInternalLinksAndMediaAsSlice(markdown)
		assert.Contains(t, result, "http://localhost:5890/folder/image.png")
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

func TestReplaceNoteNameOfLocalURL(t *testing.T) {
	t.Run("should replace note name in FILE_SERVER_URL", func(t *testing.T) {
		url := "http://localhost:5890/notes/test-folder/old-note.md"
		result := replaceNoteNameOfLocalURL(url, "test-folder", "new-note.md")
		assert.Equal(t, "http://localhost:5890/notes/test-folder/new-note.md", result)
	})

	t.Run("should replace note name in INTERNAL_LINK_PREFIX URL", func(t *testing.T) {
		url := "wails://localhost:5173/notes/test-folder/old-note.md"
		result := replaceNoteNameOfLocalURL(url, "test-folder", "new-note.md")
		assert.Equal(t, "wails://localhost:5173/notes/test-folder/new-note.md", result)
	})

	t.Run("should handle folder names with spaces", func(t *testing.T) {
		url := "http://localhost:5890/notes/My Test Folder/old-note.md"
		result := replaceNoteNameOfLocalURL(url, "My Test Folder", "new-note.md")
		assert.Equal(t, "http://localhost:5890/notes/My Test Folder/new-note.md", result)
	})

	t.Run("should handle note names with spaces", func(t *testing.T) {
		url := "wails://localhost:5173/notes/test-folder/old note.md"
		result := replaceNoteNameOfLocalURL(url, "test-folder", "new note name.md")
		assert.Equal(t, "wails://localhost:5173/notes/test-folder/new note name.md", result)
	})

	t.Run("should not modify URL if folder doesn't match", func(t *testing.T) {
		url := "http://localhost:5890/notes/different-folder/note.md"
		result := replaceNoteNameOfLocalURL(url, "test-folder", "new-note.md")
		assert.Equal(t, url, result)
	})

	t.Run("should not modify non-localhost URLs", func(t *testing.T) {
		url := "https://example.com/test-folder/note.md"
		result := replaceNoteNameOfLocalURL(url, "test-folder", "new-note.md")
		assert.Equal(t, url, result)
	})

	t.Run("should handle URLs with insufficient segments", func(t *testing.T) {
		url := "http://localhost:5890/notes"
		result := replaceNoteNameOfLocalURL(url, "test-folder", "new-note.md")
		assert.Equal(t, url, result)
	})

	t.Run("should handle empty folder URL", func(t *testing.T) {
		url := "http://localhost:5890/notes/"
		result := replaceNoteNameOfLocalURL(url, "test-folder", "new-note.md")
		assert.Equal(t, url, result)
	})

	t.Run("should handle URL with nested path structure", func(t *testing.T) {
		url := "http://localhost:5890/notes/parent-folder/subfolder/note.md"
		result := replaceNoteNameOfLocalURL(url, "subfolder", "new-note.md")
		assert.Equal(t, "http://localhost:5890/notes/parent-folder/subfolder/new-note.md", result) // Should modify when folder matches second-to-last segment
	})

	t.Run("should not modify URL with nested structure when folder doesn't match", func(t *testing.T) {
		url := "http://localhost:5890/notes/parent-folder/subfolder/note.md"
		result := replaceNoteNameOfLocalURL(url, "parent-folder", "new-note.md")
		assert.Equal(t, url, result) // Should not modify since "parent-folder" is not the second-to-last segment
	})

	t.Run("should handle file extensions in note names", func(t *testing.T) {
		url := "wails://localhost:5173/notes/docs/image.png"
		result := replaceNoteNameOfLocalURL(url, "docs", "new-image.jpg")
		assert.Equal(t, "wails://localhost:5173/notes/docs/new-image.jpg", result)
	})
}

func TestUpdateNoteNameOfInternalLinksAndMedia(t *testing.T) {
	t.Run("should replace note name in FILE_SERVER_URL image URLs", func(t *testing.T) {
		markdown := "![Image](http://localhost:5890/notes/test-folder/old-image.png)"
		result := UpdateNoteNameOfInternalLinksAndMedia(markdown, "test-folder", "new-image.png")
		assert.Equal(t, "![Image](http://localhost:5890/notes/test-folder/new-image.png)", result)
	})

	t.Run("should replace note name in FILE_SERVER_URL link URLs", func(t *testing.T) {
		markdown := "[Link](http://localhost:5890/notes/test-folder/old-note.md)"
		result := UpdateNoteNameOfInternalLinksAndMedia(markdown, "test-folder", "new-note.md")
		assert.Equal(t, "[Link](http://localhost:5890/notes/test-folder/new-note.md)", result)
	})

	t.Run("should replace note name in INTERNAL_LINK_PREFIX image URLs", func(t *testing.T) {
		markdown := "![Image](wails://localhost:5173/notes/test-folder/old-image.png)"
		result := UpdateNoteNameOfInternalLinksAndMedia(markdown, "test-folder", "new-image.png")
		assert.Equal(t, "![Image](wails://localhost:5173/notes/test-folder/new-image.png)", result)
	})

	t.Run("should replace note name in INTERNAL_LINK_PREFIX link URLs", func(t *testing.T) {
		markdown := "[Link](wails://localhost:5173/notes/test-folder/old-note.md)"
		result := UpdateNoteNameOfInternalLinksAndMedia(markdown, "test-folder", "new-note.md")
		assert.Equal(t, "[Link](wails://localhost:5173/notes/test-folder/new-note.md)", result)
	})

	t.Run("should not modify URLs from different folders", func(t *testing.T) {
		markdown := "![Image](http://localhost:5890/notes/other-folder/image.png) [Link](wails://localhost:5173/notes/different-folder/note.md)"
		result := UpdateNoteNameOfInternalLinksAndMedia(markdown, "test-folder", "new-name.md")
		assert.Equal(t, markdown, result)
	})

	t.Run("should not modify external URLs", func(t *testing.T) {
		markdown := "![Image](https://example.com/image.png) [Link](https://example.com/page.html)"
		result := UpdateNoteNameOfInternalLinksAndMedia(markdown, "test-folder", "new-name.md")
		assert.Equal(t, markdown, result)
	})

	t.Run("should not modify relative URLs", func(t *testing.T) {
		markdown := "![Image](./image.png) [Link](../folder/page.md)"
		result := UpdateNoteNameOfInternalLinksAndMedia(markdown, "test-folder", "new-name.md")
		assert.Equal(t, markdown, result)
	})

	t.Run("should handle multiple URLs in the same folder", func(t *testing.T) {
		markdown := "![Image1](http://localhost:5890/notes/docs/image1.png) ![Image2](http://localhost:5890/notes/docs/image2.png)"
		result := UpdateNoteNameOfInternalLinksAndMedia(markdown, "docs", "new-image.png")
		expected := "![Image1](http://localhost:5890/notes/docs/new-image.png) ![Image2](http://localhost:5890/notes/docs/new-image.png)"
		assert.Equal(t, expected, result)
	})

	t.Run("should handle mixed localhost and wails URLs in same folder", func(t *testing.T) {
		markdown := "![Image](http://localhost:5890/notes/test-folder/image.png) [Link](wails://localhost:5173/notes/test-folder/note.md)"
		result := UpdateNoteNameOfInternalLinksAndMedia(markdown, "test-folder", "new-file.md")
		expected := "![Image](http://localhost:5890/notes/test-folder/new-file.md) [Link](wails://localhost:5173/notes/test-folder/new-file.md)"
		assert.Equal(t, expected, result)
	})

	t.Run("should handle mixed target and non-target folders", func(t *testing.T) {
		markdown := "![Target](http://localhost:5890/notes/target-folder/image.png) ![Other](http://localhost:5890/notes/other-folder/image.png) [Target](wails://localhost:5173/notes/target-folder/note.md)"
		result := UpdateNoteNameOfInternalLinksAndMedia(markdown, "target-folder", "new-name.md")
		expected := "![Target](http://localhost:5890/notes/target-folder/new-name.md) ![Other](http://localhost:5890/notes/other-folder/image.png) [Target](wails://localhost:5173/notes/target-folder/new-name.md)"
		assert.Equal(t, expected, result)
	})

	t.Run("should handle folder and note names with spaces", func(t *testing.T) {
		markdown := "[Link](wails://localhost:5173/notes/My Test Folder/Old Note Name.md)"
		result := UpdateNoteNameOfInternalLinksAndMedia(markdown, "My Test Folder", "New Note Name.md")
		assert.Equal(t, "[Link](wails://localhost:5173/notes/My Test Folder/New Note Name.md)", result)
	})

	t.Run("should handle empty markdown", func(t *testing.T) {
		result := UpdateNoteNameOfInternalLinksAndMedia("", "test-folder", "new-name.md")
		assert.Equal(t, "", result)
	})

	t.Run("should handle markdown with no URLs", func(t *testing.T) {
		markdown := "# Title\nThis is just plain text with no links or images."
		result := UpdateNoteNameOfInternalLinksAndMedia(markdown, "test-folder", "new-name.md")
		assert.Equal(t, markdown, result)
	})

	t.Run("should handle complex markdown with mixed content", func(t *testing.T) {
		markdown := `# My Document

Here's an image: ![Local Image](http://localhost:5890/notes/assets/picture.jpg)

And here's a link: [My Note](wails://localhost:5173/notes/assets/document.md)

External content: ![External](https://example.com/external.png) and [External Link](https://example.com)

Some more text and another local link: [Another Note](http://localhost:5890/notes/other-folder/other.md)`

		result := UpdateNoteNameOfInternalLinksAndMedia(markdown, "assets", "renamed-file.md")

		expected := `# My Document

Here's an image: ![Local Image](http://localhost:5890/notes/assets/renamed-file.md)

And here's a link: [My Note](wails://localhost:5173/notes/assets/renamed-file.md)

External content: ![External](https://example.com/external.png) and [External Link](https://example.com)

Some more text and another local link: [Another Note](http://localhost:5890/notes/other-folder/other.md)`

		assert.Equal(t, expected, result)
	})
}

func TestGetLastUpdatedFromFrontmatter(t *testing.T) {
	t.Run("should extract lastUpdated from frontmatter", func(t *testing.T) {
		markdown := "---\nlastUpdated: 2023-12-01T10:30:00Z\ntitle: Test Document\n---\n# Content"
		result, exists := GetLastUpdatedFromFrontmatter(markdown)
		assert.Equal(t, "2023-12-01T10:30:00Z", result)
		assert.True(t, exists)
	})

	t.Run("should return empty string and false when no frontmatter", func(t *testing.T) {
		markdown := "# Content without frontmatter"
		result, exists := GetLastUpdatedFromFrontmatter(markdown)
		assert.Equal(t, "", result)
		assert.False(t, exists)
	})

	t.Run("should return empty string and false when no lastUpdated field", func(t *testing.T) {
		markdown := "---\ntitle: Test Document\nauthor: Test Author\n---\n# Content"
		result, exists := GetLastUpdatedFromFrontmatter(markdown)
		assert.Equal(t, "", result)
		assert.False(t, exists)
	})

	t.Run("should handle invalid YAML in frontmatter", func(t *testing.T) {
		markdown := "---\ninvalid: yaml: content:\n---\n# Content"
		result, exists := GetLastUpdatedFromFrontmatter(markdown)
		assert.Equal(t, "", result)
		assert.False(t, exists)
	})

	t.Run("should handle non-string lastUpdated field", func(t *testing.T) {
		markdown := "---\nlastUpdated: 1234567890\ntitle: Test\n---\n# Content"
		result, exists := GetLastUpdatedFromFrontmatter(markdown)
		assert.Equal(t, "", result)
		assert.False(t, exists)
	})

	t.Run("should handle empty string lastUpdated field", func(t *testing.T) {
		markdown := "---\nlastUpdated: \"\"\ntitle: Test\n---\n# Content"
		result, exists := GetLastUpdatedFromFrontmatter(markdown)
		assert.Equal(t, "", result)
		assert.True(t, exists)
	})

	t.Run("should handle lastUpdated field with other fields present", func(t *testing.T) {
		markdown := "---\nlastUpdated: 2023-12-01T10:30:00Z\ntitle: Test\n---\n# Content"
		lastUpdatedResult, lastUpdatedExists := GetLastUpdatedFromFrontmatter(markdown)

		assert.Equal(t, "2023-12-01T10:30:00Z", lastUpdatedResult)
		assert.True(t, lastUpdatedExists)
	})
}

func TestGetTextContent(t *testing.T) {
	t.Run("should extract plain text content", func(t *testing.T) {
		markdown := "# Title\nThis is plain text content."
		result := GetTextContent(markdown)
		assert.Equal(t, "Title\nThis is plain text content.", result)
	})

	t.Run("should exclude frontmatter", func(t *testing.T) {
		markdown := "---\ntitle: Test\n---\n# Title\nContent here"
		result := GetTextContent(markdown)
		assert.Equal(t, "Title\nContent here", result)
	})

	t.Run("should exclude code blocks", func(t *testing.T) {
		markdown := "# Title\n```go\nfmt.Println(\"hello\")\n```\nMore content"
		result := GetTextContent(markdown)
		assert.Equal(t, "Title\n\nMore content", result)
	})

	t.Run("should exclude media tags", func(t *testing.T) {
		markdown := "# Title\n![Image](./image.png)\nContent after image"
		result := GetTextContent(markdown)
		assert.Equal(t, "Title\n\nContent after image", result)
	})

	t.Run("should extract text from links", func(t *testing.T) {
		markdown := "Visit [this link](http://example.com) for more info"
		result := GetTextContent(markdown)
		assert.Equal(t, "Visit this link for more info", result)
	})

	t.Run("should remove HTML tags", func(t *testing.T) {
		markdown := "This has <strong>bold</strong> and <em>italic</em> text"
		result := GetTextContent(markdown)
		assert.Equal(t, "This has bold and italic text", result)
	})
}

func TestGetCodeContent(t *testing.T) {
	t.Run("should extract code from single block", func(t *testing.T) {
		markdown := "# Title\n```go\nfmt.Println(\"hello\")\n```\nMore text"
		result := GetCodeContent(markdown)
		assert.Len(t, result, 1)
		assert.Equal(t, "fmt.Println(\"hello\")", result[0])
	})

	t.Run("should extract code from multiple blocks", func(t *testing.T) {
		markdown := "```go\nfmt.Println(\"hello\")\n```\n\n```python\nprint(\"world\")\n```"
		result := GetCodeContent(markdown)
		assert.Len(t, result, 2)
		assert.Contains(t, result, "fmt.Println(\"hello\")")
		assert.Contains(t, result, "print(\"world\")")
	})

	t.Run("should return empty slice when no code blocks", func(t *testing.T) {
		markdown := "# Title\nJust plain text content"
		result := GetCodeContent(markdown)
		assert.Len(t, result, 0)
	})

	t.Run("should handle empty code blocks", func(t *testing.T) {
		markdown := "```go\n\n```\n```python\nprint(\"hello\")\n```"
		result := GetCodeContent(markdown)
		assert.Len(t, result, 1)
		assert.Equal(t, "print(\"hello\")", result[0])
	})
}

func TestGetCodeContentForLanguage(t *testing.T) {
	t.Run("should extract Go code only", func(t *testing.T) {
		markdown := "```go\nfmt.Println(\"go\")\n```\n```python\nprint(\"python\")\n```"
		result := GetCodeContentForLanguage(markdown, "go")
		assert.Len(t, result, 1)
		assert.Equal(t, "fmt.Println(\"go\")", result[0])
	})

	t.Run("should extract Python code only", func(t *testing.T) {
		markdown := "```go\nfmt.Println(\"go\")\n```\n```python\nprint(\"python\")\n```"
		result := GetCodeContentForLanguage(markdown, "python")
		assert.Len(t, result, 1)
		assert.Equal(t, "print(\"python\")", result[0])
	})

	t.Run("should return empty for non-existent language", func(t *testing.T) {
		markdown := "```go\nfmt.Println(\"go\")\n```\n```python\nprint(\"python\")\n```"
		result := GetCodeContentForLanguage(markdown, "rust")
		assert.Len(t, result, 0)
	})

	t.Run("should handle special characters in language name", func(t *testing.T) {
		markdown := "```c++\n#include <iostream>\n```"
		result := GetCodeContentForLanguage(markdown, "c++")
		assert.Len(t, result, 1)
		assert.Equal(t, "#include <iostream>", result[0])
	})
}

func TestGetGoCodeContent(t *testing.T) {
	t.Run("should extract Go code blocks", func(t *testing.T) {
		markdown := "```go\npackage main\nfmt.Println(\"hello\")\n```\n```python\nprint(\"world\")\n```"
		result := GetGoCodeContent(markdown)
		assert.Len(t, result, 1)
		assert.Equal(t, "package main\nfmt.Println(\"hello\")", result[0])
	})

	t.Run("should return empty when no Go code", func(t *testing.T) {
		markdown := "```python\nprint(\"hello\")\n```\n```javascript\nconsole.log(\"world\")\n```"
		result := GetGoCodeContent(markdown)
		assert.Len(t, result, 0)
	})

	t.Run("should extract multiple Go code blocks", func(t *testing.T) {
		markdown := "```go\nfunc main() {}\n```\nSome text\n```go\nfunc test() {}\n```"
		result := GetGoCodeContent(markdown)
		assert.Len(t, result, 2)
		assert.Contains(t, result, "func main() {}")
		assert.Contains(t, result, "func test() {}")
	})
}

func TestGetJavaCodeContent(t *testing.T) {
	t.Run("should extract Java code blocks", func(t *testing.T) {
		markdown := "```java\npublic class Test {}\n```\n```python\nprint(\"world\")\n```"
		result := GetJavaCodeContent(markdown)
		assert.Len(t, result, 1)
		assert.Equal(t, "public class Test {}", result[0])
	})

	t.Run("should return empty when no Java code", func(t *testing.T) {
		markdown := "```python\nprint(\"hello\")\n```\n```go\nfmt.Println(\"world\")\n```"
		result := GetJavaCodeContent(markdown)
		assert.Len(t, result, 0)
	})
}

func TestGetPythonCodeContent(t *testing.T) {
	t.Run("should extract Python code blocks", func(t *testing.T) {
		markdown := "```python\nprint(\"hello world\")\nimport os\n```\n```go\nfmt.Println(\"go\")\n```"
		result := GetPythonCodeContent(markdown)
		assert.Len(t, result, 1)
		assert.Equal(t, "print(\"hello world\")\nimport os", result[0])
	})

	t.Run("should return empty when no Python code", func(t *testing.T) {
		markdown := "```java\nSystem.out.println(\"hello\")\n```\n```go\nfmt.Println(\"world\")\n```"
		result := GetPythonCodeContent(markdown)
		assert.Len(t, result, 0)
	})
}

func TestGetJavaScriptCodeContent(t *testing.T) {
	t.Run("should extract JavaScript code blocks", func(t *testing.T) {
		markdown := "```javascript\nconsole.log(\"hello\")\nconst x = 1\n```\n```python\nprint(\"world\")\n```"
		result := GetJavaScriptCodeContent(markdown)
		assert.Len(t, result, 1)
		assert.Equal(t, "console.log(\"hello\")\nconst x = 1", result[0])
	})

	t.Run("should extract js code blocks", func(t *testing.T) {
		markdown := "```js\nconsole.log(\"hello\")\n```\n```python\nprint(\"world\")\n```"
		result := GetJavaScriptCodeContent(markdown)
		assert.Len(t, result, 1)
		assert.Equal(t, "console.log(\"hello\")", result[0])
	})

	t.Run("should return empty when no JavaScript code", func(t *testing.T) {
		markdown := "```java\nSystem.out.println(\"hello\")\n```\n```python\nprint(\"world\")\n```"
		result := GetJavaScriptCodeContent(markdown)
		assert.Len(t, result, 0)
	})
}

func TestHasDrawing(t *testing.T) {
	t.Run("should return true when drawing block exists", func(t *testing.T) {
		markdown := "```drawing\n{\"elements\":[]}\n```"
		result := HasDrawing(markdown)
		assert.True(t, result)
	})

	t.Run("should return false when no drawing block", func(t *testing.T) {
		markdown := "```go\nfmt.Println(\"hello\")\n```\n```python\nprint(\"world\")\n```"
		result := HasDrawing(markdown)
		assert.False(t, result)
	})

	t.Run("should return false for empty markdown", func(t *testing.T) {
		result := HasDrawing("")
		assert.False(t, result)
	})
}

func TestHasCode(t *testing.T) {
	t.Run("should return true when language-specific code blocks exist", func(t *testing.T) {
		markdown := "```go\nfmt.Println(\"hello\")\n```"
		result := HasCode(markdown)
		assert.True(t, result)
	})

	t.Run("should return false when only plain code blocks exist", func(t *testing.T) {
		markdown := "```\nplain code block\n```"
		result := HasCode(markdown)
		assert.False(t, result)
	})

	t.Run("should return false when no code blocks", func(t *testing.T) {
		markdown := "# Title\nJust plain text"
		result := HasCode(markdown)
		assert.False(t, result)
	})

	t.Run("should return true for multiple different languages", func(t *testing.T) {
		markdown := "```python\nprint(\"hello\")\n```\n```\nplain\n```\n```go\nfmt.Println(\"world\")\n```"
		result := HasCode(markdown)
		assert.True(t, result)
	})
}

func TestHasGoCode(t *testing.T) {
	t.Run("should return true when Go code exists", func(t *testing.T) {
		markdown := "```go\npackage main\n```\n```python\nprint(\"hello\")\n```"
		result := HasGoCode(markdown)
		assert.True(t, result)
	})

	t.Run("should return false when no Go code", func(t *testing.T) {
		markdown := "```python\nprint(\"hello\")\n```\n```javascript\nconsole.log(\"world\")\n```"
		result := HasGoCode(markdown)
		assert.False(t, result)
	})

	t.Run("should return false for empty markdown", func(t *testing.T) {
		result := HasGoCode("")
		assert.False(t, result)
	})
}

func TestHasJavaCode(t *testing.T) {
	t.Run("should return true when Java code exists", func(t *testing.T) {
		markdown := "```java\npublic class Test {}\n```\n```python\nprint(\"hello\")\n```"
		result := HasJavaCode(markdown)
		assert.True(t, result)
	})

	t.Run("should return false when no Java code", func(t *testing.T) {
		markdown := "```python\nprint(\"hello\")\n```\n```go\nfmt.Println(\"world\")\n```"
		result := HasJavaCode(markdown)
		assert.False(t, result)
	})
}

func TestHasPythonCode(t *testing.T) {
	t.Run("should return true when Python code exists", func(t *testing.T) {
		markdown := "```python\nprint(\"hello world\")\n```\n```go\nfmt.Println(\"go\")\n```"
		result := HasPythonCode(markdown)
		assert.True(t, result)
	})

	t.Run("should return false when no Python code", func(t *testing.T) {
		markdown := "```java\nSystem.out.println(\"hello\")\n```\n```go\nfmt.Println(\"world\")\n```"
		result := HasPythonCode(markdown)
		assert.False(t, result)
	})
}

func TestHasJavaScriptCode(t *testing.T) {
	t.Run("should return true when JavaScript code exists", func(t *testing.T) {
		markdown := "```javascript\nconsole.log(\"hello\")\n```\n```python\nprint(\"world\")\n```"
		result := HasJavaScriptCode(markdown)
		assert.True(t, result)
	})

	t.Run("should return true when js code exists", func(t *testing.T) {
		markdown := "```js\nconsole.log(\"hello\")\n```\n```python\nprint(\"world\")\n```"
		result := HasJavaScriptCode(markdown)
		assert.True(t, result)
	})

	t.Run("should return false when no JavaScript code", func(t *testing.T) {
		markdown := "```java\nSystem.out.println(\"hello\")\n```\n```python\nprint(\"world\")\n```"
		result := HasJavaScriptCode(markdown)
		assert.False(t, result)
	})
}

func TestGetTagsFromFrontmatter(t *testing.T) {
	t.Run("should extract tags from valid frontmatter", func(t *testing.T) {
		// Test array format
		markdown := "---\ntags:\n  - golang\n  - testing\ntitle: Test\n---\n# Content"
		result, exists := GetTagsFromFrontmatter(markdown)
		assert.True(t, exists)
		assert.Len(t, result, 2)
		assert.Contains(t, result, "golang")
		assert.Contains(t, result, "testing")

		// Test single string format
		markdown = "---\ntags: single-tag\n---\n# Content"
		result, exists = GetTagsFromFrontmatter(markdown)
		assert.True(t, exists)
		assert.Len(t, result, 1)
		assert.Contains(t, result, "single-tag")
	})

	t.Run("should handle missing or invalid cases", func(t *testing.T) {
		// No frontmatter
		result, exists := GetTagsFromFrontmatter("# Content without frontmatter")
		assert.False(t, exists)
		assert.Len(t, result, 0)

		// No tags field
		result, exists = GetTagsFromFrontmatter("---\ntitle: Test\n---\n# Content")
		assert.False(t, exists)
		assert.Len(t, result, 0)

		// Invalid YAML
		result, exists = GetTagsFromFrontmatter("---\ninvalid: yaml: content:\n---\n# Content")
		assert.False(t, exists)
		assert.Len(t, result, 0)
	})

	t.Run("should filter non-string tags", func(t *testing.T) {
		markdown := "---\ntags:\n  - golang\n  - 123\n  - testing\n---\n# Content"
		result, exists := GetTagsFromFrontmatter(markdown)
		assert.True(t, exists)
		assert.Len(t, result, 2)
		assert.Contains(t, result, "golang")
		assert.Contains(t, result, "testing")
		assert.NotContains(t, result, "123")
	})
}

func TestUpdateFrontmatterWithTags(t *testing.T) {
	t.Run("should handle frontmatter updates", func(t *testing.T) {
		// Add tags to markdown without frontmatter
		markdown := "# Test Note\n\nContent."
		result := updateFrontmatterWithTags(markdown, []string{"golang", "testing"})
		assert.Contains(t, result, "---")
		assert.Contains(t, result, "tags:")
		assert.Contains(t, result, "- golang")
		assert.Contains(t, result, "- testing")

		// Update existing frontmatter
		markdown = "---\ntitle: Test\n---\n# Content"
		result = updateFrontmatterWithTags(markdown, []string{"new-tag"})
		assert.Contains(t, result, "title: Test")
		assert.Contains(t, result, "- new-tag")

		// Replace existing tags
		markdown = "---\ntags:\n  - old-tag\ntitle: Test\n---\n# Content"
		result = updateFrontmatterWithTags(markdown, []string{"new-tag"})
		assert.Contains(t, result, "- new-tag")
		assert.NotContains(t, result, "- old-tag")
	})

	t.Run("should handle empty tags", func(t *testing.T) {
		// Remove tags field when empty tags provided
		markdown := "---\ntags:\n  - old-tag\ntitle: Test\n---\n# Content"
		result := updateFrontmatterWithTags(markdown, []string{})
		assert.Contains(t, result, "title: Test")
		assert.NotContains(t, result, "tags:")

		// No change when no tags and no existing frontmatter
		markdown = "# Test Note"
		result = updateFrontmatterWithTags(markdown, []string{})
		assert.Equal(t, markdown, result)
	})
}

func TestGetTagsFromNote(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "bytebook_get_tags_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Setup test directory structure
	folderPath := filepath.Join(tmpDir, "notes", "test-folder")
	err = os.MkdirAll(folderPath, 0755)
	if err != nil {
		t.Fatalf("Failed to create test folder: %v", err)
	}

	t.Run("should read tags from note files", func(t *testing.T) {
		// Test note with tags
		testFile1 := filepath.Join(folderPath, "with-tags.md")
		content1 := "---\ntags:\n  - golang\n  - testing\ntitle: Test\n---\n# Content"
		err := os.WriteFile(testFile1, []byte(content1), 0644)
		assert.NoError(t, err)

		tags, exists, err := GetTagsFromNote(tmpDir, "test-folder/with-tags.md")
		assert.NoError(t, err)
		assert.True(t, exists)
		assert.Len(t, tags, 2)
		assert.Contains(t, tags, "golang")
		assert.Contains(t, tags, "testing")
	})

	t.Run("should handle file errors", func(t *testing.T) {
		// Non-existent file
		tags, exists, err := GetTagsFromNote(tmpDir, "test-folder/nonexistent.md")
		assert.Error(t, err)
		assert.False(t, exists)
		assert.Len(t, tags, 0)

		// Invalid folder path
		tags, exists, err = GetTagsFromNote(tmpDir, "nonexistent-folder/test.md")
		assert.Error(t, err)
		assert.False(t, exists)
		assert.Len(t, tags, 0)
	})
}

func TestAddTagsToNote(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "bytebook_tags_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Setup test directory structure
	folderPath := filepath.Join(tmpDir, "notes", "test-folder")
	err = os.MkdirAll(folderPath, 0755)
	if err != nil {
		t.Fatalf("Failed to create test folder: %v", err)
	}

	t.Run("should add tags to notes", func(t *testing.T) {
		// Test without existing frontmatter
		testFile1 := filepath.Join(folderPath, "test1.md")
		err := os.WriteFile(testFile1, []byte("# Test Note"), 0644)
		assert.NoError(t, err)

		err = AddTagsToNote(tmpDir, "test-folder/test1.md", []string{"golang", "testing"})
		assert.NoError(t, err)

		content, _ := os.ReadFile(testFile1)
		assert.Contains(t, string(content), "tags:")
		assert.Contains(t, string(content), "- golang")
		assert.Contains(t, string(content), "- testing")

		// Test with existing frontmatter and deduplication
		testFile2 := filepath.Join(folderPath, "test2.md")
		initialContent := "---\ntags:\n  - existing\ntitle: Test\n---\n# Content"
		err = os.WriteFile(testFile2, []byte(initialContent), 0644)
		assert.NoError(t, err)

		err = AddTagsToNote(tmpDir, "test-folder/test2.md", []string{"existing", "new", "", "  "})
		assert.NoError(t, err)

		content, _ = os.ReadFile(testFile2)
		tags, exists := GetTagsFromFrontmatter(string(content))
		assert.True(t, exists)
		assert.Len(t, tags, 2) // Should deduplicate and ignore empty tags
		assert.Contains(t, tags, "existing")
		assert.Contains(t, tags, "new")
	})

	t.Run("should handle errors", func(t *testing.T) {
		// Non-existent file
		err := AddTagsToNote(tmpDir, "test-folder/nonexistent.md", []string{"tag"})
		assert.Error(t, err)

		// Invalid folder path
		err = AddTagsToNote(tmpDir, "nonexistent-folder/test.md", []string{"tag"})
		assert.Error(t, err)
	})
}

func TestDeleteTagsFromNote(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "bytebook_delete_tags_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Setup test directory structure
	folderPath := filepath.Join(tmpDir, "notes", "test-folder")
	err = os.MkdirAll(folderPath, 0755)
	if err != nil {
		t.Fatalf("Failed to create test folder: %v", err)
	}

	t.Run("should delete tags from notes", func(t *testing.T) {
		// Test deleting specific tags
		testFile1 := filepath.Join(folderPath, "test1.md")
		content1 := "---\ntags:\n  - golang\n  - testing\n  - keep\n---\n# Test Note"
		err := os.WriteFile(testFile1, []byte(content1), 0644)
		assert.NoError(t, err)

		updatedTags, err := DeleteTagsFromNote(tmpDir, "test-folder/test1.md", []string{"testing", "golang"})
		assert.NoError(t, err)
		assert.Len(t, updatedTags, 1)
		assert.Contains(t, updatedTags, "keep")

		content, _ := os.ReadFile(testFile1)
		tags, exists := GetTagsFromFrontmatter(string(content))
		assert.True(t, exists)
		assert.Len(t, tags, 1)
		assert.Contains(t, tags, "keep")

		// Test removing all tags (removes tags field entirely)
		testFile2 := filepath.Join(folderPath, "test2.md")
		content2 := "---\ntags:\n  - tag1\n  - tag2\ntitle: Test\n---\n# Content"
		err = os.WriteFile(testFile2, []byte(content2), 0644)
		assert.NoError(t, err)

		updatedTags, err = DeleteTagsFromNote(tmpDir, "test-folder/test2.md", []string{"tag1", "tag2"})
		assert.NoError(t, err)
		assert.Len(t, updatedTags, 0)

		content, _ = os.ReadFile(testFile2)
		assert.Contains(t, string(content), "title: Test")
		assert.NotContains(t, string(content), "tags:")
	})

	t.Run("should handle edge cases", func(t *testing.T) {
		// No tags to delete - should do nothing
		testFile := filepath.Join(folderPath, "test3.md")
		content := "---\ntitle: Test\n---\n# Content"
		err := os.WriteFile(testFile, []byte(content), 0644)
		assert.NoError(t, err)

		updatedTags, err := DeleteTagsFromNote(tmpDir, "test-folder/test3.md", []string{"nonexistent"})
		assert.NoError(t, err)
		assert.Len(t, updatedTags, 0)

		result, _ := os.ReadFile(testFile)
		assert.Equal(t, content, string(result)) // Should be unchanged

		// Non-existent tags - should do nothing
		testFile2 := filepath.Join(folderPath, "test4.md")
		content2 := "---\ntags:\n  - existing\n---\n# Content"
		err = os.WriteFile(testFile2, []byte(content2), 0644)
		assert.NoError(t, err)

		updatedTags, err = DeleteTagsFromNote(tmpDir, "test-folder/test4.md", []string{"missing"})
		assert.NoError(t, err)
		assert.Len(t, updatedTags, 1)
		assert.Contains(t, updatedTags, "existing")

		tags, exists := GetTagsFromFrontmatter(string(content2))
		assert.True(t, exists)
		assert.Contains(t, tags, "existing")
	})

	t.Run("should handle errors", func(t *testing.T) {
		// Non-existent file
		updatedTags, err := DeleteTagsFromNote(tmpDir, "test-folder/nonexistent.md", []string{"tag"})
		assert.Error(t, err)
		assert.Nil(t, updatedTags)

		// Invalid folder path
		updatedTags, err = DeleteTagsFromNote(tmpDir, "nonexistent-folder/test.md", []string{"tag"})
		assert.Error(t, err)
		assert.Nil(t, updatedTags)
	})
}
