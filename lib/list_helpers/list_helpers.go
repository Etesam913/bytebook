package list_helpers

import "fmt"

// Filter is a generic function that filters elements of a slice based on a condition.
func Filter[T any](slice []T, condition func(T) bool) []T {
	var result []T
	for _, item := range slice {
		if condition(item) {
			result = append(result, item)
		}
	}
	return result
}

// Pop removes and returns the last element of the slice.
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
