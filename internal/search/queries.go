package search

import (
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/search/query"
)

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

// GroupedToken represents a group of tokens that should be combined with OR logic
type GroupedToken struct {
	Tokens   []SearchToken
	Operator Operator // The operator to use after this group
}

// groupConsecutiveFilenameTokens groups consecutive filename tokens (f: prefixed) to be combined with OR logic.
// This allows multiple f: filters to be combined automatically while maintaining AND/OR behavior with other token types.
func groupConsecutiveFilenameTokens(tokens []SearchToken) []GroupedToken {
	if len(tokens) == 0 {
		return []GroupedToken{}
	}

	var groups []GroupedToken
	var currentFilenameGroup []SearchToken

	// Helper to process accumulated filename tokens
	processFilenameGroup := func(operator Operator) {
		if len(currentFilenameGroup) == 0 {
			return
		}
		
		groups = append(groups, GroupedToken{
			Tokens:   currentFilenameGroup,
			Operator: operator,
		})
		currentFilenameGroup = []SearchToken{}
	}

	for i, token := range tokens {
		if strings.HasPrefix(token.Text, "f:") {
			// Add to current filename group
			currentFilenameGroup = append(currentFilenameGroup, token)
			
			// If this is the last token or the next token is not a filename, process the group
			if i == len(tokens)-1 || !strings.HasPrefix(tokens[i+1].Text, "f:") {
				processFilenameGroup(token.Operator)
			}
		} else {
			// Process any accumulated filename tokens first
			if len(currentFilenameGroup) > 0 {
				// Use the operator from the last filename token in the group
				lastFilenameOp := currentFilenameGroup[len(currentFilenameGroup)-1].Operator
				processFilenameGroup(lastFilenameOp)
			}
			
			// Add non-filename token as individual group
			groups = append(groups, GroupedToken{
				Tokens:   []SearchToken{token},
				Operator: token.Operator,
			})
		}
	}

	return groups
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
// Multiple consecutive f: filters are automatically combined with OR logic:
// - f:file1 f:file2 f:file3 (equivalent to f:file1 OR f:file2 OR f:file3)
// - f:file1 f:file2 AND term (equivalent to (f:file1 OR f:file2) AND term)
func BuildBooleanQueryFromUserInput(input string, fuzziness int) query.Query {
	tokens := parseTokens(input)
	if len(tokens) == 0 {
		return bleve.NewMatchNoneQuery()
	}

	// Helper to create a query for a token
	createTokenQuery := func(token SearchToken) query.Query {
		if strings.HasPrefix(token.Text, "f:") {
			prefixTerm := strings.ToLower(token.Text[2:])
			return createFilenameQuery(prefixTerm)
		} else if strings.HasPrefix(token.Text, "#") {
			tagName := token.Text[1:]
			return createTagQuery(tagName)
		} else if token.IsExact {
			return createExactContentQuery(token.Text)
		}
		return createFuzzyContentQuery(token.Text)
	}

	// Group consecutive filename tokens
	groups := groupConsecutiveFilenameTokens(tokens)
	if len(groups) == 0 {
		return bleve.NewMatchNoneQuery()
	}

	// Create query for the first group
	var currentQuery query.Query
	firstGroup := groups[0]
	
	if len(firstGroup.Tokens) == 1 {
		// Single token in group
		currentQuery = createTokenQuery(firstGroup.Tokens[0])
	} else {
		// Multiple tokens in group - combine with OR (for filename tokens)
		disjunctionQuery := bleve.NewDisjunctionQuery()
		for _, token := range firstGroup.Tokens {
			disjunctionQuery.AddQuery(createTokenQuery(token))
		}
		currentQuery = disjunctionQuery
	}

	// Process remaining groups
	for i := 1; i < len(groups); i++ {
		group := groups[i]
		var nextQuery query.Query
		
		if len(group.Tokens) == 1 {
			// Single token in group
			nextQuery = createTokenQuery(group.Tokens[0])
		} else {
			// Multiple tokens in group - combine with OR (for filename tokens)
			disjunctionQuery := bleve.NewDisjunctionQuery()
			for _, token := range group.Tokens {
				disjunctionQuery.AddQuery(createTokenQuery(token))
			}
			nextQuery = disjunctionQuery
		}

		if nextQuery == nil {
			continue
		}

		// Use the operator from the previous group to combine with the current query
		prevOp := groups[i-1].Operator
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
