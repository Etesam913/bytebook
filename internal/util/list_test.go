package util

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// --- Tests for Filter ---
func TestFilter(t *testing.T) {
	isEven := func(n int) bool {
		return n%2 == 0
	}
	startsWithA := func(s string) bool {
		return len(s) > 0 && s[0] == 'a'
	}

	type testCase[T any] struct {
		name      string
		slice     []T
		condition func(T) bool
		expected  []T
	}

	// Test cases for int
	intTestCases := []testCase[int]{
		{
			name:      "empty slice int",
			slice:     []int{},
			condition: isEven,
			expected:  []int{},
		},
		{
			name:      "no elements match int",
			slice:     []int{1, 3, 5},
			condition: isEven,
			expected:  []int{},
		},
		{
			name:      "all elements match int",
			slice:     []int{2, 4, 6},
			condition: isEven,
			expected:  []int{2, 4, 6},
		},
		{
			name:      "some elements match int",
			slice:     []int{1, 2, 3, 4, 5, 6},
			condition: isEven,
			expected:  []int{2, 4, 6},
		},
		{
			name:      "single element match int",
			slice:     []int{2},
			condition: isEven,
			expected:  []int{2},
		},
		{
			name:      "single element no match int",
			slice:     []int{1},
			condition: isEven,
			expected:  []int{},
		},
	}

	for _, tc := range intTestCases {
		t.Run(tc.name, func(t *testing.T) {
			result := Filter(tc.slice, tc.condition)
			assert.Equal(t, tc.expected, result)
		})
	}

	// Test cases for string
	stringTestCases := []testCase[string]{
		{
			name:      "empty slice string",
			slice:     []string{},
			condition: startsWithA,
			expected:  []string{},
		},
		{
			name:      "no elements match string",
			slice:     []string{"banana", "orange", "grape"},
			condition: startsWithA,
			expected:  []string{},
		},
		{
			name:      "all elements match string",
			slice:     []string{"apple", "apricot", "avocado"},
			condition: startsWithA,
			expected:  []string{"apple", "apricot", "avocado"},
		},
		{
			name:      "some elements match string",
			slice:     []string{"apple", "banana", "apricot", "orange"},
			condition: startsWithA,
			expected:  []string{"apple", "apricot"},
		},
	}

	for _, tc := range stringTestCases {
		t.Run(tc.name, func(t *testing.T) {
			result := Filter(tc.slice, tc.condition)
			assert.Equal(t, tc.expected, result)
		})
	}
}

