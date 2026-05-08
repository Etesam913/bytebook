package util

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestIsVirtualEnv tests the IsVirtualEnv function.
func TestIsVirtualEnv(t *testing.T) {
	t.Run("Identifies directory with pyvenv.cfg as virtual environment", func(t *testing.T) {
		// Create temp directory
		tempDir := t.TempDir()

		// Create pyvenv.cfg file in the directory
		cfgPath := filepath.Join(tempDir, "pyvenv.cfg")
		err := os.WriteFile(cfgPath, []byte("home = /usr/bin\nversion = 3.8.10"), 0644)
		assert.NoError(t, err)

		// Test if directory is identified as virtual environment
		result := IsVirtualEnv(tempDir)
		assert.True(t, result, "Directory with pyvenv.cfg should be identified as virtual environment")
	})

	t.Run("Regular directory is not identified as virtual environment", func(t *testing.T) {
		// Create temp directory without virtual env files
		tempDir := t.TempDir()

		// Test if directory is identified as virtual environment
		result := IsVirtualEnv(tempDir)
		assert.False(t, result, "Regular directory should not be identified as virtual environment")
	})
}

// TestIsSupportedLanguage tests the IsSupportedLanguage function.
func TestIsSupportedLanguage(t *testing.T) {
	t.Run("Supported languages should return true", func(t *testing.T) {
		supportedLanguages := []string{"python", "go", "javascript", "java"}
		for _, lang := range supportedLanguages {
			result := IsSupportedLanguage(lang)
			assert.True(t, result, "Language %s should be supported", lang)
		}
	})

	t.Run("Unsupported languages should return false", func(t *testing.T) {
		unsupportedLanguages := []string{"cpp", "rust", "ruby", "php", "c", "c#", ""}
		for _, lang := range unsupportedLanguages {
			result := IsSupportedLanguage(lang)
			assert.False(t, result, "Language %s should not be supported", lang)
		}
	})
}
