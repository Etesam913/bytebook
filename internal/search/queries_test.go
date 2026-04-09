package search

import (
	"testing"

	"github.com/blevesearch/bleve/v2/search/query"
	"github.com/stretchr/testify/assert"
)

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
			wantLen:  1,
		},
		{
			name:     "empty before split",
			input:    "/file",
			wantType: &query.ConjunctionQuery{},
			wantLen:  1,
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
			q := CreateFilenameQuery(tt.input, 1.0)
			assert.IsType(t, tt.wantType, q)

			switch v := q.(type) {
			case *query.DisjunctionQuery:
				assert.Equal(t, tt.wantLen, len(v.Disjuncts))
			case *query.ConjunctionQuery:
				assert.Equal(t, tt.wantLen, len(v.Conjuncts))
			}
		})
	}

	t.Run("splits path on last slash so folder + filename match the same doc", func(t *testing.T) {
		q := CreateFilenameQuery("temp/joe/get", 1.0)

		conj, ok := q.(*query.ConjunctionQuery)
		assert.True(t, ok, "expected ConjunctionQuery for slash-bearing input")
		assert.Equal(t, 2, len(conj.Conjuncts))

		folderWildcard, ok := conj.Conjuncts[0].(*query.WildcardQuery)
		assert.True(t, ok)
		assert.Equal(t, FieldFolder, folderWildcard.FieldVal)
		assert.Equal(t, "*temp/joe*", folderWildcard.Wildcard)

		fileWildcard, ok := conj.Conjuncts[1].(*query.WildcardQuery)
		assert.True(t, ok)
		assert.Equal(t, FieldFileName, fileWildcard.FieldVal)
		assert.Equal(t, "*get*", fileWildcard.Wildcard)
	})
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
			name:     "empty filename prefix f: is skipped to avoid full index scan",
			input:    "f:",
			wantType: &query.MatchNoneQuery{},
		},
		{
			name:     "empty filename prefix file: is skipped to avoid full index scan",
			input:    "file:",
			wantType: &query.MatchNoneQuery{},
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
		{
			name:     "negated single term produces boolean with must-not",
			input:    "-test",
			wantType: &query.BooleanQuery{},
		},
		{
			name:     "negated filename prefix produces boolean with must-not",
			input:    "-f:readme",
			wantType: &query.BooleanQuery{},
		},
		{
			name:     "negated tag produces boolean with must-not",
			input:    "-#draft",
			wantType: &query.BooleanQuery{},
		},
		{
			name:     "positive term AND negated term",
			input:    "hello -#draft",
			wantType: &query.ConjunctionQuery{},
			wantLen:  2,
		},
		{
			name:     "negated exact phrase",
			input:    `-"exact phrase"`,
			wantType: &query.BooleanQuery{},
		},
		{
			name:     "negated type prefix",
			input:    "-t:attachment",
			wantType: &query.BooleanQuery{},
		},
		{
			name:     "negated lang prefix",
			input:    "-l:python",
			wantType: &query.BooleanQuery{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q, _ := BuildBooleanQueryFromUserInput(tt.input, 0)
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

func TestExtractTagPrefix(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		want      string
		wantFound bool
	}{
		{"hash prefix", "#mytag", "mytag", true},
		{"no prefix", "mytag", "", false},
		{"other prefix", "f:mytag", "", false},
		{"empty hash", "#", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, found := extractTagPrefix(tt.input)
			assert.Equal(t, tt.want, got)
			assert.Equal(t, tt.wantFound, found)
		})
	}
}

func TestCreateTagQuery(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		wantPattern string
	}{
		{"lowercase tag", "mytag", "(?i)mytag.*"},
		{"uppercase tag", "MYTAG", "(?i)MYTAG.*"},
		{"mixed case tag", "MyTag", "(?i)MyTag.*"},
		{"tag with spaces", "  mytag  ", "(?i)mytag.*"},
		{"uppercase with spaces", "  MYTAG  ", "(?i)MYTAG.*"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := createTagQuery(tt.input)

			// Verify it's a regexp query
			regexpQuery, ok := q.(*query.RegexpQuery)
			assert.True(t, ok, "Query should be a RegexpQuery")

			// Verify the field is set correctly
			assert.Equal(t, FieldTags, regexpQuery.FieldVal)

			// Verify the pattern has case-insensitive flag and prefix matching
			assert.Equal(t, tt.wantPattern, regexpQuery.Regexp)
		})
	}
}

func TestExtractLinkPrefix(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		want      string
		wantFound bool
	}{
		{"at prefix", "@/notes/folder/note.md", "/notes/folder/note.md", true},
		{"no prefix", "/notes/folder/note.md", "", false},
		{"other prefix", "f:/notes/folder/note.md", "", false},
		{"empty at", "@", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, found := extractLinkPrefix(tt.input)
			assert.Equal(t, tt.want, got)
			assert.Equal(t, tt.wantFound, found)
		})
	}
}

func TestCreateLinkQuery(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		wantPattern string
	}{
		{"full path", "/notes/folder/note.md", `(?i).*/notes/folder/note\.md.*`},
		{"filename only", "note.md", `(?i).*note\.md.*`},
		{"partial path", "folder/note.md", `(?i).*folder/note\.md.*`},
		{"path with spaces", "  /notes/folder  ", "(?i).*/notes/folder.*"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := createLinkQuery(tt.input)

			regexpQuery, ok := q.(*query.RegexpQuery)
			assert.True(t, ok, "Query should be a RegexpQuery")
			assert.Equal(t, FieldLinks, regexpQuery.FieldVal)
			assert.Equal(t, tt.wantPattern, regexpQuery.Regexp)
		})
	}
}

func TestExtractLangPrefix(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		want      string
		wantFound bool
	}{
		{"lang prefix", "lang:go", "go", true},
		{"l prefix", "l:python", "python", true},
		{"quoted lang", `lang:"java"`, "java", true},
		{"no prefix", "go", "", false},
		{"other prefix", "f:go", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, found := extractLangPrefix(tt.input)
			assert.Equal(t, tt.want, got)
			assert.Equal(t, tt.wantFound, found)
		})
	}
}

func TestCreateLangQuery(t *testing.T) {
	tests := []struct {
		name      string
		lang      string
		wantField string
	}{
		{"go", "go", FieldHasGoCode},
		{"golang", "golang", FieldHasGoCode},
		{"java", "java", FieldHasJavaCode},
		{"python", "python", FieldHasPythonCode},
		{"py", "py", FieldHasPythonCode},
		{"javascript", "javascript", FieldHasJavascriptCode},
		{"js", "js", FieldHasJavascriptCode},
		{"code", "code", FieldHasCode},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := createLangQuery(tt.lang)
			termQuery, ok := q.(*query.TermQuery)
			assert.True(t, ok, "Query should be a TermQuery")
			assert.Equal(t, "T", termQuery.Term)
			assert.Equal(t, tt.wantField, termQuery.FieldVal)
		})
	}

	t.Run("unknown language", func(t *testing.T) {
		q := createLangQuery("unknown")
		_, ok := q.(*query.MatchNoneQuery)
		assert.True(t, ok, "Query should be a MatchNoneQuery")
	})
}

func TestBuildBooleanQueryWithLang(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		wantType interface{}
	}{
		{
			name:     "lang query",
			input:    "lang:go",
			wantType: &query.TermQuery{},
		},
		{
			name:     "lang and text",
			input:    "lang:go AND search",
			wantType: &query.ConjunctionQuery{},
		},
		{
			name:     "lang or text",
			input:    "lang:python OR search",
			wantType: &query.DisjunctionQuery{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q, _ := BuildBooleanQueryFromUserInput(tt.input, 0)
			assert.IsType(t, tt.wantType, q)
		})
	}
}

func TestExtractSortPrefix(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		want      SearchSortOption
		wantFound bool
	}{
		{
			name:      "short prefix default desc",
			input:     "s:created",
			want:      SearchSortOption{Field: UserSortFieldCreated, Direction: SortDirectionDesc},
			wantFound: true,
		},
		{
			name:      "long prefix explicit desc",
			input:     "sort:created_desc",
			want:      SearchSortOption{Field: UserSortFieldCreated, Direction: SortDirectionDesc},
			wantFound: true,
		},
		{
			name:      "long prefix explicit asc",
			input:     "sort:size_asc",
			want:      SearchSortOption{Field: UserSortFieldSize, Direction: SortDirectionAsc},
			wantFound: true,
		},
		{
			name:      "invalid field",
			input:     "sort:name_asc",
			want:      SearchSortOption{},
			wantFound: false,
		},
		{
			name:      "no sort prefix",
			input:     "created_desc",
			want:      SearchSortOption{},
			wantFound: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, found := extractSortPrefix(tt.input)
			assert.Equal(t, tt.wantFound, found)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestBuildBooleanQueryWithSort(t *testing.T) {
	t.Run("extracts sort and keeps content query", func(t *testing.T) {
		q, sortOption := BuildBooleanQueryFromUserInput("sort:updated auth", 0)
		assert.NotNil(t, sortOption)
		assert.Equal(t, UserSortFieldUpdated, sortOption.Field)
		assert.Equal(t, SortDirectionDesc, sortOption.Direction)
		assert.IsType(t, &query.BooleanQuery{}, q)
	})

	t.Run("supports sort-only query as match all", func(t *testing.T) {
		q, sortOption := BuildBooleanQueryFromUserInput("s:created", 0)
		assert.NotNil(t, sortOption)
		assert.Equal(t, UserSortFieldCreated, sortOption.Field)
		assert.Equal(t, SortDirectionDesc, sortOption.Direction)
		assert.IsType(t, &query.MatchAllQuery{}, q)
	})
}
