package fonts

import (
	"fmt"
	"slices"
	"strings"
)

// Families returns the sorted, distinct font families available on this computer.
func Families() ([]string, error) {
	families, err := systemFamilies()
	if err != nil {
		return nil, fmt.Errorf("list system font families: %w", err)
	}
	return normalizeFamilies(families), nil
}

func normalizeFamilies(families []string) []string {
	result := make([]string, 0, len(families))
	seen := make(map[string]bool)
	for _, family := range families {
		family = strings.TrimSpace(family)
		key := strings.ToLower(family)
		if family == "" || strings.HasPrefix(family, ".") || seen[key] {
			continue
		}
		seen[key] = true
		result = append(result, family)
	}
	slices.SortFunc(result, func(a, b string) int {
		return strings.Compare(strings.ToLower(a), strings.ToLower(b))
	})
	return result
}
