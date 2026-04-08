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
	Text      string
	IsExact   bool     // true if the token was in quotes for exact matching
	IsNegated bool     // true if the token was prefixed with "-" for exclusion
	Operator  Operator // The operator to use with the next token (AND/OR)
}

// appendToken adds a new token to the token list or updates the operator of the previous token.
// If the token is a boolean operator (AND/OR) and not quoted, it updates the previous token's operator.
// Otherwise, it appends a new token with the default AND operator.
// Empty strings are only allowed for quoted tokens (e.g. "").
func appendToken(tokens []SearchToken, text string, isExact bool, isNegated bool) []SearchToken {
	// Only skip empty strings for non-quoted tokens
	if text == "" && !isExact {
		return tokens
	}

	// Only check for operators if the token is not quoted
	if !isExact {
		upperText := strings.ToUpper(text)
		if upperText == "AND" || upperText == "&&" || upperText == "OR" || upperText == "||" {
			// Update the operator of the previous token if it exists
			if len(tokens) > 0 {
				if upperText == "OR" || upperText == "||" {
					tokens[len(tokens)-1].Operator = OpOR
				} else {
					tokens[len(tokens)-1].Operator = OpAND
				}
			}
			return tokens
		}
	}

	// Default operator is AND
	return append(tokens, SearchToken{
		Text:      text,
		IsExact:   isExact,
		IsNegated: isNegated,
		Operator:  OpAND,
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
	negated := false

	for _, char := range input {
		if char == '"' {
			inQuotes = !inQuotes
			// end of quotes
			if !inQuotes {
				tokens = appendToken(tokens, curToken.String(), true, negated)
				curToken.Reset()
				negated = false
			}
		} else {
			if inQuotes {
				curToken.WriteRune(char)
			} else {
				if char == ' ' {
					// Only append non-empty tokens
					tokens = appendToken(tokens, curToken.String(), false, negated)
					curToken.Reset()
					negated = false
				} else if char == '-' && curToken.Len() == 0 && !negated {
					// Leading '-' on a new token means negation
					negated = true
				} else {
					curToken.WriteRune(char)
				}
			}
		}
	}

	// Append the last token if not empty and not in quotes
	if curToken.Len() > 0 && !inQuotes {
		tokens = appendToken(tokens, curToken.String(), false, negated)
	}

	return tokens
}
