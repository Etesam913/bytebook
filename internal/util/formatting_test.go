package util

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFormatStringListForErrorMessage(t *testing.T) {
	t.Run("List within capacity", func(t *testing.T) {
		stringList := []string{"error1", "error2", "error3"}
		capacity := 5

		result := FormatStringListForErrorMessage(stringList, capacity)
		expected := "error1, error2, error3"

		assert.Equal(t, expected, result)
	})

	t.Run("List exceeds capacity", func(t *testing.T) {
		stringList := []string{"error1", "error2", "error3", "error4", "error5"}
		capacity := 2

		result := FormatStringListForErrorMessage(stringList, capacity)
		expected := "error1, error2etc..."

		assert.Equal(t, expected, result)
	})

	t.Run("Empty list", func(t *testing.T) {
		stringList := []string{}
		capacity := 3

		result := FormatStringListForErrorMessage(stringList, capacity)
		expected := ""

		assert.Equal(t, expected, result)
	})

	t.Run("Single item list within capacity", func(t *testing.T) {
		stringList := []string{"single_error"}
		capacity := 3

		result := FormatStringListForErrorMessage(stringList, capacity)
		expected := "single_error"

		assert.Equal(t, expected, result)
	})

	t.Run("List exactly at capacity", func(t *testing.T) {
		stringList := []string{"error1", "error2", "error3"}
		capacity := 3

		result := FormatStringListForErrorMessage(stringList, capacity)
		expected := "error1, error2, error3"

		assert.Equal(t, expected, result)
	})

	t.Run("List has one more item than capacity", func(t *testing.T) {
		stringList := []string{"error1", "error2", "error3", "error4"}
		capacity := 3

		result := FormatStringListForErrorMessage(stringList, capacity)
		expected := "error1, error2, error3etc..."

		assert.Equal(t, expected, result)
	})

	t.Run("Negative capacity", func(t *testing.T) {
		stringList := []string{"error1", "error2"}
		capacity := -1

		result := FormatStringListForErrorMessage(stringList, capacity)
		expected := "error1etc..."

		assert.Equal(t, expected, result)
	})

	t.Run("Capacity is zero", func(t *testing.T) {
		stringList := []string{"error1", "error2"}
		capacity := 0

		result := FormatStringListForErrorMessage(stringList, capacity)
		expected := "error1etc..."

		assert.Equal(t, expected, result)
	})
}
