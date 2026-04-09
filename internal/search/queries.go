package search

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/search/query"
)

// normalizeQuotes converts typographic quotes/apostrophes to ASCII equivalents
// to ensure consistent tokenization and matching regardless of user input source.
func normalizeQuotes(s string) string {
	replacer := strings.NewReplacer(
		"’", "'", // right single quotation mark → apostrophe
		"‘", "'", // left single quotation mark → apostrophe
		"“", "\"", // left double quotation mark → double quote
		"”", "\"", // right double quotation mark → double quote
	)
	return replacer.Replace(s)
}

// createExactQuery returns a phrase query for exact matching in the specified field.
func createExactQuery(field, phrase string, boost float64) query.Query {
	q := bleve.NewMatchPhraseQuery(phrase)
	q.SetField(field)
	q.SetBoost(boost)
	return q
}

// createMatchQuery returns a match query for the specified field and term.
func createMatchQuery(field, term string, boost float64) query.Query {
	q := bleve.NewMatchQuery(term)
	q.SetField(field)
	q.SetBoost(boost)
	return q
}

// CreateFilenameQuery handles filename prefix queries (tokens starting with "f:" or "file:")
// Returns a query that searches for folder and/or file names based on the prefix term.
//
// FieldFolder and FieldFileName both use a single-token analyzer, so each is stored as
// one token (folder paths preserve their slashes, e.g. "temp/joe"). Bleve wildcards match
// against a single token, so a slash-bearing term like "temp/joe/get" cannot match either
// field alone. When the term contains a "/", split on the last slash and require the
// folder portion to match FieldFolder AND the filename portion to match FieldFileName.
// Otherwise, fall back to a disjunction across the two fields.
func CreateFilenameQuery(prefixTerm string, boost float64) query.Query {
	normalized := strings.TrimSpace(prefixTerm)

	wildcard := func(field, value string) query.Query {
		pattern := "*"
		if value != "" {
			pattern = fmt.Sprintf("*%s*", value)
		}
		q := bleve.NewWildcardQuery(pattern)
		q.SetField(field)
		return q
	}

	if idx := strings.LastIndex(normalized, "/"); idx >= 0 {
		folderPart := normalized[:idx]
		filePart := normalized[idx+1:]

		conjunction := bleve.NewConjunctionQuery()
		if folderPart != "" {
			conjunction.AddQuery(wildcard(FieldFolder, folderPart))
		}
		if filePart != "" {
			conjunction.AddQuery(wildcard(FieldFileName, filePart))
		}
		conjunction.SetBoost(boost)
		return conjunction
	}

	disjunctionQuery := bleve.NewDisjunctionQuery()
	disjunctionQuery.AddQuery(wildcard(FieldFolder, normalized))
	disjunctionQuery.AddQuery(wildcard(FieldFileName, normalized))
	disjunctionQuery.SetBoost(boost)
	return disjunctionQuery
}

// createExactContentQuery handles exact phrase queries (quoted tokens)
// Returns a query that searches for exact matches in both text and code content.
func createExactContentQuery(text string) query.Query {
	contentQuery := bleve.NewBooleanQuery()
	contentQuery.AddShould(createExactQuery(FieldTextContent, text, 1.0))
	contentQuery.AddShould(createExactQuery(FieldCodeContent, text, 1.0))
	return contentQuery
}

// createFuzzyContentQuery handles fuzzy content queries (unquoted tokens)
// Returns a query that searches text content with both exact and n-gram matching,
// prioritizing exact matches with higher boost scores.
// Also includes filename search to match files by name.
func createFuzzyContentQuery(text string) query.Query {
	contentQuery := bleve.NewBooleanQuery()

	// We want exact matches to rank higher
	exactQuery := createMatchQuery(
		FieldTextContent,
		text,
		2.0,
	)
	nGramQuery := createMatchQuery(
		FieldTextContentNgram,
		text,
		1.0,
	)

	contentQuery.AddShould(exactQuery)
	contentQuery.AddShould(nGramQuery)

	// Also search file names
	filenameQuery := CreateFilenameQuery(text, 1)
	contentQuery.AddShould(filenameQuery)

	return contentQuery
}

// extractPrefix is a helper that extracts the value following one of several possible prefixes from a string.
// It returns the matched value (with an optional character set trimmed) and true if found, otherwise "" and false.
func extractPrefix(text string, prefixes []string, trimChars string) (string, bool) {
	for _, prefix := range prefixes {
		if strings.HasPrefix(text, prefix) {
			return strings.Trim(text[len(prefix):], trimChars), true
		}
	}
	return "", false
}

// extractFilenamePrefix extracts the filename prefix from tokens starting with "f:" or "file:".
func extractFilenamePrefix(text string) (string, bool) {
	return extractPrefix(text, []string{"file:", "f:"}, "\"")
}

// extractTypePrefix extracts the type prefix from tokens starting with "t:" or "type:".
func extractTypePrefix(text string) (string, bool) {
	return extractPrefix(text, []string{"type:", "t:"}, "\"")
}

// extractTagPrefix extracts the tag prefix from tokens starting with "#".
func extractTagPrefix(text string) (string, bool) {
	if strings.HasPrefix(text, "#") {
		return text[1:], true
	}
	return "", false
}

// createTagQuery handles tag queries (tokens starting with "#")
// Returns a query that searches for case-insensitive prefix matches in the tags field.
// Uses regexp with (?i) flag since tags are indexed with the keyword analyzer (no lowercasing).
func createTagQuery(tagName string) query.Query {
	normalizedTag := strings.TrimSpace(tagName)
	// Use (?i) for case-insensitive matching, .* for prefix behavior
	pattern := "(?i)" + regexp.QuoteMeta(normalizedTag) + ".*"
	q := bleve.NewRegexpQuery(pattern)
	q.SetField(FieldTags)
	return q
}

// extractLinkPrefix extracts the link prefix from tokens starting with "@".
func extractLinkPrefix(text string) (string, bool) {
	if strings.HasPrefix(text, "@") {
		return text[1:], true
	}
	return "", false
}

// createLinkQuery handles link queries (tokens starting with "@")
// Returns a query that searches for case-insensitive substring matches in the links field.
// Supports partial paths like "test.md" or "folder/test.md" matching against full paths.
func createLinkQuery(linkTarget string) query.Query {
	normalizedLink := strings.TrimSpace(linkTarget)
	pattern := "(?i).*" + regexp.QuoteMeta(normalizedLink) + ".*"
	q := bleve.NewRegexpQuery(pattern)
	q.SetField(FieldLinks)
	return q
}

// createTypeQuery handles type queries (tokens starting with "t:" or "type:")
// Returns a query that filters by document type (for example "note" or "attachment").
func createTypeQuery(typeName string) query.Query {
	typeName = strings.ToLower(strings.TrimSpace(typeName))
	switch typeName {
	case MARKDOWN_NOTE_TYPE, ATTACHMENT_TYPE:
		// supported search types
	default:
		return bleve.NewMatchNoneQuery()
	}

	typeQuery := bleve.NewTermQuery(typeName)
	typeQuery.SetField(FieldType)

	return typeQuery
}

// extractLangPrefix extracts the lang prefix from tokens starting with "l:" or "lang:".
func extractLangPrefix(text string) (string, bool) {
	return extractPrefix(text, []string{"lang:", "l:"}, "\"")
}

// extractSortPrefix extracts sort options from tokens starting with "s:" or "sort:".
// Supports fields: created, updated, size. Supports optional _asc / _desc suffix.
// If no direction suffix exists, descending is used by default.
func extractSortPrefix(text string) (SearchSortOption, bool) {
	normalizedText := strings.ToLower(strings.TrimSpace(text))
	value, ok := extractPrefix(normalizedText, []string{"sort:", "s:"}, "\"")
	if !ok {
		return SearchSortOption{}, false
	}

	value = strings.TrimSpace(value)
	if value == "" {
		return SearchSortOption{}, false
	}

	field := value
	direction := SortDirectionDesc

	lastUnderscore := strings.LastIndex(value, "_")
	if lastUnderscore > 0 && lastUnderscore < len(value)-1 {
		suffix := value[lastUnderscore+1:]
		if suffix == SortDirectionAsc || suffix == SortDirectionDesc {
			field = value[:lastUnderscore]
			direction = suffix
		}
	}

	if !isValidUserSortField(field) {
		return SearchSortOption{}, false
	}

	return SearchSortOption{
		Field:     field,
		Direction: direction,
	}, true
}

// createLangQuery handles lang queries (tokens starting with "l:" or "lang:")
// Returns a query that filters results by the presence of code in a specific language.
func createLangQuery(langName string) query.Query {
	langName = strings.ToLower(strings.TrimSpace(langName))
	var field string

	switch langName {
	case "go", "golang":
		field = FieldHasGoCode
	case "java":
		field = FieldHasJavaCode
	case "python", "py":
		field = FieldHasPythonCode
	case "javascript", "js":
		field = FieldHasJavascriptCode
	case "code":
		field = FieldHasCode
	default:
		// For unknown languages, return a none query as we don't have a field for it
		return bleve.NewMatchNoneQuery()
	}

	// We use a TermQuery for "T" because boolean fields in Bleve stored as "T" or "F" strings
	// when derived from boolean values using the default mapping or boolean field mapping.
	// Actually, standard bleve boolean field mapping indexes `T` and `F`.
	langQuery := bleve.NewTermQuery("T")
	langQuery.SetField(field)

	return langQuery
}

// BuildBooleanQueryFromUserInput builds a boolean query from a user input string.
// Tokens prefixed with "f:" or "file:" are treated as filename prefixes;
// tokens prefixed with "#" are treated as tag searches;
// tokens prefixed with "@" are treated as link searches;
// tokens prefixed with "t:" or "type:" are treated as type filters ("note", "attachment");
// tokens with quotes are exact matches; all others query text content and code content with fuzzy matching.
// Supports AND/OR operators between terms:
// - term1 AND term2 (default if no operator specified)
// - term1 OR term2
// - "exact phrase" AND term
// - f:filename OR file:filename OR term
// - #tagname AND term
// - t:note OR type:note AND term
func BuildBooleanQueryFromUserInput(input string, fuzziness int) (query.Query, *SearchSortOption) {
	// Normalize curly/smart quotes so parsing and matching are consistent
	input = normalizeQuotes(input)
	tokens := parseTokens(input)
	if len(tokens) == 0 {
		return bleve.NewMatchNoneQuery(), nil
	}

	// The sort tokens have to be filtered out as the sort value is used in a different location compared to the other properties
	filteredTokens := make([]SearchToken, 0, len(tokens))
	var sortOption *SearchSortOption
	for _, token := range tokens {
		if extractedSort, ok := extractSortPrefix(token.Text); ok {
			sortCopy := extractedSort
			sortOption = &sortCopy
			continue
		}
		filteredTokens = append(filteredTokens, token)
	}

	if len(filteredTokens) == 0 {
		if sortOption != nil {
			return bleve.NewMatchAllQuery(), sortOption
		}
		return bleve.NewMatchNoneQuery(), nil
	}

	// Helper to create a query for a token. The second return value is true when the token
	// should be skipped (e.g. empty f: prefix) and must not be added to the combined query.
	createTokenQuery := func(token SearchToken) (query.Query, bool) {
		// Check for filename prefix (f: or file:) — skip when prefix is empty to avoid full index scan
		if prefixTerm, ok := extractFilenamePrefix(token.Text); ok {
			prefixTerm = strings.TrimSpace(strings.ToLower(prefixTerm))
			if prefixTerm == "" {
				return nil, true
			}
			return CreateFilenameQuery(prefixTerm, 1.0), false
		}

		// Check for type prefix (t: or type:)
		if typeName, ok := extractTypePrefix(token.Text); ok {
			return createTypeQuery(typeName), false
		}

		// Check for tag prefix (#)
		if tagName, ok := extractTagPrefix(token.Text); ok {
			return createTagQuery(tagName), false
		}

		// Check for link prefix (@)
		if linkTarget, ok := extractLinkPrefix(token.Text); ok {
			return createLinkQuery(linkTarget), false
		}

		// Check for lang prefix (l: or lang:)
		if langName, ok := extractLangPrefix(token.Text); ok {
			return createLangQuery(langName), false
		}

		// Handle exact matches (quoted tokens)
		if token.IsExact {
			return createExactContentQuery(token.Text), false
		}

		// Default: fuzzy content query
		return createFuzzyContentQuery(token.Text), false
	}

	// Collect non-skip token queries and the operator after each (to combine with next token)
	var queries []query.Query
	var operators []Operator
	for i, token := range filteredTokens {
		q, skip := createTokenQuery(token)
		if skip {
			continue
		}
		// Wrap negated tokens: must-not the inner query, must match everything else
		if token.IsNegated {
			negatedBool := bleve.NewBooleanQuery()
			negatedBool.AddMust(bleve.NewMatchAllQuery())
			negatedBool.AddMustNot(q)
			q = negatedBool
		}
		queries = append(queries, q)
		// Operator that connects this token to the next (only needed when there is a next)
		if i+1 < len(filteredTokens) {
			operators = append(operators, token.Operator)
		}
	}

	if len(queries) == 0 {
		if sortOption != nil {
			return bleve.NewMatchAllQuery(), sortOption
		}
		return bleve.NewMatchNoneQuery(), nil
	}

	currentQuery := queries[0]
	for i := 1; i < len(queries); i++ {
		nextQuery := queries[i]
		prevOp := operators[i-1]
		switch prevOp {
		case OpOR:
			disjunctionQuery := bleve.NewDisjunctionQuery()
			disjunctionQuery.AddQuery(currentQuery)
			disjunctionQuery.AddQuery(nextQuery)
			currentQuery = disjunctionQuery
		default:
			conjunctionQuery := bleve.NewConjunctionQuery()
			conjunctionQuery.AddQuery(currentQuery)
			conjunctionQuery.AddQuery(nextQuery)
			currentQuery = conjunctionQuery
		}
	}

	return currentQuery, sortOption
}
