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
			wantType: &query.TermQuery{},
		},
		{
			name:     "whitespace only",
			input:    "   ",
			wantType: &query.TermQuery{},
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
			wantType: &query.DisjunctionQuery{},
			wantLen:  2,
		},
		{
			name:     "empty after split",
			input:    "folder/",
			wantType: &query.DisjunctionQuery{},
			wantLen:  2,
		},
		{
			name:     "empty before split",
			input:    "/file",
			wantType: &query.DisjunctionQuery{},
			wantLen:  2,
		},
		{
			name:     "multiple slashes",
			input:    "path/to/file",
			wantType: &query.DisjunctionQuery{},
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
			wantType: &query.DisjunctionQuery{},
			wantLen:  2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := CreateFilenameQuery(tt.input)
			assert.IsType(t, tt.wantType, q)

			switch v := q.(type) {
			case *query.TermQuery:
				// For empty/whitespace input, verify it's a TermQuery for folder type
				assert.Equal(t, FieldType, v.FieldVal)
				assert.Equal(t, FOLDER_TYPE, v.Term)
			case *query.DisjunctionQuery:
				assert.Equal(t, tt.wantLen, len(v.Disjuncts))
			case *query.ConjunctionQuery:
				assert.Equal(t, tt.wantLen, len(v.Conjuncts))
			}
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
		{
			name:     "quoted filename with curly apostrophe",
			input:    "f:\"etesam’s\"",
			wantType: &query.DisjunctionQuery{},
		},
		{
			name:     "quoted filename with curly double quotes",
			input:    "f:“etesam's”",
			wantType: &query.DisjunctionQuery{},
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
			case *query.ConjunctionQuery:
				if tt.wantLen > 0 {
					assert.Equal(t, tt.wantLen, len(v.Conjuncts))
					if tt.input == "term1 OR term2 AND term3" {
						disjunctionQuery, ok := v.Conjuncts[0].(*query.DisjunctionQuery)
						assert.True(t, ok, "First conjunct should be a DisjunctionQuery")
						assert.Equal(t, 2, len(disjunctionQuery.Disjuncts))
					}
				}
			}
		})
	}
}
