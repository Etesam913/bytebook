package search

import "strings"

// Operator represents the type of boolean operation between search tokens
type Operator int

const (
	OpAND Operator = iota // Default operator
	OpOR
)

// SearchToken represents a parsed search token with metadata
type SearchToken struct {
	Text     string
	IsExact  bool     // true if the token was in quotes for exact matching
	Operator Operator // The operator to use with the next token (AND/OR)
}

// appendToken adds a new token to the token list or updates the operator of the previous token.
// If the token is a boolean operator (AND/OR) and not quoted, it updates the previous token's operator.
// Otherwise, it appends a new token with the default AND operator.
// Empty strings are only allowed for quoted tokens (e.g. "").
func appendToken(tokens []SearchToken, text string, isExact bool) []SearchToken {
	// Only skip empty strings for non-quoted tokens
	if text == "" && !isExact {
		return tokens
	}

	// Only check for operators if the token is not quoted
	if !isExact {
		upperText := strings.ToUpper(text)
		if upperText == "AND" || upperText == "OR" {
			// Update the operator of the previous token if it exists
			if len(tokens) > 0 {
				if upperText == "OR" {
					tokens[len(tokens)-1].Operator = OpOR
				}
			}
			return tokens
		}
	}

	// Default operator is AND
	return append(tokens, SearchToken{
		Text:     text,
		IsExact:  isExact,
		Operator: OpAND,
	})
}

// parseTokens splits the input string into a slice of SearchToken,
// handling quoted phrases as exact matches and unquoted words as fuzzy tokens.
// Quoted phrases (enclosed in double quotes) are treated as exact matches (IsExact=true).
// Unquoted words are split by spaces and treated as non-exact (IsExact=false).
// Special characters like parentheses are preserved within tokens.
// Supports AND/OR operators between terms:
// Example: input `"foo bar" AND baz` yields: [{foo bar true AND}, {baz false AND}]
// Example: input `term1 OR term2` yields: [{term1 false OR}, {term2 false AND}]
// Example: input `func()` yields: [{func() false AND}]
func parseTokens(input string) []SearchToken {
	tokens := []SearchToken{}
	curToken := strings.Builder{}
	inQuotes := false

	for _, char := range input {
		if char == '"' {
			inQuotes = !inQuotes
			// end of quotes
			if !inQuotes {
				tokens = appendToken(tokens, curToken.String(), true)
				curToken.Reset()
			}
		} else {
			if inQuotes {
				curToken.WriteRune(char)
			} else {
				if char == ' ' {
					// Only append non-empty tokens
					tokens = appendToken(tokens, curToken.String(), false)
					curToken.Reset()
				} else {
					curToken.WriteRune(char)
				}
			}
		}
	}

	// Append the last token if not empty and not in quotes
	if curToken.Len() > 0 && !inQuotes {
		tokens = appendToken(tokens, curToken.String(), false)
	}

	return tokens
}
