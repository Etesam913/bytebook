package util

import (
	"net"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

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

func TestIsPortInUse(t *testing.T) {
	t.Run("Unused port should return false", func(t *testing.T) {
		listener, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			if strings.Contains(err.Error(), "operation not permitted") {
				t.Skip("sandbox does not allow binding test sockets")
			}
			assert.NoError(t, err, "Failed to reserve test port")
		}
		unusedPort := listener.Addr().(*net.TCPAddr).Port
		listener.Close()

		result := IsPortInUse(unusedPort)
		assert.False(t, result, "Port %d should not be in use", unusedPort)
	})

	t.Run("Used port should return true", func(t *testing.T) {
		listener, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			if strings.Contains(err.Error(), "operation not permitted") {
				t.Skip("sandbox does not allow binding test sockets")
			}
			assert.NoError(t, err, "Failed to start test server")
		}
		defer listener.Close()
		usedPort := listener.Addr().(*net.TCPAddr).Port

		// Run the test server in a goroutine
		go func() {
			conn, err := listener.Accept()
			if err == nil {
				conn.Close()
			}
		}()

		// Small delay to ensure server is ready
		time.Sleep(100 * time.Millisecond)

		// Verify the port is detected as in use
		result := IsPortInUse(usedPort)
		assert.True(t, result, "Port %d should be detected as in use", usedPort)
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
