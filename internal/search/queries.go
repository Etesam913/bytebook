package search

import (
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

// createFilenameQuery handles filename prefix queries (tokens starting with "f:")
// Returns a query that searches for folder and/or file names based on the prefix term.
// Since filenames use a single tokenizer, we use direct prefix queries for exact matching.
func createFilenameQuery(prefixTerm string) query.Query {
	// Handle empty or whitespace-only input
	if strings.TrimSpace(prefixTerm) == "" {
		disjunctionQuery := bleve.NewDisjunctionQuery()
		disjunctionQuery.AddQuery(bleve.NewMatchNoneQuery())
		disjunctionQuery.AddQuery(bleve.NewMatchNoneQuery())
		return disjunctionQuery
	}

	prefixTermSplit := strings.Split(prefixTerm, "/")
	if len(prefixTermSplit) == 0 {
		// Return an empty query (nil means no query)
		return bleve.NewMatchNoneQuery()
	} else if len(prefixTermSplit) > 1 {
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

// createTagQuery handles tag queries (tokens starting with "#")
// Returns a query that searches for exact matches in the tags field.
func createTagQuery(tagName string) query.Query {
	q := bleve.NewPrefixQuery(tagName)
	q.SetField(FieldTags)
	return q
}

// BuildBooleanQueryFromUserInput builds a boolean query from a user input string.
// Tokens prefixed with "f:" are treated as filename prefixes; tokens prefixed with "#" are treated as tag searches;
// tokens with quotes are exact matches; all others query text content and code content with fuzzy matching.
// Supports AND/OR operators between terms:
// - term1 AND term2 (default if no operator specified)
// - term1 OR term2
// - "exact phrase" AND term
// - f:filename OR term
// - #tagname AND term
func BuildBooleanQueryFromUserInput(input string, fuzziness int) query.Query {
    // Normalize curly/smart quotes so parsing and matching are consistent
    input = normalizeQuotes(input)
    tokens := parseTokens(input)
	if len(tokens) == 0 {
		return bleve.NewMatchNoneQuery()
	}

	// Helper to create a query for a token
    createTokenQuery := func(token SearchToken) query.Query {
		if strings.HasPrefix(token.Text, "f:") {
            // In case quotes are still present inside the token text (edge cases), strip them
            prefixTerm := strings.Trim(token.Text[2:], "\"")
            prefixTerm = strings.ToLower(prefixTerm)
			return createFilenameQuery(prefixTerm)
		} else if strings.HasPrefix(token.Text, "#") {
			tagName := token.Text[1:]
			return createTagQuery(tagName)
		} else if token.IsExact {
			return createExactContentQuery(token.Text)
		}
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
