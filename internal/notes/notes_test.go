package notes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConvertFileNameForFrontendUrl(t *testing.T) {
	tests := []struct {
		input       string
		expected    string
		expectError bool
	}{
		{"path/to/file.jpg", "path/to/file?ext=jpg", false},       // Standard case
		{"path/to/file.tar.gz", "path/to/file.tar?ext=gz", false}, // Multiple dots
		{"/file.jpg", "/file?ext=jpg", false},                     // Root-level file
		{"", "", true},                                            // Empty path should return an error
		{"path/to/file", "", true},                                // No extension should return an error
		{"path/to/.config", "", true},                             // Hidden file without extension should return an error
		{"path/to/", "", true},                                    // Invalid path (only directory, no file)
		{" ", "", true},                                           // Space-only string should return an error
		{"path/with/trailing/slash/", "", true},                   // Invalid file path
	}
	for _, test := range tests {
		t.Run(test.input, func(t *testing.T) {
			result, err := ConvertFileNameForFrontendUrl(test.input)
			if test.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, test.expected, result.URL)
			}
		})
	}
}
