package search

import (
	"testing"

	"github.com/blevesearch/bleve/v2/search/query"
	"github.com/stretchr/testify/assert"
)

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

func TestCreateFilenameQuery(t *testing.T) {
	t.Run("should handle empty input and whitespace-only input", func(t *testing.T) {
		for _, input := range []string{"", "   "} {
			q := createFilenameQuery(input)
			disjunctionQuery, ok := q.(*query.DisjunctionQuery)
			assert.True(t, ok, "Query should be a DisjunctionQuery")
			assert.Equal(t, 2, len(disjunctionQuery.Disjuncts), "Should have 2 subqueries (both MatchNoneQuery)")

			// Verify both subqueries are MatchNoneQuery
			for _, subquery := range disjunctionQuery.Disjuncts {
				_, ok := subquery.(*query.MatchNoneQuery)
				assert.True(t, ok, "Subquery should be a MatchNoneQuery")
			}
		}
	})

	t.Run("should handle single term search", func(t *testing.T) {
		q := createFilenameQuery("test")

		// Should be a disjunction query (OR) for folder and filename
		disjunctionQuery, ok := q.(*query.DisjunctionQuery)
		assert.True(t, ok, "Query should be a DisjunctionQuery")
		assert.Equal(t, 2, len(disjunctionQuery.Disjuncts), "Should have 2 subqueries (folder and filename)")
	})

	t.Run("should handle folder/file path search", func(t *testing.T) {
		q := createFilenameQuery("folder/file")

		// Should be a conjunction query (AND) for folder and filename
		conjunctionQuery, ok := q.(*query.ConjunctionQuery)
		assert.True(t, ok, "Query should be a ConjunctionQuery")
		assert.Equal(t, 2, len(conjunctionQuery.Conjuncts), "Should have 2 subqueries (folder and filename)")
	})

	t.Run("should handle path with empty parts", func(t *testing.T) {
		// Test empty after split (e.g. "folder/")
		q := createFilenameQuery("folder/")
		conjunctionQuery, ok := q.(*query.ConjunctionQuery)
		assert.True(t, ok, "Query should be a ConjunctionQuery")
		assert.Equal(t, 2, len(conjunctionQuery.Conjuncts), "Should have 2 subqueries even with empty filename")

		// Test empty before split (e.g. "/file")
		q = createFilenameQuery("/file")
		conjunctionQuery, ok = q.(*query.ConjunctionQuery)
		assert.True(t, ok, "Query should be a ConjunctionQuery")
		assert.Equal(t, 2, len(conjunctionQuery.Conjuncts), "Should have 2 subqueries even with empty folder")
	})

	t.Run("should handle multiple slashes", func(t *testing.T) {
		q := createFilenameQuery("path/to/file")

		// Should still be treated as folder/file with first part as folder
		conjunctionQuery, ok := q.(*query.ConjunctionQuery)
		assert.True(t, ok, "Query should be a ConjunctionQuery")
		assert.Equal(t, 2, len(conjunctionQuery.Conjuncts), "Should have 2 subqueries")
	})
}
