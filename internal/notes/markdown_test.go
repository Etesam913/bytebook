package notes

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestExcludeMediaTags(t *testing.T) {
	t.Run("should remove image tags", func(t *testing.T) {
		markdown := "# Title\n![Image](/notes/folder/image.png)\nSome text"
		result := excludeMediaTags(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})

	t.Run("should remove video tags", func(t *testing.T) {
		markdown := "# Title\n[video](/notes/folder/video.mp4)\nSome text"
		result := excludeMediaTags(markdown)
		assert.Equal(t, "# Title\n\nSome text", result)
	})

	t.Run("should remove both image and video tags", func(t *testing.T) {
		markdown := "# Title\n![Image](/notes/folder/image.png)\nSome text\n[video](/notes/folder/video.mp4)"
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

func TestGetInternalLinksFromBody(t *testing.T) {
	t.Run("should extract internal note links", func(t *testing.T) {
		markdown := "Check [my note](/notes/folder/note.md) for details"
		result := GetInternalLinksFromBody(markdown)
		assert.Equal(t, []string{"/notes/folder/note.md"}, result)
	})

	t.Run("should extract internal media links", func(t *testing.T) {
		markdown := "![image](/notes/temp/890fcefa/appicon.png)"
		result := GetInternalLinksFromBody(markdown)
		assert.Equal(t, []string{"/notes/temp/890fcefa/appicon.png"}, result)
	})

	t.Run("should filter out external links", func(t *testing.T) {
		markdown := "[external](https://example.com) and [internal](/notes/folder/note.md)"
		result := GetInternalLinksFromBody(markdown)
		assert.Equal(t, []string{"/notes/folder/note.md"}, result)
	})

	t.Run("should deduplicate links", func(t *testing.T) {
		markdown := "[note1](/notes/folder/note.md) and [note1 again](/notes/folder/note.md)"
		result := GetInternalLinksFromBody(markdown)
		assert.Equal(t, []string{"/notes/folder/note.md"}, result)
	})

	t.Run("should extract both link and media types", func(t *testing.T) {
		markdown := "[note](/notes/folder/note.md)\n![img](/notes/folder/image.png)"
		result := GetInternalLinksFromBody(markdown)
		assert.Equal(t, []string{"/notes/folder/note.md", "/notes/folder/image.png"}, result)
	})

	t.Run("should return nil for no internal links", func(t *testing.T) {
		markdown := "Just some text with [external](https://example.com)"
		result := GetInternalLinksFromBody(markdown)
		assert.Nil(t, result)
	})
}

func TestParseMarkdownMetadataDates(t *testing.T) {
	t.Run("should extract lastUpdated and createdDate from frontmatter", func(t *testing.T) {
		markdown := "---\nlastUpdated: 2023-12-01T10:30:00Z\ncreatedDate: 2023-11-01T08:00:00Z\ntitle: Test Document\n---\n# Content"
		metadata := ParseMarkdownMetadata(markdown)
		assert.Equal(t, "2023-12-01T10:30:00Z", metadata.LastUpdated)
		assert.Equal(t, "2023-11-01T08:00:00Z", metadata.CreatedDate)
	})

	t.Run("should return empty strings when no frontmatter", func(t *testing.T) {
		metadata := ParseMarkdownMetadata("# Content without frontmatter")
		assert.Equal(t, "", metadata.LastUpdated)
		assert.Equal(t, "", metadata.CreatedDate)
	})

	t.Run("should return empty strings when date fields are missing", func(t *testing.T) {
		metadata := ParseMarkdownMetadata("---\ntitle: Test Document\nauthor: Test Author\n---\n# Content")
		assert.Equal(t, "", metadata.LastUpdated)
		assert.Equal(t, "", metadata.CreatedDate)
	})

	t.Run("should return empty strings for invalid YAML", func(t *testing.T) {
		metadata := ParseMarkdownMetadata("---\ninvalid: yaml: content:\n---\n# Content")
		assert.Equal(t, "", metadata.LastUpdated)
		assert.Equal(t, "", metadata.CreatedDate)
	})

	t.Run("should ignore non-string lastUpdated values", func(t *testing.T) {
		metadata := ParseMarkdownMetadata("---\nlastUpdated: 1234567890\ntitle: Test\n---\n# Content")
		assert.Equal(t, "", metadata.LastUpdated)
	})

	t.Run("should return no tags without frontmatter", func(t *testing.T) {
		metadata := ParseMarkdownMetadata("# Content")
		assert.NotNil(t, metadata.Tags)
		assert.Empty(t, metadata.Tags)
	})
}

func TestParseCodeBlocks(t *testing.T) {
	t.Run("should group code contents by language", func(t *testing.T) {
		markdown := "# Title\n```go\nfmt.Println(\"hello\")\n```\nMore text\n```python\nprint(\"world\")\n```"
		blocks := ParseCodeBlocks(markdown)
		assert.Equal(t, []string{"fmt.Println(\"hello\")", "print(\"world\")"}, blocks.All)
		assert.Equal(t, []string{"fmt.Println(\"hello\")"}, blocks.Go)
		assert.Equal(t, []string{"print(\"world\")"}, blocks.Python)
		assert.Empty(t, blocks.Java)
		assert.Empty(t, blocks.JavaScript)
		assert.True(t, blocks.HasLanguage)
		assert.True(t, blocks.HasGo)
		assert.True(t, blocks.HasPython)
		assert.False(t, blocks.HasJava)
		assert.False(t, blocks.HasJavaScript)
	})

	t.Run("empty code block still counts as present", func(t *testing.T) {
		blocks := ParseCodeBlocks("```go\n\n```\n```python\nprint(\"hello\")\n```")
		assert.Equal(t, []string{"print(\"hello\")"}, blocks.All)
		assert.Empty(t, blocks.Go)
		assert.True(t, blocks.HasGo)
		assert.True(t, blocks.HasLanguage)
	})

	t.Run("plain code block has content but no language", func(t *testing.T) {
		blocks := ParseCodeBlocks("```\nplain code block\n```")
		assert.Equal(t, []string{"plain code block"}, blocks.All)
		assert.False(t, blocks.HasLanguage)
	})

	t.Run("should match language aliases and suffixes", func(t *testing.T) {
		blocks := ParseCodeBlocks("```golang\npackage main\n```\n```java-17\nclass A {}\n```\n```js\nconsole.log(1)\n```")
		assert.Equal(t, []string{"package main"}, blocks.Go)
		assert.Equal(t, []string{"class A {}"}, blocks.Java)
		assert.Equal(t, []string{"console.log(1)"}, blocks.JavaScript)
	})

	t.Run("should not treat javascript as java", func(t *testing.T) {
		blocks := ParseCodeBlocks("```javascript\nconsole.log(\"hello\")\n```")
		assert.True(t, blocks.HasJavaScript)
		assert.False(t, blocks.HasJava)
		assert.Empty(t, blocks.Java)
	})

	t.Run("should return empty result when there are no code blocks", func(t *testing.T) {
		blocks := ParseCodeBlocks("# Title\nJust plain text")
		assert.Empty(t, blocks.All)
		assert.False(t, blocks.HasLanguage)
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

		_, err = AddTagsToNote(tmpDir, "test-folder/test1.md", []string{"golang", "testing"})
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

		_, err = AddTagsToNote(tmpDir, "test-folder/test2.md", []string{"existing", "new", "", "  "})
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
		_, err := AddTagsToNote(tmpDir, "test-folder/nonexistent.md", []string{"tag"})
		assert.Error(t, err)

		// Invalid folder path
		_, err = AddTagsToNote(tmpDir, "nonexistent-folder/test.md", []string{"tag"})
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
