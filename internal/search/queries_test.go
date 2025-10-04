package search

import (
	"testing"

	"github.com/blevesearch/bleve/v2/search/query"
	"github.com/stretchr/testify/assert"
)

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
	tests := []struct {
		name     string
		input    string
		wantType interface{}
		wantLen  int
	}{
		{
			name:     "empty input",
			input:    "",
			wantType: &query.DisjunctionQuery{},
			wantLen:  2,
		},
		{
			name:     "whitespace only",
			input:    "   ",
			wantType: &query.DisjunctionQuery{},
			wantLen:  2,
		},
		{
			name:     "single term",
			input:    "test",
			wantType: &query.DisjunctionQuery{},
			wantLen:  2,
		},
		{
			name:     "folder/file path",
			input:    "folder/file",
			wantType: &query.ConjunctionQuery{},
			wantLen:  2,
		},
		{
			name:     "empty after split",
			input:    "folder/",
			wantType: &query.ConjunctionQuery{},
			wantLen:  2,
		},
		{
			name:     "empty before split",
			input:    "/file",
			wantType: &query.ConjunctionQuery{},
			wantLen:  2,
		},
		{
			name:     "multiple slashes",
			input:    "path/to/file",
			wantType: &query.ConjunctionQuery{},
			wantLen:  2,
		},
		{
			name:     "filename with apostrophe",
			input:    "etesam's",
			wantType: &query.DisjunctionQuery{},
			wantLen:  2,
		},
		{
			name:     "folder and filename with apostrophe",
			input:    "notes/etesam's",
			wantType: &query.ConjunctionQuery{},
			wantLen:  2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := createFilenameQuery(tt.input)
			assert.IsType(t, tt.wantType, q)

			switch v := q.(type) {
			case *query.DisjunctionQuery:
				assert.Equal(t, tt.wantLen, len(v.Disjuncts))
				if tt.input == "" || tt.input == "   " {
					for _, subquery := range v.Disjuncts {
						_, ok := subquery.(*query.MatchNoneQuery)
						assert.True(t, ok, "Subquery should be a MatchNoneQuery")
					}
				}
			case *query.ConjunctionQuery:
				assert.Equal(t, tt.wantLen, len(v.Conjuncts))
			}
		})
	}
}

func TestGroupConsecutiveFilenameTokens(t *testing.T) {
	tests := []struct {
		name     string
		tokens   []SearchToken
		expected []GroupedToken
	}{
		{
			name:     "empty tokens",
			tokens:   []SearchToken{},
			expected: []GroupedToken{},
		},
		{
			name: "single filename token",
			tokens: []SearchToken{
				{Text: "f:test", IsExact: false, Operator: OpAND},
			},
			expected: []GroupedToken{
				{
					Tokens:   []SearchToken{{Text: "f:test", IsExact: false, Operator: OpAND}},
					Operator: OpAND,
				},
			},
		},
		{
			name: "multiple consecutive filename tokens",
			tokens: []SearchToken{
				{Text: "f:file1", IsExact: false, Operator: OpAND},
				{Text: "f:file2", IsExact: false, Operator: OpAND},
				{Text: "f:file3", IsExact: false, Operator: OpAND},
			},
			expected: []GroupedToken{
				{
					Tokens: []SearchToken{
						{Text: "f:file1", IsExact: false, Operator: OpAND},
						{Text: "f:file2", IsExact: false, Operator: OpAND},
						{Text: "f:file3", IsExact: false, Operator: OpAND},
					},
					Operator: OpAND,
				},
			},
		},
		{
			name: "filename tokens followed by regular token",
			tokens: []SearchToken{
				{Text: "f:file1", IsExact: false, Operator: OpAND},
				{Text: "f:file2", IsExact: false, Operator: OpAND},
				{Text: "term", IsExact: false, Operator: OpAND},
			},
			expected: []GroupedToken{
				{
					Tokens: []SearchToken{
						{Text: "f:file1", IsExact: false, Operator: OpAND},
						{Text: "f:file2", IsExact: false, Operator: OpAND},
					},
					Operator: OpAND,
				},
				{
					Tokens:   []SearchToken{{Text: "term", IsExact: false, Operator: OpAND}},
					Operator: OpAND,
				},
			},
		},
		{
			name: "mixed tokens with OR operator",
			tokens: []SearchToken{
				{Text: "f:file1", IsExact: false, Operator: OpOR},
				{Text: "f:file2", IsExact: false, Operator: OpAND},
				{Text: "term", IsExact: false, Operator: OpAND},
			},
			expected: []GroupedToken{
				{
					Tokens: []SearchToken{
						{Text: "f:file1", IsExact: false, Operator: OpOR},
						{Text: "f:file2", IsExact: false, Operator: OpAND},
					},
					Operator: OpAND,
				},
				{
					Tokens:   []SearchToken{{Text: "term", IsExact: false, Operator: OpAND}},
					Operator: OpAND,
				},
			},
		},
		{
			name: "regular token followed by filename tokens",
			tokens: []SearchToken{
				{Text: "term", IsExact: false, Operator: OpAND},
				{Text: "f:file1", IsExact: false, Operator: OpAND},
				{Text: "f:file2", IsExact: false, Operator: OpAND},
			},
			expected: []GroupedToken{
				{
					Tokens:   []SearchToken{{Text: "term", IsExact: false, Operator: OpAND}},
					Operator: OpAND,
				},
				{
					Tokens: []SearchToken{
						{Text: "f:file1", IsExact: false, Operator: OpAND},
						{Text: "f:file2", IsExact: false, Operator: OpAND},
					},
					Operator: OpAND,
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := groupConsecutiveFilenameTokens(tt.tokens)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestBuildBooleanQueryFromUserInput(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		wantType interface{}
		wantLen  int
	}{
		{
			name:     "empty input",
			input:    "",
			wantType: &query.MatchNoneQuery{},
		},
		{
			name:     "single word",
			input:    "test",
			wantType: &query.BooleanQuery{},
		},
		{
			name:     "quoted phrase",
			input:    `"test phrase"`,
			wantType: &query.BooleanQuery{},
		},
		{
			name:     "filename prefix",
			input:    "f:test",
			wantType: &query.DisjunctionQuery{},
		},
		{
			name:     "AND operator",
			input:    "term1 AND term2",
			wantType: &query.ConjunctionQuery{},
			wantLen:  2,
		},
		{
			name:     "OR operator",
			input:    "term1 OR term2",
			wantType: &query.DisjunctionQuery{},
			wantLen:  2,
		},
		{
			name:     "mixed operators",
			input:    "term1 OR term2 AND term3",
			wantType: &query.ConjunctionQuery{},
			wantLen:  2,
		},
		{
			name:     "complex query",
			input:    `"exact phrase" AND f:test OR term`,
			wantType: &query.DisjunctionQuery{},
			wantLen:  2,
		},
		{
			name:     "filename with apostrophe",
			input:    `f:etesam's`,
			wantType: &query.DisjunctionQuery{},
		},
		{
			name:     "quoted filename with apostrophe",
			input:    `f:"etesam's"`,
			wantType: &query.DisjunctionQuery{},
		},
		// New tests for multiple f: filters
		{
			name:     "multiple consecutive filename filters",
			input:    "f:file1 f:file2 f:file3",
			wantType: &query.DisjunctionQuery{},
			wantLen:  3, // Should be OR'd together
		},
		{
			name:     "filename filters with regular term",
			input:    "f:file1 f:file2 AND term",
			wantType: &query.ConjunctionQuery{},
			wantLen:  2, // (f:file1 OR f:file2) AND term
		},
		{
			name:     "regular term with filename filters",
			input:    "term AND f:file1 f:file2",
			wantType: &query.ConjunctionQuery{},
			wantLen:  2, // term AND (f:file1 OR f:file2)
		},
		{
			name:     "mixed filename and regular tokens with OR",
			input:    "f:file1 f:file2 OR term1 term2",
			wantType: &query.DisjunctionQuery{},
			wantLen:  2, // (f:file1 OR f:file2) OR (term1 AND term2)
		},
		{
			name:     "complex mix with quoted text",
			input:    `f:readme f:docs AND "exact phrase" OR term`,
			wantType: &query.DisjunctionQuery{},
			wantLen:  2, // ((f:readme OR f:docs) AND "exact phrase") OR term
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := BuildBooleanQueryFromUserInput(tt.input, 0)
			assert.IsType(t, tt.wantType, q)

			switch v := q.(type) {
			case *query.DisjunctionQuery:
				if tt.wantLen > 0 {
					assert.Equal(t, tt.wantLen, len(v.Disjuncts))
				}
				// Special validation for multiple consecutive filename filters
				if tt.input == "f:file1 f:file2 f:file3" {
					assert.Equal(t, 3, len(v.Disjuncts))
				}
			case *query.ConjunctionQuery:
				if tt.wantLen > 0 {
					assert.Equal(t, tt.wantLen, len(v.Conjuncts))
					if tt.input == "term1 OR term2 AND term3" {
						disjunctionQuery, ok := v.Conjuncts[0].(*query.DisjunctionQuery)
						assert.True(t, ok, "First conjunct should be a DisjunctionQuery")
						assert.Equal(t, 2, len(disjunctionQuery.Disjuncts))
					}
					// Validate filename filters combined with regular terms
					if tt.input == "f:file1 f:file2 AND term" {
						firstConjunct, ok := v.Conjuncts[0].(*query.DisjunctionQuery)
						assert.True(t, ok, "First conjunct should be a DisjunctionQuery for filename filters")
						assert.Equal(t, 2, len(firstConjunct.Disjuncts))
					}
				}
			}
		})
	}
}
