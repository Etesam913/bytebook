package search

import (
	"testing"

	"github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/search"
	"github.com/blevesearch/bleve/v2/search/query"
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
						"folder":    "folder1",
						"file_name": "doc1",
					},
					Fragments: map[string][]string{
						"text_content": {"This contains <mark>search term</mark>."},
					},
				},
				{
					Fields: map[string]interface{}{
						"folder":       "folder2",
						"file_name":    "doc2",
						"last_updated": "2023-12-02T15:45:00Z",
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
			Title:       "doc1",
			Folder:      "folder1",
			Note:        "doc1",
			LastUpdated: "",
			Highlights:  []HighlightResult{{Content: "This contains <mark>search term</mark>.", IsCode: false, HighlightedTerm: "search term"}},
		}
		assert.Equal(t, expectedFirst, results[0])

		// Verify second result
		expectedSecond := SearchResult{
			Title:       "doc2",
			Folder:      "folder2",
			Note:        "doc2",
			LastUpdated: "2023-12-02T15:45:00Z",
			Highlights:  []HighlightResult{{Content: "This also contains <mark>search term</mark>.", IsCode: false, HighlightedTerm: "search term"}},
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

func TestParseTokens(t *testing.T) {
	t.Run("should handle simple unquoted words", func(t *testing.T) {
		tokens := parseTokens("hello world")

		expected := []SearchToken{
			{Text: "hello", IsExact: false},
			{Text: "world", IsExact: false},
		}
		assert.Equal(t, expected, tokens)
	})

	t.Run("should handle quoted phrases", func(t *testing.T) {
		tokens := parseTokens(`"hello world"`)

		expected := []SearchToken{
			{Text: "hello world", IsExact: true},
		}
		assert.Equal(t, expected, tokens)
	})

	t.Run("should handle mixed quoted and unquoted", func(t *testing.T) {
		tokens := parseTokens(`"foo bar" baz "hello world"`)

		expected := []SearchToken{
			{Text: "foo bar", IsExact: true},
			{Text: "baz", IsExact: false},
			{Text: "hello world", IsExact: true},
		}
		assert.Equal(t, expected, tokens)
	})

	t.Run("should handle empty input", func(t *testing.T) {
		tokens := parseTokens("")
		assert.Empty(t, tokens)
	})

	t.Run("should handle only spaces", func(t *testing.T) {
		tokens := parseTokens("   ")
		assert.Empty(t, tokens)
	})

	t.Run("should handle filename prefix tokens", func(t *testing.T) {
		tokens := parseTokens(`f:readme "exact phrase" normal`)

		expected := []SearchToken{
			{Text: "f:readme", IsExact: false},
			{Text: "exact phrase", IsExact: true},
			{Text: "normal", IsExact: false},
		}
		assert.Equal(t, expected, tokens)
	})

	t.Run("should handle single quoted word", func(t *testing.T) {
		tokens := parseTokens(`"word"`)

		expected := []SearchToken{
			{Text: "word", IsExact: true},
		}
		assert.Equal(t, expected, tokens)
	})

	t.Run("should handle unclosed quotes", func(t *testing.T) {
		tokens := parseTokens(`"unclosed quote`)

		// Unclosed quotes result in empty tokens since the quote never closes
		// and the final token is still "in quotes" so it's not appended
		expected := []SearchToken{}
		assert.Equal(t, expected, tokens)
	})

	t.Run("should handle empty quotes", func(t *testing.T) {
		tokens := parseTokens(`""`)

		expected := []SearchToken{
			{Text: "", IsExact: true},
		}
		assert.Equal(t, expected, tokens)
	})

	t.Run("should handle multiple spaces between words", func(t *testing.T) {
		tokens := parseTokens("hello    world")

		expected := []SearchToken{
			{Text: "hello", IsExact: false},
			{Text: "world", IsExact: false},
		}
		assert.Equal(t, expected, tokens)
	})

	t.Run("should handle complex real-world example", func(t *testing.T) {
		tokens := parseTokens(`f:config "error handling" database authentication "user management"`)

		expected := []SearchToken{
			{Text: "f:config", IsExact: false},
			{Text: "error handling", IsExact: true},
			{Text: "database", IsExact: false},
			{Text: "authentication", IsExact: false},
			{Text: "user management", IsExact: true},
		}
		assert.Equal(t, expected, tokens)
	})

	t.Run("should handle special characters like parentheses", func(t *testing.T) {
		tokens := parseTokens(`func() "error()" test(param)`)

		expected := []SearchToken{
			{Text: "func()", IsExact: false},
			{Text: "error()", IsExact: true},
			{Text: "test(param)", IsExact: false},
		}
		assert.Equal(t, expected, tokens)
	})

	t.Run("should handle other special characters", func(t *testing.T) {
		tokens := parseTokens(`array[0] object.method() path/to/file "quoted[]brackets"`)

		expected := []SearchToken{
			{Text: "array[0]", IsExact: false},
			{Text: "object.method()", IsExact: false},
			{Text: "path/to/file", IsExact: false},
			{Text: "quoted[]brackets", IsExact: true},
		}
		assert.Equal(t, expected, tokens)
	})
}

func TestCreatePrefixQuery(t *testing.T) {
	t.Run("should create prefix query with lowercase prefix", func(t *testing.T) {
		q := createPrefixQuery("test_field", "PREFIX")

		// Verify it's a prefix query
		prefixQuery, ok := q.(*query.PrefixQuery)
		assert.True(t, ok, "Query should be a PrefixQuery")

		// Verify the field is set correctly
		assert.Equal(t, "test_field", prefixQuery.FieldVal)

		// Verify the prefix is lowercased
		assert.Equal(t, "prefix", prefixQuery.Prefix)
	})
}

func TestCreateExactQuery(t *testing.T) {
	t.Run("should create match phrase query", func(t *testing.T) {
		q := createExactQuery("test_field", "exact phrase", 1.0)

		// Verify it's a match phrase query
		phraseQuery, ok := q.(*query.MatchPhraseQuery)
		assert.True(t, ok, "Query should be a MatchPhraseQuery")

		// Verify the field is set correctly
		assert.Equal(t, "test_field", phraseQuery.FieldVal)

		// Verify the phrase is preserved (not lowercased)
		assert.Equal(t, "exact phrase", phraseQuery.MatchPhrase)
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
