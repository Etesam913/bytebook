package util

import "strings"

type Set[T comparable] map[T]struct{} // Generic Set type

// Add an element to the set
func (s Set[T]) Add(value T) {
	s[value] = struct{}{}
}

// Remove an element from the set.
func (s Set[T]) Remove(value T) {
	delete(s, value)
}

// Check if an element exists in the set
func (s Set[T]) Has(value T) bool {
	_, exists := s[value]
	return exists
}

// Convert a slice to a set
func SliceToSet[T comparable](slice []T) Set[T] {
	set := make(Set[T])
	for _, value := range slice {
		set.Add(value)
	}
	return set
}

// UniqueTrimmed trims strings and removes empty values and duplicates.
// Returns values in first-occurrence order without modifying the input.
func UniqueTrimmed(values []string) []string {
	seen := make(Set[string])
	result := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" || seen.Has(trimmed) {
			continue
		}
		seen.Add(trimmed)
		result = append(result, trimmed)
	}
	return result
}
