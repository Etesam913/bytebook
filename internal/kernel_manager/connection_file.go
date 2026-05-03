package kernel_manager

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/config"
)

const kernelsDirName = ".kernels"

// kernelsDir returns the absolute path to the per-project kernels directory
// where per-instance connection JSON files live.
func kernelsDir(projectPath string) string {
	return filepath.Join(projectPath, "code", kernelsDirName)
}

// connectionFilePath returns the absolute path for a given kernel instance id.
func connectionFilePath(projectPath, id string) string {
	return filepath.Join(kernelsDir(projectPath), id+".json")
}

// SetupKernelsDir creates the .kernels directory if it does not exist and
// removes any leftover connection files from previous runs (which are stale
// since the in-memory manager state is gone).
func SetupKernelsDir(projectPath string) error {
	dir := kernelsDir(projectPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create kernels dir: %w", err)
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("failed to read kernels dir: %w", err)
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if err := os.Remove(filepath.Join(dir, entry.Name())); err != nil {
			return fmt.Errorf("failed to remove stale kernel file %s: %w", entry.Name(), err)
		}
	}
	return nil
}

// writeConnectionFile serializes connection info to disk at code/.kernels/<id>.json.
func writeConnectionFile(projectPath, id string, info config.KernelConnectionInfo) (string, error) {
	path := connectionFilePath(projectPath, id)
	data, err := json.MarshalIndent(info, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal connection info: %w", err)
	}
	if err := os.WriteFile(path, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write connection file: %w", err)
	}
	return path, nil
}

// removeConnectionFile deletes a per-instance connection file. Missing file is not an error.
func removeConnectionFile(path string) error {
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
