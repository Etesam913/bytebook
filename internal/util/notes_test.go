package util

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSplitFolderAndFile(t *testing.T) {
	tests := []struct {
		name             string
		folderAndFile    string
		expectedFolder   string
		expectedFileName string
	}{
		{
			name:             "file only",
			folderAndFile:    "photo.jpg",
			expectedFolder:   "",
			expectedFileName: "photo.jpg",
		},
		{
			name:             "folder and file",
			folderAndFile:    "folder1/photo.jpg",
			expectedFolder:   "folder1",
			expectedFileName: "photo.jpg",
		},
		{
			name:             "nested folder",
			folderAndFile:    "folder1/subfolder/photo.jpg",
			expectedFolder:   "folder1/subfolder",
			expectedFileName: "photo.jpg",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			folder, fileName := SplitFolderAndFile(tt.folderAndFile)
			assert.Equal(t, tt.expectedFolder, folder)
			assert.Equal(t, tt.expectedFileName, fileName)
		})
	}
}
