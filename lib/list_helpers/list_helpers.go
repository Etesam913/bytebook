package list_helpers

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
