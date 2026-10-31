package search

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAppendToken(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		tokens    []searchToken
		text      string
		isExact   bool
		isNegated bool
		expected  []searchToken
	}{
		{
			name:   "empty text",
			tokens: []searchToken{{Text: "existing", IsExact: false, operator: OpAND}},
			text:   "",
			expected: []searchToken{
				{Text: "existing", IsExact: false, operator: OpAND},
			},
		},
		{
			name:   "operators",
			tokens: []searchToken{{Text: "term1", IsExact: false, operator: OpAND}},
			text:   "OR",
			expected: []searchToken{
				{Text: "term1", IsExact: false, operator: OpOR},
			},
		},
		{
			name:    "quoted operators are literals",
			tokens:  []searchToken{{Text: "term1", IsExact: false, operator: OpAND}},
			text:    "OR",
			isExact: true,
			expected: []searchToken{
				{Text: "term1", IsExact: false, operator: OpAND},
				{Text: "OR", IsExact: true, operator: OpAND},
			},
		},
		{
			name:   "normal tokens",
			tokens: []searchToken{{Text: "term1", IsExact: false, operator: OpAND}},
			text:   "term2",
			expected: []searchToken{
				{Text: "term1", IsExact: false, operator: OpAND},
				{Text: "term2", IsExact: false, operator: OpAND},
			},
		},
		{
			name:      "negated token",
			tokens:    []searchToken{},
			text:      "term1",
			isNegated: true,
			expected: []searchToken{
				{Text: "term1", IsNegated: true, operator: OpAND},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := appendToken(tt.tokens, tt.text, tt.isExact, tt.isNegated)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestParseTokens(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		input    string
		expected []searchToken
	}{
		{
			name:     "empty input",
			input:    "",
			expected: []searchToken{},
		},
		{
			name:  "unquoted words",
			input: "hello world",
			expected: []searchToken{
				{Text: "hello", IsExact: false, operator: OpAND},
				{Text: "world", IsExact: false, operator: OpAND},
			},
		},
		{
			name:  "quoted text",
			input: `"hello world"`,
			expected: []searchToken{
				{Text: "hello world", IsExact: true, operator: OpAND},
			},
		},
		{
			name:  "mixed quotes and operators",
			input: `term1 OR "AND" AND term2`,
			expected: []searchToken{
				{Text: "term1", IsExact: false, operator: OpOR},
				{Text: "AND", IsExact: true, operator: OpAND},
				{Text: "term2", IsExact: false, operator: OpAND},
			},
		},
		{
			name:  "special cases",
			input: `f:readme "exact phrase" "" "unclosed quote`,
			expected: []searchToken{
				{Text: "f:readme", IsExact: false, operator: OpAND},
				{Text: "exact phrase", IsExact: true, operator: OpAND},
				{Text: "", IsExact: true, operator: OpAND},
			},
		},
		{
			name:  "negated unquoted term",
			input: `-hello world`,
			expected: []searchToken{
				{Text: "hello", IsNegated: true, operator: OpAND},
				{Text: "world", operator: OpAND},
			},
		},
		{
			name:  "negated quoted phrase",
			input: `-"exact phrase"`,
			expected: []searchToken{
				{Text: "exact phrase", IsExact: true, IsNegated: true, operator: OpAND},
			},
		},
		{
			name:  "negated filename prefix",
			input: `-f:readme`,
			expected: []searchToken{
				{Text: "f:readme", IsNegated: true, operator: OpAND},
			},
		},
		{
			name:  "negated tag prefix",
			input: `-#todo`,
			expected: []searchToken{
				{Text: "#todo", IsNegated: true, operator: OpAND},
			},
		},
		{
			name:  "negated link prefix",
			input: `-@notes.md`,
			expected: []searchToken{
				{Text: "@notes.md", IsNegated: true, operator: OpAND},
			},
		},
		{
			name:  "negated type prefix",
			input: `-t:note`,
			expected: []searchToken{
				{Text: "t:note", IsNegated: true, operator: OpAND},
			},
		},
		{
			name:  "negated lang prefix",
			input: `-l:go`,
			expected: []searchToken{
				{Text: "l:go", IsNegated: true, operator: OpAND},
			},
		},
		{
			name:  "bare dash is ignored",
			input: `- hello`,
			expected: []searchToken{
				{Text: "hello", operator: OpAND},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseTokens(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}
