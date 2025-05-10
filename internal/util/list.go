package util

import "fmt"

// Filter is a generic function that filters elements of a slice based on a condition.
func Filter[T any](slice []T, condition func(T) bool) []T {
	// Initialize result as an empty, non-nil slice.
	result := make([]T, 0) // Or: result := []T{}
	for _, item := range slice {
		if condition(item) {
			result = append(result, item)
		}
	}
	return result
}

// RemoveDuplicates removes duplicate elements from a slice while maintaining order.
func RemoveDuplicates[T comparable](slice []T) []T {
	seen := make(map[T]bool)
	// Initialize result as an empty, non-nil slice.
	result := make([]T, 0) // Or: result := []T{}

	// Optimization: If the input slice is known to be empty,
	// this loop won't run, and the initialized empty 'result' will be returned.
	for _, item := range slice {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}
	return result
}

// Map applies the function fn to each element in the slice and returns a new slice of type U.
// This function was already correct as make([]U, len(slice)) handles the empty case properly.
func Map[T any, U any](slice []T, fn func(T) U) []U {
	result := make([]U, len(slice))
	for i, v := range slice {
		result[i] = fn(v)
	}
	return result
}

// Pop removes and returns the last element of the slice.
// This function was also correct regarding its return values for the empty case.
func Pop[T any](slice []T) ([]T, T, error) {
	if len(slice) == 0 {
		var zeroValue T
		return nil, zeroValue, fmt.Errorf("cannot pop from an empty slice")
	}
	lastIndex := len(slice) - 1
	element := slice[lastIndex]
	slice = slice[:lastIndex]
	return slice, element, nil
}
