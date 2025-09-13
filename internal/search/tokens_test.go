package search

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAppendToken(t *testing.T) {
	tests := []struct {
		name     string
		tokens   []SearchToken
		text     string
		isExact  bool
		expected []SearchToken
	}{
		{
			name:   "empty text",
			tokens: []SearchToken{{Text: "existing", IsExact: false, Operator: OpAND}},
			text:   "",
			expected: []SearchToken{
				{Text: "existing", IsExact: false, Operator: OpAND},
			},
		},
		{
			name:   "operators",
			tokens: []SearchToken{{Text: "term1", IsExact: false, Operator: OpAND}},
			text:   "OR",
			expected: []SearchToken{
				{Text: "term1", IsExact: false, Operator: OpOR},
			},
		},
		{
			name:    "quoted operators are literals",
			tokens:  []SearchToken{{Text: "term1", IsExact: false, Operator: OpAND}},
			text:    "OR",
			isExact: true,
			expected: []SearchToken{
				{Text: "term1", IsExact: false, Operator: OpAND},
				{Text: "OR", IsExact: true, Operator: OpAND},
			},
		},
		{
			name:   "normal tokens",
			tokens: []SearchToken{{Text: "term1", IsExact: false, Operator: OpAND}},
			text:   "term2",
			expected: []SearchToken{
				{Text: "term1", IsExact: false, Operator: OpAND},
				{Text: "term2", IsExact: false, Operator: OpAND},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := appendToken(tt.tokens, tt.text, tt.isExact)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestParseTokens(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected []SearchToken
	}{
		{
			name:     "empty input",
			input:    "",
			expected: []SearchToken{},
		},
		{
			name:  "unquoted words",
			input: "hello world",
			expected: []SearchToken{
				{Text: "hello", IsExact: false, Operator: OpAND},
				{Text: "world", IsExact: false, Operator: OpAND},
			},
		},
		{
			name:  "quoted text",
			input: `"hello world"`,
			expected: []SearchToken{
				{Text: "hello world", IsExact: true, Operator: OpAND},
			},
		},
		{
			name:  "mixed quotes and operators",
			input: `term1 OR "AND" AND term2`,
			expected: []SearchToken{
				{Text: "term1", IsExact: false, Operator: OpOR},
				{Text: "AND", IsExact: true, Operator: OpAND},
				{Text: "term2", IsExact: false, Operator: OpAND},
			},
		},
		{
			name:  "special cases",
			input: `f:readme "exact phrase" "" "unclosed quote`,
			expected: []SearchToken{
				{Text: "f:readme", IsExact: false, Operator: OpAND},
				{Text: "exact phrase", IsExact: true, Operator: OpAND},
				{Text: "", IsExact: true, Operator: OpAND},
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
