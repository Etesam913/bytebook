package search

import (
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/search"
	"github.com/stretchr/testify/assert"
)

func TestProcessDocumentSearchResults(t *testing.T) {

	t.Run("should return empty slice for nil search result", func(t *testing.T) {
		results := ProcessDocumentSearchResults(nil)
		assert.Empty(t, results)
	})

	t.Run("should return empty slice for search result with no hits", func(t *testing.T) {
		searchResult := &bleve.SearchResult{
			Hits: []*search.DocumentMatch{},
		}
		results := ProcessDocumentSearchResults(searchResult)
		assert.Empty(t, results)
	})

	t.Run("should process multiple search results correctly", func(t *testing.T) {
		searchResult := &bleve.SearchResult{
			Hits: []*search.DocumentMatch{
				{
					Fields: map[string]interface{}{
						"type":      MARKDOWN_NOTE_TYPE,
						"folder":    "folder1",
						"file_name": "doc1",
					},
					Fragments: map[string][]string{
						"text_content": {"This contains <mark>search term</mark>."},
					},
				},
				{
					Fields: map[string]interface{}{
						"type":         MARKDOWN_NOTE_TYPE,
						"folder":       "folder2",
						"file_name":    "doc2",
						"last_updated": "2023-12-02T15:45:00Z",
						"created_date": "2023-11-02T15:45:00Z",
					},
					Fragments: map[string][]string{
						"text_content": {"This also contains <mark>search term</mark>."},
					},
				},
			},
		}

		results := ProcessDocumentSearchResults(searchResult)

		assert.Len(t, results, 2)

		// Verify first result
		expectedFirst := SearchResult{
			Type:        MARKDOWN_NOTE_TYPE,
			Title:       "doc1",
			Folder:      "folder1",
			Note:        "doc1",
			LastUpdated: "",
			Highlights:  []HighlightResult{{Content: "This contains <mark>search term</mark>.", IsCode: false, HighlightedTerm: "search term"}},
			CodeContent: []string{},
		}
		assert.Equal(t, expectedFirst, results[0])

		// Verify second result
		expectedSecond := SearchResult{
			Type:        MARKDOWN_NOTE_TYPE,
			Title:       "doc2",
			Folder:      "folder2",
			Note:        "doc2",
			LastUpdated: "2023-12-02T15:45:00Z",
			Created:     "2023-11-02T15:45:00Z",
			Highlights:  []HighlightResult{{Content: "This also contains <mark>search term</mark>.", IsCode: false, HighlightedTerm: "search term"}},
			CodeContent: []string{},
		}
		assert.Equal(t, expectedSecond, results[1])
	})

	t.Run("should handle missing fields gracefully", func(t *testing.T) {
		// Create a mock search result with missing fields
		searchResult := &bleve.SearchResult{
			Hits: []*search.DocumentMatch{
				{
					Fields: map[string]interface{}{
						"folder": "test-folder",
						// Missing file_name field
					},
				},
				{
					Fields: map[string]interface{}{
						// Missing folder field
						"file_name": "test.md",
					},
				},
				{
					Fields: map[string]interface{}{
						"type":      MARKDOWN_NOTE_TYPE,
						"folder":    "valid-folder",
						"file_name": "valid-file.md",
					},
				},
			},
		}

		results := ProcessDocumentSearchResults(searchResult)

		// Should only return the valid result (third one)
		assert.Len(t, results, 1)
		assert.Equal(t, "valid-file.md", results[0].Title)
		assert.Equal(t, "valid-folder", results[0].Folder)
		assert.Equal(t, "valid-file.md", results[0].Note)
	})

	t.Run("should extract highlights correctly", func(t *testing.T) {
		searchResult := &bleve.SearchResult{
			Hits: []*search.DocumentMatch{
				{
					Fields: map[string]interface{}{
						"type":      MARKDOWN_NOTE_TYPE,
						"folder":    "highlight-test",
						"file_name": "highlight",
					},
					Fragments: map[string][]string{
						"text_content": {
							"This document contains multiple instances of the word <mark>testing</mark>.",
							"More <mark>testing</mark> content here for better highlighting.",
						},
					},
				},
			},
		}

		results := ProcessDocumentSearchResults(searchResult)

		assert.Len(t, results, 1)
		result := results[0]
		assert.Len(t, result.Highlights, 2)

		// Verify highlights contain expected content
		assert.Contains(t, result.Highlights[0].Content, "<mark>testing</mark>")
		assert.Contains(t, result.Highlights[1].Content, "<mark>testing</mark>")
		assert.Contains(t, result.Highlights[0].Content, "multiple instances")
		assert.Contains(t, result.Highlights[1].Content, "better highlighting")
		// Verify these are text highlights, not code
		assert.False(t, result.Highlights[0].IsCode)
		assert.False(t, result.Highlights[1].IsCode)
	})

	t.Run("should handle search result with no highlights", func(t *testing.T) {
		// Create mock search result without fragments
		searchResult := &bleve.SearchResult{
			Hits: []*search.DocumentMatch{
				{
					Fields: map[string]interface{}{
						"type":      MARKDOWN_NOTE_TYPE,
						"folder":    "test",
						"file_name": "file.md",
					},
					Fragments: nil, // No highlights
				},
			},
		}

		results := ProcessDocumentSearchResults(searchResult)

		assert.Len(t, results, 1)
		assert.Empty(t, results[0].Highlights)
	})

	t.Run("should distinguish between text and code highlights", func(t *testing.T) {
		searchResult := &bleve.SearchResult{
			Hits: []*search.DocumentMatch{
				{
					Fields: map[string]interface{}{
						"type":      MARKDOWN_NOTE_TYPE,
						"folder":    "mixed-content",
						"file_name": "example",
					},
					Fragments: map[string][]string{
						"text_content": {
							"This is normal text with <mark>search</mark> term.",
						},
						"code_content": {
							"function <mark>search</mark>() { return true; }",
						},
					},
				},
			},
		}

		results := ProcessDocumentSearchResults(searchResult)

		assert.Len(t, results, 1)
		result := results[0]
		assert.Len(t, result.Highlights, 2)

		// Find text and code highlights
		var textHighlight, codeHighlight *HighlightResult
		for i := range result.Highlights {
			if result.Highlights[i].IsCode {
				codeHighlight = &result.Highlights[i]
			} else {
				textHighlight = &result.Highlights[i]
			}
		}

		// Verify we have both types
		assert.NotNil(t, textHighlight)
		assert.NotNil(t, codeHighlight)

		// Verify content and flags
		assert.Contains(t, textHighlight.Content, "normal text")
		assert.False(t, textHighlight.IsCode)

		assert.Contains(t, codeHighlight.Content, "function")
		assert.True(t, codeHighlight.IsCode)
	})
}

func TestHasHighlightContent(t *testing.T) {
	testCases := []struct {
		name     string
		fragment string
		expected bool
	}{
		{
			name:     "should return true for fragment with mark tag",
			fragment: "This contains <mark>highlighted</mark> content.",
			expected: true,
		},
		{
			name:     "should return true for fragment with em tag",
			fragment: "This contains <em>emphasized</em> content.",
			expected: true,
		},
		{
			name:     "should return false for fragment without highlight tags",
			fragment: "This is plain text without any highlighting.",
			expected: false,
		},
		{
			name:     "should return false for fragment with other HTML tags",
			fragment: "This has <strong>bold</strong> and <span>span</span> tags.",
			expected: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := hasHighlightContent(tc.fragment)
			assert.Equal(t, tc.expected, result)
		})
	}
}

func TestExtractHighlightedText(t *testing.T) {
	testCases := []struct {
		name     string
		fragment string
		expected string
	}{
		{
			name:     "extracts from single mark or em tag",
			fragment: "Text with <mark>highlighted</mark> content and <em>emphasized</em> too.",
			expected: "highlighted",
		},
		{
			name:     "extracts first tag when multiple present",
			fragment: "Multiple <em>first</em> and <mark>second</mark> highlights.",
			expected: "first",
		},
		{
			name:     "handles multi-word phrases and special characters",
			fragment: "Code: <mark>array[0].method()</mark> and more.",
			expected: "array[0].method()",
		},
		{
			name:     "returns empty for no highlights or empty tags",
			fragment: "Plain text with <strong>bold</strong> and <mark></mark>.",
			expected: "",
		},
		{
			name:     "handles empty input",
			fragment: "",
			expected: "",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := extractHighlightedText(tc.fragment)
			assert.Equal(t, tc.expected, result)
		})
	}
}
