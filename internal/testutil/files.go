// Package testutil provides filesystem fixtures shared by backend tests.
package testutil

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

// WriteFile creates parent directories and writes a fixture file.
// Returns the full path to the created file.
func WriteFile(t testing.TB, root, relativePath string, content []byte) string {
	t.Helper()
	path := filepath.Join(root, relativePath)
	require.NoError(t, os.MkdirAll(filepath.Dir(path), 0o755))
	require.NoError(t, os.WriteFile(path, content, 0o644))
	return path
}
