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

func TestCalculateInternalLinksDiff(t *testing.T) {
	// Create a temporary directory for testing
	tmpDir, err := os.MkdirTemp("", "bytebook_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Setup test directory structure
	notesDir := filepath.Join(tmpDir, "notes")
	testFolder := "test-folder"
	folderPath := filepath.Join(notesDir, testFolder)

	err = os.MkdirAll(folderPath, 0755)
	if err != nil {
		t.Fatalf("Failed to create test folder: %v", err)
	}

	t.Run("should identify newly added links", func(t *testing.T) {
		previousMarkdown := "![Image1](./image1.png) [Link1](./page1.md)"
		newMarkdown := "![Image1](./image1.png) [Link1](./page1.md) ![Image2](./image2.png) [Link2](./page2.md)"

		added, removed := CalculateInternalLinksDiff(tmpDir, testFolder, previousMarkdown, newMarkdown)

		// Since no .attachments.json exists, all links are considered newly added
		assert.Len(t, added, 4)
		assert.Contains(t, added, "./image1.png")
		assert.Contains(t, added, "./page1.md")
		assert.Contains(t, added, "./image2.png")
		assert.Contains(t, added, "./page2.md")
		assert.Len(t, removed, 0)
	})

	t.Run("should identify newly removed links", func(t *testing.T) {
		previousMarkdown := "![Image1](./image1.png) [Link1](./page1.md) ![Image2](./image2.png) [Link2](./page2.md)"
		newMarkdown := "![Image1](./image1.png) [Link1](./page1.md)"

		added, removed := CalculateInternalLinksDiff(tmpDir, testFolder, previousMarkdown, newMarkdown)

		// Since no .attachments.json exists, remaining links are still considered newly added
		assert.Len(t, added, 2)
		assert.Contains(t, added, "./image1.png")
		assert.Contains(t, added, "./page1.md")
		assert.Len(t, removed, 2)
		assert.Contains(t, removed, "./image2.png")
		assert.Contains(t, removed, "./page2.md")
	})

	t.Run("should identify both added and removed links", func(t *testing.T) {
		previousMarkdown := "![Image1](./image1.png) [Link1](./page1.md)"
		newMarkdown := "![Image2](./image2.png) [Link2](./page2.md)"

		added, removed := CalculateInternalLinksDiff(tmpDir, testFolder, previousMarkdown, newMarkdown)

		assert.Len(t, added, 2)
		assert.Contains(t, added, "./image2.png")
		assert.Contains(t, added, "./page2.md")
		assert.Len(t, removed, 2)
		assert.Contains(t, removed, "./image1.png")
		assert.Contains(t, removed, "./page1.md")
	})

	t.Run("should handle no changes", func(t *testing.T) {
		markdown := "![Image1](./image1.png) [Link1](./page1.md)"

		added, removed := CalculateInternalLinksDiff(tmpDir, testFolder, markdown, markdown)

		// Since no .attachments.json exists, links are still considered newly added
		assert.Len(t, added, 2)
		assert.Contains(t, added, "./image1.png")
		assert.Contains(t, added, "./page1.md")
		assert.Len(t, removed, 0)
	})

	t.Run("should handle empty markdown", func(t *testing.T) {
		added, removed := CalculateInternalLinksDiff(tmpDir, testFolder, "", "")

		assert.Len(t, added, 0)
		assert.Len(t, removed, 0)
	})

	t.Run("should ignore external URLs", func(t *testing.T) {
		previousMarkdown := "![External](https://example.com/image.png) [Internal](./page.md)"
		newMarkdown := "![External2](https://example.com/image2.png) [Internal2](./page2.md)"

		added, removed := CalculateInternalLinksDiff(tmpDir, testFolder, previousMarkdown, newMarkdown)

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

func TestGetIdFromFrontmatter(t *testing.T) {
	t.Run("should extract id from frontmatter", func(t *testing.T) {
		markdown := "---\nid: test-123\ntitle: Test Document\n---\n# Content"
		result, exists := GetIdFromFrontmatter(markdown)
		assert.Equal(t, "test-123", result)
		assert.True(t, exists)
	})

	t.Run("should return empty string and false when no frontmatter", func(t *testing.T) {
		markdown := "# Content without frontmatter"
		result, exists := GetIdFromFrontmatter(markdown)
		assert.Equal(t, "", result)
		assert.False(t, exists)
	})

	t.Run("should return empty string and false when no id field", func(t *testing.T) {
		markdown := "---\ntitle: Test Document\nauthor: Test Author\n---\n# Content"
		result, exists := GetIdFromFrontmatter(markdown)
		assert.Equal(t, "", result)
		assert.False(t, exists)
	})

	t.Run("should handle invalid YAML in frontmatter", func(t *testing.T) {
		markdown := "---\ninvalid: yaml: content:\n---\n# Content"
		result, exists := GetIdFromFrontmatter(markdown)
		assert.Equal(t, "", result)
		assert.False(t, exists)
	})

	t.Run("should handle non-string id field", func(t *testing.T) {
		markdown := "---\nid: 123\ntitle: Test\n---\n# Content"
		result, exists := GetIdFromFrontmatter(markdown)
		assert.Equal(t, "", result)
		assert.False(t, exists)
	})

	t.Run("should handle empty string id field", func(t *testing.T) {
		markdown := "---\nid: \"\"\ntitle: Test\n---\n# Content"
		result, exists := GetIdFromFrontmatter(markdown)
		assert.Equal(t, "", result)
		assert.True(t, exists)
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

	t.Run("should handle both id and lastUpdated fields", func(t *testing.T) {
		markdown := "---\nid: test-123\nlastUpdated: 2023-12-01T10:30:00Z\ntitle: Test\n---\n# Content"
		idResult, idExists := GetIdFromFrontmatter(markdown)
		lastUpdatedResult, lastUpdatedExists := GetLastUpdatedFromFrontmatter(markdown)

		assert.Equal(t, "test-123", idResult)
		assert.True(t, idExists)
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
