package util

import (
	"path/filepath"
)

// SplitFolderAndFile normalizes a folderAndFileName into folder and filename parts.
func SplitFolderAndFile(folderAndFileName string) (string, string) {
	folder := filepath.Dir(folderAndFileName)
	if folder == "." {
		folder = ""
	}
	fileName := filepath.Base(folderAndFileName)
	return folder, fileName
}
