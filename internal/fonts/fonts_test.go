package fonts

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNormalizeFamilies(t *testing.T) {
	t.Run("Returns sorted unique visible family names", func(t *testing.T) {
		families := []string{" Menlo ", "Arial", "menlo", "", ".Hidden", "Écriture", "Arial"}

		result := normalizeFamilies(families)

		assert.Equal(t, []string{"Arial", "Menlo", "Écriture"}, result)
	})
	t.Run("Returns an empty list when no fonts are available", func(t *testing.T) {
		result := normalizeFamilies(nil)

		assert.Equal(t, []string{}, result)
	})
}
