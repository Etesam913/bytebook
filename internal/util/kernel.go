package util

import (
	"fmt"
	"net"
	"os"
	"path/filepath"
	"time"
)

// isVirtualEnv checks if a directory likely represents a Python virtual environment.
// It looks for a "pyvenv.cfg" file or a "bin/python3" executable.
// For Windows, you might also look for "Scripts/python.exe".
func IsVirtualEnv(dir string) bool {
	// Check for pyvenv.cfg file (present in most venvs)
	cfgPath := filepath.Join(dir, "pyvenv.cfg")
	if _, err := os.Stat(cfgPath); err == nil {
		return true
	}

	// Optional: Uncomment the following lines if you want to support Windows detection.
	/*
		winPythonPath := filepath.Join(dir, "Scripts", "python.exe")
		if info, err := os.Stat(winPythonPath); err == nil && !info.IsDir() {
			return true
		}
	*/

	return false
}

// isPortInUse tries to connect to the given TCP port on localhost.
// It returns true if a connection is established, meaning the port is in use.
func IsPortInUse(port int) bool {
	address := fmt.Sprintf("localhost:%d", port)
	timeout := 1 * time.Second
	conn, err := net.DialTimeout("tcp", address, timeout)
	if err != nil {
		// Connection failed, port is likely not in use.
		return false
	}
	conn.Close()
	return true
}

func IsSupportedLanguage(language string) bool {
	return language == "python" || language == "go" || language == "javascript"
}
