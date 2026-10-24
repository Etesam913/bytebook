//go:build !darwin

package trash

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

func moveToTrash(src, homeDir string) (string, error) {
	dataHome := os.Getenv("XDG_DATA_HOME")
	if dataHome == "" {
		dataHome = filepath.Join(homeDir, ".local", "share")
	}
	trashBase := filepath.Join(dataHome, "Trash")
	filesDir := filepath.Join(trashBase, "files")
	infoDir := filepath.Join(trashBase, "info")
	for _, dir := range []string{filesDir, infoDir} {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return "", fmt.Errorf("could not create trash directory %s: %w", dir, err)
		}
	}
	dest, err := uniqueTrashName(filesDir, src)
	if err != nil {
		return "", err
	}
	if err := os.Rename(src, dest); err != nil {
		return "", fmt.Errorf("could not move file to trash: %w", err)
	}
	infoPath := filepath.Join(infoDir, filepath.Base(dest)+".trashinfo")
	info := fmt.Sprintf("[Trash Info]\nPath=%s\nDeletionDate=%s\n", src, time.Now().Format(time.RFC3339))
	if err := os.WriteFile(infoPath, []byte(info), 0644); err != nil {
		rollbackErr := os.Rename(dest, src)
		return "", errors.Join(fmt.Errorf("could not write trashinfo file: %w", err), rollbackErr)
	}
	return dest, nil
}

func removeTrashInfo(trashedPath string) error {
	path := filepath.Join(filepath.Dir(filepath.Dir(trashedPath)), "info", filepath.Base(trashedPath)+".trashinfo")
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("could not remove trashinfo file: %w", err)
	}
	return nil
}

// RestoreNotesFromTrash is unavailable outside macOS.
func RestoreNotesFromTrash(string, []TrashRestoreInfo) error {
	return fmt.Errorf("trash restore is only supported on macOS")
}
