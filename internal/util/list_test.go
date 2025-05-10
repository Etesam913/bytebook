package util

import (
	"fmt"
	"strings"
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

// --- Tests for RemoveDuplicates ---
func TestRemoveDuplicates(t *testing.T) {
	type testCase[T comparable] struct {
		name     string
		slice    []T
		expected []T
	}

	// Test cases for int
	intTestCases := []testCase[int]{
		{
			name:     "empty slice int",
			slice:    []int{},
			expected: []int{},
		},
		{
			name:     "no duplicates int",
			slice:    []int{1, 2, 3},
			expected: []int{1, 2, 3},
		},
		{
			name:     "all duplicates int",
			slice:    []int{1, 1, 1, 1},
			expected: []int{1},
		},
		{
			name:     "some duplicates int",
			slice:    []int{1, 2, 2, 3, 1, 4, 4, 5},
			expected: []int{1, 2, 3, 4, 5},
		},
		{
			name:     "duplicates at end int",
			slice:    []int{1, 2, 3, 3, 3},
			expected: []int{1, 2, 3},
		},
		{
			name:     "duplicates at start int",
			slice:    []int{1, 1, 1, 2, 3},
			expected: []int{1, 2, 3},
		},
		{
			name:     "single element int",
			slice:    []int{5},
			expected: []int{5},
		},
	}

	for _, tc := range intTestCases {
		t.Run(tc.name, func(t *testing.T) {
			result := RemoveDuplicates(tc.slice)
			assert.Equal(t, tc.expected, result)
		})
	}

	// Test cases for string
	stringTestCases := []testCase[string]{
		{
			name:     "empty slice string",
			slice:    []string{},
			expected: []string{},
		},
		{
			name:     "no duplicates string",
			slice:    []string{"a", "b", "c"},
			expected: []string{"a", "b", "c"},
		},
		{
			name:     "all duplicates string",
			slice:    []string{"a", "a", "a"},
			expected: []string{"a"},
		},
		{
			name:     "some duplicates string",
			slice:    []string{"apple", "banana", "apple", "orange", "banana"},
			expected: []string{"apple", "banana", "orange"},
		},
	}

	for _, tc := range stringTestCases {
		t.Run(tc.name, func(t *testing.T) {
			result := RemoveDuplicates(tc.slice)
			assert.Equal(t, tc.expected, result)
		})
	}
}

// --- Tests for Map ---
func TestMap(t *testing.T) {
	doubleInt := func(n int) int {
		return n * 2
	}
	intToString := func(n int) string {
		return fmt.Sprintf("val:%d", n)
	}
	stringLength := func(s string) int {
		return len(s)
	}
	toUpperCase := func(s string) string {
		return strings.ToUpper(s)
	}

	t.Run("int to int", func(t *testing.T) {
		slice := []int{1, 2, 3}
		expected := []int{2, 4, 6}
		result := Map(slice, doubleInt)
		assert.Equal(t, expected, result)
	})

	t.Run("empty slice int to int", func(t *testing.T) {
		slice := []int{}
		expected := []int{}
		result := Map(slice, doubleInt)
		assert.Equal(t, expected, result)
	})

	t.Run("int to string", func(t *testing.T) {
		slice := []int{10, 20}
		expected := []string{"val:10", "val:20"}
		result := Map(slice, intToString)
		assert.Equal(t, expected, result)
	})

	t.Run("empty slice int to string", func(t *testing.T) {
		slice := []int{}
		expected := []string{}
		result := Map(slice, intToString)
		assert.Equal(t, expected, result)
	})

	t.Run("string to int", func(t *testing.T) {
		slice := []string{"a", "bb", "ccc"}
		expected := []int{1, 2, 3}
		result := Map(slice, stringLength)
		assert.Equal(t, expected, result)
	})

	t.Run("string to string", func(t *testing.T) {
		slice := []string{"hello", "world"}
		expected := []string{"HELLO", "WORLD"}
		result := Map(slice, toUpperCase)
		assert.Equal(t, expected, result)
	})
}

// --- Tests for Pop ---
func TestPop(t *testing.T) {
	t.Run("pop from empty slice int", func(t *testing.T) {
		slice := []int{}
		var zeroInt int
		newSlice, elem, err := Pop(slice)

		assert.Error(t, err)
		assert.EqualError(t, err, "cannot pop from an empty slice")
		assert.Nil(t, newSlice)
		assert.Equal(t, zeroInt, elem) // Check for zero value of T
	})

	t.Run("pop from empty slice string", func(t *testing.T) {
		slice := []string{}
		var zeroString string
		newSlice, elem, err := Pop(slice)

		assert.Error(t, err)
		assert.EqualError(t, err, "cannot pop from an empty slice")
		assert.Nil(t, newSlice)
		assert.Equal(t, zeroString, elem) // Check for zero value of T
	})

	t.Run("pop from single element slice int", func(t *testing.T) {
		slice := []int{42}
		expectedSlice := []int{}
		expectedElement := 42

		newSlice, elem, err := Pop(slice)

		assert.NoError(t, err)
		assert.Equal(t, expectedSlice, newSlice)
		assert.Equal(t, expectedElement, elem)
		// Original slice should not be modified by Pop if it's passed by value,
		// but slices are reference types. The Pop function reassigns the slice variable
		// it receives, which is a copy of the slice header.
		// The test should focus on the returned slice.
		// If you want to test if the original slice in the test was modified,
		// you'd need to check `slice` itself, but Pop returns the new slice.
		// The current Pop implementation effectively returns a new slice header.
	})

	t.Run("pop from single element slice string", func(t *testing.T) {
		slice := []string{"hello"}
		expectedSlice := []string{}
		expectedElement := "hello"

		newSlice, elem, err := Pop(slice)

		assert.NoError(t, err)
		assert.Equal(t, expectedSlice, newSlice)
		assert.Equal(t, expectedElement, elem)
	})

	t.Run("pop from multi-element slice int", func(t *testing.T) {
		slice := []int{1, 2, 3, 4}
		originalSliceCopy := make([]int, len(slice)) // Make a copy to check original if needed
		copy(originalSliceCopy, slice)

		expectedSlice := []int{1, 2, 3}
		expectedElement := 4

		newSlice, elem, err := Pop(slice)

		assert.NoError(t, err)
		assert.Equal(t, expectedSlice, newSlice)
		assert.Equal(t, expectedElement, elem)
		// Check that the original slice passed to Pop was indeed modified (as expected by slice[:lastIndex])
		// This is a bit tricky because `slice = slice[:lastIndex]` inside Pop reassigns the local `slice`
		// variable. The slice passed from the test is not directly modified in a way that the test
		// variable `slice` would see a length change unless Pop returned the modified slice and we reassigned it.
		// The current Pop returns the new slice, which is correct.
		// The original slice in the test scope `slice` will still have its original length
		// because the `slice` parameter in `Pop` is a copy of the slice header.
		// `slice = slice[:lastIndex]` modifies this local copy.
		// So, we test the returned `newSlice`.
		// If Pop was `func Pop[T any](slice *[]T) (T, error)`, then the original would be modified.
		// Given the current signature, we only care about the returned slice.
		assert.Equal(t, []int{1, 2, 3, 4}, slice, "Original slice in test scope should remain unchanged by Pop's internal reassignment")
	})

	t.Run("pop from multi-element slice string", func(t *testing.T) {
		slice := []string{"a", "b", "c"}
		expectedSlice := []string{"a", "b"}
		expectedElement := "c"

		newSlice, elem, err := Pop(slice)

		assert.NoError(t, err)
		assert.Equal(t, expectedSlice, newSlice)
		assert.Equal(t, expectedElement, elem)
		assert.Equal(t, []string{"a", "b", "c"}, slice, "Original slice in test scope should remain unchanged")
	})

	// Test to ensure the original slice's capacity might change, but its length in the caller's scope doesn't
	// due to how slice re-slicing works when passed by value.
	t.Run("pop behavior with original slice reference", func(t *testing.T) {
		original := []int{10, 20, 30}
		returnedSlice, poppedElement, err := Pop(original)

		assert.NoError(t, err)
		assert.Equal(t, 30, poppedElement)
		assert.Equal(t, []int{10, 20}, returnedSlice)
		assert.Len(t, returnedSlice, 2)

		// IMPORTANT: The `original` slice variable in *this test scope* is NOT modified by Pop.
		// Pop receives a copy of the slice header. `slice = slice[:lastIndex]` inside Pop
		// modifies that local copy. The underlying array *is* shared.
		assert.Equal(t, []int{10, 20, 30}, original, "Original slice in test scope should still point to the full original data")
		assert.Len(t, original, 3, "Length of original slice in test scope should be unchanged")

		// If you were to append to `returnedSlice`, it *might* affect `original` if there's spare capacity.
		// This is standard Go slice behavior, not specific to Pop.
		// returnedSlice = append(returnedSlice, 99)
		// fmt.Println(original) // Might print [10 20 99]
		// fmt.Println(returnedSlice) // Prints [10 20 99]
	})
}
