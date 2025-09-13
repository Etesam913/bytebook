package search

import (
	"log"
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

// SearchToken represents a parsed search token with metadata
type SearchToken struct {
	Text    string
	IsExact bool // true if the token was in quotes for exact matching
}

// parseTokens splits the input string into a slice of SearchToken,
// handling quoted phrases as exact matches and unquoted words as fuzzy tokens.
// Quoted phrases (enclosed in double quotes) are treated as exact matches (IsExact=true).
// Unquoted words are split by spaces and treated as non-exact (IsExact=false).
// Special characters like parentheses are preserved within tokens.
// Example: input `"foo bar" baz` yields tokens: [{foo bar true}, {baz false}]
// Example: input `func()` yields tokens: [{func() false}]
func parseTokens(input string) []SearchToken {
	tokens := []SearchToken{}
	curToken := strings.Builder{}
	inQuotes := false
	for _, char := range input {
		if char == '"' {
			inQuotes = !inQuotes
			// end of quotes
			if !inQuotes {
				tokens = append(tokens, SearchToken{
					Text:    curToken.String(),
					IsExact: true,
				})
				curToken.Reset()
			}
		} else {
			if inQuotes {
				curToken.WriteRune(char)
			} else {
				if char == ' ' {
					// Only append non-empty tokens
					if curToken.Len() > 0 {
						tokens = append(tokens, SearchToken{
							Text:    curToken.String(),
							IsExact: false,
						})
						curToken.Reset()
					}
				} else {
					curToken.WriteRune(char)
				}
			}
		}
	}
	// Append the last token if not empty and not in quotes
	if curToken.Len() > 0 && !inQuotes {
		tokens = append(tokens, SearchToken{
			Text:    curToken.String(),
			IsExact: false,
		})
	}
	return tokens
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
func createFilenameQuery(prefixTerm string) query.Query {
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
		conjunctionQuery.AddQuery(buildMatchPhrasePrefixQuery(folderName, FieldFolder))
		conjunctionQuery.AddQuery(buildMatchPhrasePrefixQuery(fileName, FieldFileNameLC))
		return conjunctionQuery
	} else {
		// Otherwise just search through both folder and note using an OR
		disjunctionQuery := bleve.NewDisjunctionQuery()

		fieldFolderQuery := buildMatchPhrasePrefixQuery(prefixTerm, FieldFolder)
		fileNameQuery := buildMatchPhrasePrefixQuery(prefixTerm, FieldFileNameLC)

		disjunctionQuery.AddQuery(fieldFolderQuery)
		disjunctionQuery.AddQuery(fileNameQuery)

		// If no valid queries were added, return nil to indicate no search should be performed
		if len(disjunctionQuery.Disjuncts) == 0 {
			return nil
		}

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

// BuildBooleanQueryFromUserInput builds a boolean query from a user input string.
// Tokens prefixed with "f:" are treated as filename prefixes; tokens with quotes are exact matches;
// all others query text content and code content with fuzzy matching.
func BuildBooleanQueryFromUserInput(input string, fuzziness int) query.Query {
	booleanQuery := bleve.NewBooleanQuery()
	tokens := parseTokens(input)

	for _, token := range tokens {
		var tokenQuery query.Query
		log.Println("token", token)

		if strings.HasPrefix(token.Text, "f:") {
			// Filename prefix query
			prefixTerm := strings.ToLower(token.Text[2:])
			tokenQuery = createFilenameQuery(prefixTerm)
		} else if token.IsExact {
			// Exact phrase search in both text and code content
			tokenQuery = createExactContentQuery(token.Text)
		} else {
			// Fuzzy content search with exact and n-gram matching
			tokenQuery = createFuzzyContentQuery(token.Text)
		}
		if tokenQuery != nil {
			booleanQuery.AddMust(tokenQuery)
		}
	}
	return booleanQuery
}
