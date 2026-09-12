package notes

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// CopyDroppedFolder copies a local folder into the notes tree without overwriting existing folders.
// Returns the final destination path after publishing the completed copy.
func CopyDroppedFolder(source, destination, projectPath string) (string, error) {
	source, destination, err := resolveFolderImportPaths(source, destination)
	if err != nil {
		return "", err
	}
	// Keep incomplete imports outside the watched notes tree. Publishing the
	// completed folder lets the existing bulk importer discover it in one pass.
	staging, err := os.MkdirTemp(projectPath, ".folder-import-")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(staging)
	copied := filepath.Join(staging, "content")
	if err := copyFolderContents(source, copied); err != nil {
		return "", err
	}
	destination, err = uniqueFolderImportDestination(destination)
	if err != nil {
		return "", err
	}
	if err := os.Rename(copied, destination); err != nil {
		return "", err
	}
	return destination, nil
}

func resolveFolderImportPaths(source, destination string) (string, string, error) {
	// Resolve symlink aliases so the containment check below detects a destination
	// inside the source even when the paths use different names for the same folder.
	// Resolve only the destination's parent because the new folder does not exist yet.
	source, err := filepath.EvalSymlinks(source)
	if err != nil {
		return "", "", err
	}
	parent, err := filepath.EvalSymlinks(filepath.Dir(destination))
	if err != nil {
		return "", "", err
	}
	source, err = filepath.Abs(source)
	if err != nil {
		return "", "", err
	}
	parent, err = filepath.Abs(parent)
	if err != nil {
		return "", "", err
	}
	relative, err := filepath.Rel(source, parent)
	if err != nil {
		return "", "", err
	}
	if relative != ".." && !strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return "", "", fmt.Errorf("cannot copy a folder into itself")
	}
	return source, filepath.Join(parent, filepath.Base(destination)), nil
}

func copyFolderContents(source, copied string) error {
	sourceFS := os.DirFS(source)
	// Reject links and special files rather than following them outside the
	// dropped folder or blocking on devices and named pipes.
	if err := fs.WalkDir(sourceFS, ".", func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !entry.IsDir() && !entry.Type().IsRegular() {
			return fmt.Errorf("unsupported file in dropped folder: %s", path)
		}
		return nil
	}); err != nil {
		return err
	}
	if err := os.CopyFS(copied, sourceFS); err != nil {
		return fmt.Errorf("copy folder: %w", err)
	}
	return nil
}

func uniqueFolderImportDestination(destination string) (string, error) {
	base := destination
	for suffix := 1; ; suffix++ {
		_, err := os.Lstat(destination)
		if os.IsNotExist(err) {
			break
		}
		if err != nil {
			return "", err
		}
		destination = fmt.Sprintf("%s %d", base, suffix)
	}
	return destination, nil
}
