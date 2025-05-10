package util

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// --- Tests for Set ---

func TestSet_Add(t *testing.T) {
	t.Run("int set - add new and existing", func(t *testing.T) {
		s := make(Set[int])
		assert.False(t, s.Has(1), "Set should not have 1 initially")
		assert.Len(t, s.Elements(), 0, "Set should be empty initially")

		s.Add(1)
		assert.True(t, s.Has(1), "Set should have 1 after adding")
		assert.Len(t, s.Elements(), 1, "Set should have 1 element")
		assert.ElementsMatch(t, []int{1}, s.Elements())

		s.Add(2)
		assert.True(t, s.Has(2), "Set should have 2 after adding")
		assert.Len(t, s.Elements(), 2, "Set should have 2 elements")
		assert.ElementsMatch(t, []int{1, 2}, s.Elements())

		s.Add(1) // Add existing element
		assert.True(t, s.Has(1), "Set should still have 1")
		assert.Len(t, s.Elements(), 2, "Set size should not change when adding existing element")
		assert.ElementsMatch(t, []int{1, 2}, s.Elements())
	})

	t.Run("string set - add new and existing", func(t *testing.T) {
		s := make(Set[string])
		s.Add("hello")
		assert.True(t, s.Has("hello"))
		s.Add("world")
		assert.True(t, s.Has("world"))
		assert.Len(t, s.Elements(), 2)
		assert.ElementsMatch(t, []string{"hello", "world"}, s.Elements())

		s.Add("hello")
		assert.Len(t, s.Elements(), 2)
		assert.ElementsMatch(t, []string{"hello", "world"}, s.Elements())
	})
}

func TestSet_Remove(t *testing.T) {
	t.Run("int set - remove existing and non-existing", func(t *testing.T) {
		s := make(Set[int])
		s.Add(1)
		s.Add(2)
		s.Add(3)

		assert.True(t, s.Has(2), "Set should have 2 before removal")
		s.Remove(2)
		assert.False(t, s.Has(2), "Set should not have 2 after removal")
		assert.Len(t, s.Elements(), 2, "Set size should decrease")
		assert.ElementsMatch(t, []int{1, 3}, s.Elements())

		s.Remove(1)
		assert.False(t, s.Has(1))
		assert.Len(t, s.Elements(), 1)
		assert.ElementsMatch(t, []int{3}, s.Elements())

		s.Remove(100) // Remove non-existent element
		assert.Len(t, s.Elements(), 1, "Removing non-existent element should not change size")
		assert.ElementsMatch(t, []int{3}, s.Elements())

		s.Remove(3)
		assert.False(t, s.Has(3))
		assert.Len(t, s.Elements(), 0, "Set should be empty")
		assert.Empty(t, s.Elements())
	})

	t.Run("remove from empty set", func(t *testing.T) {
		s := make(Set[string])
		s.Remove("test") // Should not panic or error
		assert.Len(t, s.Elements(), 0)
		assert.False(t, s.Has("test"))
	})
}

func TestSet_Has(t *testing.T) {
	t.Run("int set", func(t *testing.T) {
		s := make(Set[int])
		assert.False(t, s.Has(1), "Empty set should not have 1")

		s.Add(1)
		assert.True(t, s.Has(1), "Set should have 1")
		assert.False(t, s.Has(2), "Set should not have 2 yet")

		s.Add(2)
		assert.True(t, s.Has(2), "Set should have 2")
		assert.False(t, s.Has(0), "Set should not have 0")
	})

	t.Run("string set", func(t *testing.T) {
		s := make(Set[string])
		s.Add("alpha")
		assert.True(t, s.Has("alpha"))
		assert.False(t, s.Has("beta"))
		assert.False(t, s.Has(""), "Set should not have empty string unless added")

		s.Add("")
		assert.True(t, s.Has(""), "Set should have empty string after adding it")
	})
}

func TestSet_Elements(t *testing.T) {
	t.Run("empty int set", func(t *testing.T) {
		s := make(Set[int])
		elements := s.Elements()
		assert.Empty(t, elements, "Elements of an empty set should be an empty slice")
		// The implementation `make([]T, 0, len(s))` returns a non-nil empty slice.
		assert.NotNil(t, elements, "Elements should return non-nil empty slice for empty set")
	})

	t.Run("non-empty int set", func(t *testing.T) {
		s := make(Set[int])
		s.Add(1)
		s.Add(3)
		s.Add(2)
		s.Add(1) // duplicate
		expected := []int{1, 2, 3}
		actual := s.Elements()
		assert.ElementsMatch(t, expected, actual, "Elements should match expected, order independent")
		assert.Len(t, actual, 3)
	})

	t.Run("non-empty string set", func(t *testing.T) {
		s := make(Set[string])
		s.Add("c")
		s.Add("a")
		s.Add("b")
		expected := []string{"a", "b", "c"}
		actual := s.Elements()
		assert.ElementsMatch(t, expected, actual)
		assert.Len(t, actual, 3)
	})
}

// --- Tests for SliceToSet ---

func TestSliceToSet(t *testing.T) {
	type testCase[T comparable] struct {
		name                string
		slice               []T
		expectedSetElements []T // Expected elements in the set (order doesn't matter)
	}

	intTestCases := []testCase[int]{
		{
			name:                "empty int slice",
			slice:               []int{},
			expectedSetElements: []int{},
		},
		{
			name:                "int slice with unique elements",
			slice:               []int{1, 2, 3},
			expectedSetElements: []int{1, 2, 3},
		},
		{
			name:                "int slice with duplicate elements",
			slice:               []int{1, 2, 2, 3, 1, 4},
			expectedSetElements: []int{1, 2, 3, 4},
		},
		{
			name:                "int slice with all same elements",
			slice:               []int{5, 5, 5, 5},
			expectedSetElements: []int{5},
		},
		{
			name:                "nil int slice",
			slice:               nil,
			expectedSetElements: []int{},
		},
	}

	for _, tc := range intTestCases {
		t.Run(tc.name, func(t *testing.T) {
			resultSet := SliceToSet(tc.slice)
			actualElements := resultSet.Elements()
			assert.ElementsMatch(t, tc.expectedSetElements, actualElements)
			assert.Len(t, actualElements, len(tc.expectedSetElements), "Set size should match expected unique elements count")
		})
	}

	stringTestCases := []testCase[string]{
		{
			name:                "empty string slice",
			slice:               []string{},
			expectedSetElements: []string{},
		},
		{
			name:                "string slice with unique elements",
			slice:               []string{"a", "b", "c"},
			expectedSetElements: []string{"a", "b", "c"},
		},
		{
			name:                "string slice with duplicate elements",
			slice:               []string{"apple", "banana", "apple", "orange"},
			expectedSetElements: []string{"apple", "banana", "orange"},
		},
		{
			name:                "nil string slice",
			slice:               nil,
			expectedSetElements: []string{},
		},
	}

	for _, tc := range stringTestCases {
		t.Run(tc.name, func(t *testing.T) {
			resultSet := SliceToSet(tc.slice)
			actualElements := resultSet.Elements()
			assert.ElementsMatch(t, tc.expectedSetElements, actualElements)
			assert.Len(t, actualElements, len(tc.expectedSetElements))
		})
	}
}

// --- Tests for MapKeys ---

func TestMapKeys(t *testing.T) {
	t.Run("empty map", func(t *testing.T) {
		m := make(map[int]string)
		keys := MapKeys(m)
		assert.Empty(t, keys, "Keys of an empty map should be an empty slice")
		assert.NotNil(t, keys, "Keys should return non-nil empty slice for empty map")
	})

	t.Run("nil map", func(t *testing.T) {
		var m map[string]bool // m is nil
		keys := MapKeys(m)    // len(nil map) is 0, so this is safe
		assert.Empty(t, keys, "Keys of a nil map should be an empty slice")
		assert.NotNil(t, keys, "Keys should return non-nil empty slice for nil map")
	})

	t.Run("map int to string", func(t *testing.T) {
		m := map[int]string{
			1: "one",
			2: "two",
			3: "three",
		}
		expectedKeys := []int{1, 2, 3}
		actualKeys := MapKeys(m)
		assert.ElementsMatch(t, expectedKeys, actualKeys)
		assert.Len(t, actualKeys, len(expectedKeys))
	})

	t.Run("map string to bool", func(t *testing.T) {
		m := map[string]bool{
			"active":   true,
			"inactive": false,
			"pending":  true,
			"archived": false,
		}
		expectedKeys := []string{"active", "inactive", "pending", "archived"}
		actualKeys := MapKeys(m)
		assert.ElementsMatch(t, expectedKeys, actualKeys)
		assert.Len(t, actualKeys, len(expectedKeys))
	})

	t.Run("map with one element", func(t *testing.T) {
		m := map[string]int{"onlyKey": 42}
		expectedKeys := []string{"onlyKey"}
		actualKeys := MapKeys(m)
		assert.ElementsMatch(t, expectedKeys, actualKeys)
		assert.Len(t, actualKeys, 1)
	})

	type customStruct struct {
		ID int
	}
	t.Run("map with struct keys", func(t *testing.T) {
		m := map[customStruct]string{
			{ID: 1}: "first",
			{ID: 2}: "second",
		}
		expectedKeys := []customStruct{{ID: 1}, {ID: 2}}
		actualKeys := MapKeys(m)
		assert.ElementsMatch(t, expectedKeys, actualKeys)
		assert.Len(t, actualKeys, len(expectedKeys))
	})
}
