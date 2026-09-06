package services

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/notes/sidecar"
	"github.com/etesam913/bytebook/internal/util"
)

func moveFileWithSidecar(srcPath, dstPath string) error {
	uniqueDstPath, err := util.CreateUniqueNameForFileIfExists(dstPath)
	if err != nil {
		return err
	}
	return renameFileWithSidecar(srcPath, uniqueDstPath, os.Rename)
}

// Preflight both destinations, then restore the file if moving its metadata fails.
// The rename function is injectable so failure recovery can be tested on a real filesystem.
func renameFileWithSidecar(srcPath, dstPath string, rename func(string, string) error) error {
	source, err := os.Lstat(srcPath)
	if err != nil {
		return fmt.Errorf("inspect source: %w", err)
	}
	if err := checkMoveDestination(source, dstPath); err != nil {
		return err
	}
	if filepath.Clean(srcPath) == filepath.Clean(dstPath) {
		return nil
	}

	var metadata os.FileInfo
	srcSidecar, dstSidecar := sidecar.PathFor(srcPath), sidecar.PathFor(dstPath)
	if !source.IsDir() {
		metadata, err = os.Lstat(srcSidecar)
		if err != nil && !errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("inspect source sidecar: %w", err)
		}
		// Reject orphan destination metadata even when the source has no sidecar.
		if err := checkMoveDestination(metadata, dstSidecar); err != nil {
			return err
		}
	}

	if err := rename(srcPath, dstPath); err != nil {
		return fmt.Errorf("move file: %w", err)
	}
	if metadata == nil {
		return nil
	}

	// Recheck after the first rename in case another writer created a sidecar.
	err = checkMoveDestination(metadata, dstSidecar)
	if err == nil {
		err = rename(srcSidecar, dstSidecar)
	}
	if err == nil {
		return nil
	}
	// The watcher may already have moved this exact sidecar after seeing the file rename.
	if destination, statErr := os.Lstat(dstSidecar); statErr == nil && os.SameFile(metadata, destination) {
		return nil
	}

	moveErr := fmt.Errorf("move sidecar: %w", err)
	// Never overwrite a new file that appeared at the original path during the move.
	rollbackErr := checkMoveDestination(source, srcPath)
	if rollbackErr == nil {
		rollbackErr = rename(dstPath, srcPath)
	}
	if rollbackErr != nil {
		return fmt.Errorf("file remains at %s after rollback failed: %w", dstPath, errors.Join(moveErr, rollbackErr))
	}
	return moveErr
}

func checkMoveDestination(source os.FileInfo, destination string) error {
	info, err := os.Lstat(destination)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("inspect destination %s: %w", destination, err)
	}
	if source != nil && os.SameFile(source, info) {
		return nil
	}
	return fmt.Errorf("destination %s already exists: %w", destination, os.ErrExist)
}
