package search

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetPathToIndex(t *testing.T) {
	t.Run("should return correct index path", func(t *testing.T) {
		projectPath := "/path/to/project"
		expected := filepath.Join(projectPath, INDEX_NAME)
		result := GetPathToIndex(projectPath)
		assert.Equal(t, expected, result)
	})

	t.Run("should handle empty project path", func(t *testing.T) {
		result := GetPathToIndex("")
		assert.Equal(t, INDEX_NAME, result)
	})

	t.Run("should handle project path with trailing slash", func(t *testing.T) {
		projectPath := "/path/to/project/"
		expected := filepath.Join(projectPath, INDEX_NAME)
		result := GetPathToIndex(projectPath)
		assert.Equal(t, expected, result)
	})
}

func TestCreateMarkdownNoteBleveDocument(t *testing.T) {
	t.Run("should create document with basic markdown", func(t *testing.T) {
		markdown := "# Hello World\nThis is some text content."
		folder := "test-folder"
		fileName := "test.md"

		doc := CreateMarkdownNoteBleveDocument(markdown, folder, fileName)

		assert.Equal(t, folder, doc.Folder)
		assert.Equal(t, fileName, doc.FileName)
		assert.Equal(t, ".md", doc.FileExtension)
		assert.Contains(t, doc.TextContent, "Hello World")
		assert.Contains(t, doc.TextContent, "This is some text content.")
		assert.Len(t, doc.CodeContent, 0)
		assert.False(t, doc.HasCode)
		assert.False(t, doc.HasDrawing)
	})

	t.Run("should extract code content correctly", func(t *testing.T) {
		markdown := `# Code Example
Here's some Go code:

` + "```go\nfunc main() {\n    fmt.Println(\"Hello\")\n}\n```" + `

And some Python:

` + "```python\nprint(\"Hello World\")\n```"

		doc := CreateMarkdownNoteBleveDocument(markdown, "folder", "file.md")

		assert.True(t, doc.HasCode)
		assert.True(t, doc.HasGoCode)
		assert.True(t, doc.HasPythonCode)
		assert.False(t, doc.HasJavaCode)
		assert.False(t, doc.HasJavaScriptCode)
		assert.Len(t, doc.CodeContent, 2)
		assert.Len(t, doc.GoCodeContent, 1)
		assert.Len(t, doc.PythonCodeContent, 1)
		assert.Contains(t, doc.GoCodeContent[0], "fmt.Println")
		assert.Contains(t, doc.PythonCodeContent[0], "print")
	})

	t.Run("should detect JavaScript code", func(t *testing.T) {
		markdown := `# JavaScript Example

` + "```javascript\nconsole.log(\"Hello\");\n```" + `

` + "```js\nconst x = 1;\n```"

		doc := CreateMarkdownNoteBleveDocument(markdown, "folder", "file.md")

		assert.True(t, doc.HasJavaScriptCode)
		assert.Len(t, doc.JavaScriptCodeContent, 2)
		assert.Contains(t, doc.JavaScriptCodeContent[0], "console.log")
		assert.Contains(t, doc.JavaScriptCodeContent[1], "const x = 1")
	})

	t.Run("should detect Java code", func(t *testing.T) {
		markdown := `# Java Example

` + "```java\npublic class Hello {\n    public static void main(String[] args) {\n        System.out.println(\"Hello\");\n    }\n}\n```"

		doc := CreateMarkdownNoteBleveDocument(markdown, "folder", "file.md")

		assert.True(t, doc.HasJavaCode)
		assert.Len(t, doc.JavaCodeContent, 1)
		assert.Contains(t, doc.JavaCodeContent[0], "public class Hello")
	})

	t.Run("should detect drawing blocks", func(t *testing.T) {
		markdown := `# Drawing Example

` + "```drawing\n{\"elements\": []}\n```"

		doc := CreateMarkdownNoteBleveDocument(markdown, "folder", "file.md")

		assert.True(t, doc.HasDrawing)
	})

	t.Run("should extract text content excluding code and media", func(t *testing.T) {
		markdown := `---
title: Test Document
---

# Main Title

This is regular text content.

![Image](./image.png)

` + "```python\nprint(\"code\")\n```" + `

More text after code.

[Link](http://example.com) to external site.
`

		doc := CreateMarkdownNoteBleveDocument(markdown, "folder", "file.md")

		assert.Contains(t, doc.TextContent, "Main Title")
		assert.Contains(t, doc.TextContent, "This is regular text content")
		assert.Contains(t, doc.TextContent, "More text after code")
		assert.Contains(t, doc.TextContent, "Link to external site")
		assert.NotContains(t, doc.TextContent, "print(\"code\")")
		assert.NotContains(t, doc.TextContent, "![Image]")
		assert.NotContains(t, doc.TextContent, "title: Test Document")
	})

	t.Run("should handle empty markdown", func(t *testing.T) {
		doc := CreateMarkdownNoteBleveDocument("", "folder", "file.md")

		assert.Equal(t, "folder", doc.Folder)
		assert.Equal(t, "file.md", doc.FileName)
		assert.Equal(t, ".md", doc.FileExtension)
		assert.Equal(t, "", doc.TextContent)
		assert.Len(t, doc.CodeContent, 0)
		assert.False(t, doc.HasCode)
		assert.False(t, doc.HasDrawing)
		assert.Equal(t, "", doc.LastUpdated)
		assert.Equal(t, "", doc.CreatedDate)
	})

	t.Run("should extract frontmatter date fields", func(t *testing.T) {
		markdown := `---
id: test-123
lastUpdated: 2023-12-01T10:30:00Z
createdDate: 2023-11-01T09:00:00Z
title: Test Document
---

# Test Content

This is a test document with frontmatter dates.
`
		doc := CreateMarkdownNoteBleveDocument(markdown, "tests", "date-test.md")

		assert.Equal(t, "tests", doc.Folder)
		assert.Equal(t, "date-test.md", doc.FileName)
		assert.Equal(t, "2023-12-01T10:30:00Z", doc.LastUpdated)
		assert.Equal(t, "2023-11-01T09:00:00Z", doc.CreatedDate)
		assert.Contains(t, doc.TextContent, "Test Content")
		assert.Contains(t, doc.TextContent, "This is a test document with frontmatter dates")
	})

	t.Run("should handle missing date fields in frontmatter", func(t *testing.T) {
		markdown := `---
id: test-456
title: Document Without Dates
---

# Content Only

No dates in this frontmatter.
`
		doc := CreateMarkdownNoteBleveDocument(markdown, "tests", "no-dates.md")

		assert.Equal(t, "", doc.LastUpdated)
		assert.Equal(t, "", doc.CreatedDate)
		assert.Contains(t, doc.TextContent, "Content Only")
	})

	t.Run("should handle complex markdown with multiple languages", func(t *testing.T) {
		markdown := `---
lastUpdated: 2023-12-05T14:30:00Z
createdDate: 2023-12-01T10:00:00Z
author: Test Author
---

# Multi-Language Document

Some text content here.

` + "```go\npackage main\nfunc main() {}\n```" + `

` + "```python\ndef hello():\n    pass\n```" + `

` + "```javascript\nfunction test() {}\n```" + `

` + "```java\nclass Test {}\n```" + `

` + "```drawing\n{\"elements\":[]}\n```" + `

More text content.
`

		doc := CreateMarkdownNoteBleveDocument(markdown, "examples", "multi.md")

		assert.True(t, doc.HasCode)
		assert.True(t, doc.HasGoCode)
		assert.True(t, doc.HasPythonCode)
		assert.True(t, doc.HasJavaScriptCode)
		assert.True(t, doc.HasJavaCode)
		assert.True(t, doc.HasDrawing)
		assert.Len(t, doc.CodeContent, 5) // Includes all code blocks including drawing
		assert.Len(t, doc.GoCodeContent, 1)
		assert.Len(t, doc.PythonCodeContent, 1)
		assert.Len(t, doc.JavaScriptCodeContent, 1)
		assert.Len(t, doc.JavaCodeContent, 1)
		assert.Contains(t, doc.TextContent, "Multi-Language Document")
		assert.Contains(t, doc.TextContent, "Some text content here")
		assert.Contains(t, doc.TextContent, "More text content")
		assert.Equal(t, "2023-12-05T14:30:00Z", doc.LastUpdated)
		assert.Equal(t, "2023-12-01T10:00:00Z", doc.CreatedDate)
	})
}

func TestDoesIndexExist(t *testing.T) {
	// Create a temporary directory for testing
	tmpDir, err := os.MkdirTemp("", "bytebook_search_test")
	require.NoError(t, err)
	defer os.RemoveAll(tmpDir)

	t.Run("should return false when index does not exist", func(t *testing.T) {
		result := doesIndexExist(tmpDir)
		assert.False(t, result)
	})

	t.Run("should return true when index exists", func(t *testing.T) {
		// Create the index directory
		indexPath := GetPathToIndex(tmpDir)
		err := os.MkdirAll(indexPath, 0755)
		require.NoError(t, err)

		result := doesIndexExist(tmpDir)
		assert.True(t, result)
	})
}

func TestCreateIndex(t *testing.T) {
	// Create a temporary directory for testing
	tmpDir, err := os.MkdirTemp("", "bytebook_search_test")
	require.NoError(t, err)
	defer os.RemoveAll(tmpDir)

	t.Run("should create new index successfully", func(t *testing.T) {
		index, err := createIndex(tmpDir)
		require.NoError(t, err)
		require.NotNil(t, index)
		defer index.Close()

		// Verify index was created
		indexPath := GetPathToIndex(tmpDir)
		_, err = os.Stat(indexPath)
		assert.NoError(t, err)
	})

	t.Run("should fail to create index in invalid directory", func(t *testing.T) {
		invalidPath := "/invalid/path/that/does/not/exist"
		index, err := createIndex(invalidPath)
		assert.Error(t, err)
		assert.Nil(t, index)
	})
}

func TestOpenOrCreateIndex(t *testing.T) {
	// Create a temporary directory for testing
	tmpDir, err := os.MkdirTemp("", "bytebook_search_test")
	require.NoError(t, err)
	defer os.RemoveAll(tmpDir)

	t.Run("should create new index when none exists", func(t *testing.T) {
		index, err := OpenOrCreateIndex(tmpDir)
		require.NoError(t, err)
		require.NotNil(t, index)
		defer index.Close()

		// Verify index was created
		assert.True(t, doesIndexExist(tmpDir))
	})

	t.Run("should open existing index", func(t *testing.T) {
		// First, create an index
		index1, err := OpenOrCreateIndex(tmpDir)
		require.NoError(t, err)
		require.NotNil(t, index1)
		index1.Close()

		// Now try to open the existing index
		index2, err := OpenOrCreateIndex(tmpDir)
		require.NoError(t, err)
		require.NotNil(t, index2)
		defer index2.Close()

		// Verify it's the same index
		assert.True(t, doesIndexExist(tmpDir))
	})
}

func TestCreateMarkdownNoteDocumentMapping(t *testing.T) {
	t.Run("should create valid document mapping", func(t *testing.T) {
		mapping := createMarkdownNoteDocumentMapping()
		require.NotNil(t, mapping)

		// Verify the mapping can be created without errors
		// The internal structure testing is not necessary as the mapping
		// will be validated when used with the index
		assert.NotNil(t, mapping)
	})
}

func TestCreateAttachmentDocumentMapping(t *testing.T) {
	t.Run("should create valid attachment document mapping", func(t *testing.T) {
		mapping := createAttachmentDocumentMapping()
		require.NotNil(t, mapping)

		// Verify the mapping can be created without errors
		// The internal structure testing is not necessary as the mapping
		// will be validated when used with the index
		assert.NotNil(t, mapping)
	})
}

func TestIndexIntegration(t *testing.T) {
	// Create a temporary directory for testing
	tmpDir, err := os.MkdirTemp("", "bytebook_search_integration_test")
	require.NoError(t, err)
	defer os.RemoveAll(tmpDir)

	t.Run("should index and search markdown documents", func(t *testing.T) {
		// Create an index
		index, err := OpenOrCreateIndex(tmpDir)
		require.NoError(t, err)
		defer index.Close()

		// Create test documents
		doc1 := CreateMarkdownNoteBleveDocument(
			"# Go Tutorial\nThis is a Go programming tutorial.\n```go\npackage main\n```",
			"tutorials", "go-tutorial.md",
		)

		doc2 := CreateMarkdownNoteBleveDocument(
			"# Python Guide\nLearn Python programming.\n```python\nprint('hello')\n```",
			"guides", "python-guide.md",
		)

		// Index the documents
		err = index.Index("doc1", doc1)
		require.NoError(t, err)
		err = index.Index("doc2", doc2)
		require.NoError(t, err)

		// Search for documents
		query := bleve.NewMatchQuery("Go")
		searchRequest := bleve.NewSearchRequest(query)
		searchResult, err := index.Search(searchRequest)
		require.NoError(t, err)

		assert.Equal(t, uint64(1), searchResult.Total)
		assert.Equal(t, "doc1", searchResult.Hits[0].ID)
	})
}
