package util

import (
	"os"
	"path/filepath"
)

// IsVirtualEnv checks if a directory likely represents a Python virtual environment.
// It looks for a "pyvenv.cfg" file (present in most venvs).
func IsVirtualEnv(dir string) bool {
	cfgPath := filepath.Join(dir, "pyvenv.cfg")
	if _, err := os.Stat(cfgPath); err == nil {
		return true
	}
	return false
}

// IsSupportedLanguage reports whether the given language string corresponds to a
// kernel descriptor known to the kernel_manager.
func IsSupportedLanguage(language string) bool {
	return language == "python" || language == "go" || language == "javascript" || language == "java"
}
