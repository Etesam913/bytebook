package services

import (
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/util"
)

func moveMarkdownNoteWithSidecar(srcPath, dstPath string) error {
	uniqueDstPath, err := util.CreateUniqueNameForFileIfExists(dstPath)
	if err != nil {
		return err
	}

	if err := os.Rename(srcPath, uniqueDstPath); err != nil {
		return err
	}

	if filepath.Ext(srcPath) != ".md" {
		return nil
	}

	return notes.MoveCodeResultsSidecar(srcPath, uniqueDstPath)
}
