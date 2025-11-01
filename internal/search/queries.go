package search

import (
	"fmt"
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

// createPrefixQuery returns a case-insensitive prefix query targeting the specified field.
// The provided prefix is lowercased to ensure case-insensitive behavior.
func createPrefixQuery(field, prefix string) query.Query {
	normalizedPrefix := strings.ToLower(prefix)
	q := bleve.NewPrefixQuery(normalizedPrefix)
	q.SetField(field)
	return q
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

// buildMatchPhrasePrefixQuery creates a query that matches phrases with the last word as a prefix.
// If only one word is provided, it returns a simple prefix query.
// For multiple words, it creates a disjunction query that matches either:
// 1. The entire phrase exactly, or
// 2. A conjunction of the phrase (all but last word) AND the last word as a prefix
func buildMatchPhrasePrefixQuery(q, field string) query.Query {
	words := strings.Fields(q)
	// Handle empty input
	if len(words) == 0 {
		return bleve.NewMatchNoneQuery()
	}

	// If only one word, use a prefix query
	if len(words) == 1 {
		prefixQuery := bleve.NewPrefixQuery(q)
		prefixQuery.SetField(field)
		return prefixQuery
	}

	// Create a MatchPhraseQuery for all but the last word
	phrasePart := strings.Join(words[:len(words)-1], " ")

	phraseQuery := bleve.NewMatchPhraseQuery(phrasePart)
	phraseQuery.SetField(field)

	// Create a PrefixQuery for the last word
	prefixPart := words[len(words)-1]
	prefixQuery := bleve.NewPrefixQuery(prefixPart)
	prefixQuery.SetField(field)

	// Combine the phrase and prefix queries with a conjunction (AND)
	conjunctionQuery := bleve.NewConjunctionQuery()
	conjunctionQuery.AddQuery(phraseQuery)
	conjunctionQuery.AddQuery(prefixQuery)

	// Return a DisjunctionQuery that matches either the full phrase
	// or the phrase + prefix combo. This provides more comprehensive results.
	fullPhraseQuery := bleve.NewMatchPhraseQuery(q)
	fullPhraseQuery.SetField(field)

	disjunctionQuery := bleve.NewDisjunctionQuery()
	disjunctionQuery.AddQuery(fullPhraseQuery)  // Match the entire phrase exactly
	disjunctionQuery.AddQuery(conjunctionQuery) // Match the phrase + prefix
	return disjunctionQuery
}

// createFilenameQuery handles filename prefix queries (tokens starting with "f:" or "file:")
// Returns a query that searches for folder and/or file names based on the prefix term.
// Since filenames use a single tokenizer, we use direct prefix queries for exact matching.
func createFilenameQuery(prefixTerm string) query.Query {
	fmt.Println("prefixTerm", prefixTerm, len(strings.Split(prefixTerm, "/")))
	if strings.TrimSpace(prefixTerm) == "" {
		// If the prefix is empty, return a query for all folders.
		// This means match all documents where FieldType is FOLDER_TYPE.
		typeQuery := bleve.NewTermQuery(FOLDER_TYPE)
		typeQuery.SetField(FieldType)
		fmt.Println("typeQuery")
		return typeQuery
	}

	prefixTermSplit := strings.Split(prefixTerm, "/")
	if len(prefixTermSplit) > 1 {
		// If there is a slash act like a folder/note search, so use an AND
		folderName := prefixTermSplit[0]
		fileName := prefixTermSplit[1]

		// Create a conjunction query for both folder and filename
		conjunctionQuery := bleve.NewConjunctionQuery()
		conjunctionQuery.AddQuery(createPrefixQuery(FieldFolder, folderName))
		conjunctionQuery.AddQuery(createPrefixQuery(FieldFileName, fileName))
		return conjunctionQuery
	} else {
		// Otherwise just search through both folder and note using an OR
		disjunctionQuery := bleve.NewDisjunctionQuery()

		fieldFolderQuery := createPrefixQuery(FieldFolder, prefixTerm)
		// Use direct prefix query for filename since it uses single tokenizer
		fileNameQuery := createPrefixQuery(FieldFileName, prefixTerm)

		disjunctionQuery.AddQuery(fieldFolderQuery)
		disjunctionQuery.AddQuery(fileNameQuery)

		return disjunctionQuery
	}
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

	// contentQuery.AddShould(createMatchQuery(FieldCodeContent, text))
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

// extractTagPrefix extracts the tag prefix from tokens starting with "#" or "tag:".
func extractTagPrefix(text string) (string, bool) {
	// "#" is not a word prefix, so do not trim quotes from the value to maintain old behavior
	if strings.HasPrefix(text, "#") {
		return text[1:], true
	}
	return "", false
}

// createTagQuery handles tag queries (tokens starting with "#" or "tag:")
// Returns a query that searches for exact matches in the tags field.
func createTagQuery(tagName string) query.Query {
	q := bleve.NewPrefixQuery(tagName)
	q.SetField(FieldTags)
	return q
}

// createTypeQuery handles type queries (tokens starting with "t:" or "type:")
// Returns a query that filters by document type: "note", "attachment", or "folder".
func createTypeQuery(typeName string) query.Query {
	typeName = strings.ToLower(strings.TrimSpace(typeName))
	typeQuery := bleve.NewTermQuery(typeName)
	typeQuery.SetField(FieldType)

	return typeQuery
}

// BuildBooleanQueryFromUserInput builds a boolean query from a user input string.
// Tokens prefixed with "f:" or "file:" are treated as filename prefixes;
// tokens prefixed with "#" or "tag:" are treated as tag searches;
// tokens prefixed with "t:" or "type:" are treated as type filters ("note", "attachment", "folder");
// tokens with quotes are exact matches; all others query text content and code content with fuzzy matching.
// Supports AND/OR operators between terms:
// - term1 AND term2 (default if no operator specified)
// - term1 OR term2
// - "exact phrase" AND term
// - f:filename OR file:filename OR term
// - #tagname OR tag:tagname AND term
// - t:note OR type:note AND term
func BuildBooleanQueryFromUserInput(input string, fuzziness int) query.Query {
	// Normalize curly/smart quotes so parsing and matching are consistent
	input = normalizeQuotes(input)
	tokens := parseTokens(input)
	if len(tokens) == 0 {
		return bleve.NewMatchNoneQuery()
	}

	// Helper to create a query for a token
	createTokenQuery := func(token SearchToken) query.Query {
		// Check for filename prefix (f: or file:)
		if prefixTerm, ok := extractFilenamePrefix(token.Text); ok {
			prefixTerm = strings.ToLower(prefixTerm)
			return createFilenameQuery(prefixTerm)
		}

		// Check for type prefix (t: or type:)
		if typeName, ok := extractTypePrefix(token.Text); ok {
			return createTypeQuery(typeName)
		}

		// Check for tag prefix (# or tag:)
		if tagName, ok := extractTagPrefix(token.Text); ok {
			return createTagQuery(tagName)
		}

		// Handle exact matches (quoted tokens)
		if token.IsExact {
			return createExactContentQuery(token.Text)
		}

		// Default: fuzzy content query
		return createFuzzyContentQuery(token.Text)
	}

	// The first token does not have a prevOp, no OR or AND
	currentQuery := createTokenQuery(tokens[0])

	for i := 1; i < len(tokens); i++ {
		nextQuery := createTokenQuery(tokens[i])
		if nextQuery == nil {
			continue
		}

		prevOp := tokens[i-1].Operator
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

	return currentQuery
}
