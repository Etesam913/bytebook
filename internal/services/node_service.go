package services

import (
	"path/filepath"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type NodeService struct {
	ProjectPath string
}

type AttachmentResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	Paths   []string `json:"paths"`
}

// Copies the files from the selected folder to the project folder and returns the file paths
func addFilePathsToProject(projectPath string, filePaths []string, folderPath string) ([]string, error) {
	// We have to use a string for filePaths instead of an array because of a binding problem, might get fixed later on
	newFilePaths := make([]string, 0)

	// Process the selected file
	if len(filePaths) > 0 {
		for _, file := range filePaths {
			cleanedFileName := util.CleanFileName(filepath.Base(file))
			fileInProjectPath := filepath.Join(projectPath, "notes", folderPath, cleanedFileName)
			fileInProjectPath, err := util.CreateUniqueNameForFileIfExists(fileInProjectPath)
			if err != nil {
				return []string{}, err
			}
			_, newFileName := filepath.Split(fileInProjectPath)

			// This is the path url that the frontend will access
			fileServerPath := filepath.Join("notes", folderPath, newFileName)

			error := util.CopyFile(file, fileInProjectPath, false)
			if error != nil {
				return []string{}, error
			}
			newFilePaths = append(newFilePaths, fileServerPath)
		}
	}

	return newFilePaths, nil
}

func (n *NodeService) AddAttachments(folder string, note string) AttachmentResponse {
	localFilePaths, err := application.OpenFileDialog().
		CanChooseFiles(true).
		PromptForMultipleSelection()
	if err != nil {
		return AttachmentResponse{Success: false, Message: err.Error(), Paths: []string{}}
	}

	fileServerPaths, err := addFilePathsToProject(n.ProjectPath, localFilePaths, folder)
	if err != nil {
		return AttachmentResponse{Success: false, Message: err.Error(), Paths: fileServerPaths}
	}
	return AttachmentResponse{Success: true, Message: "", Paths: fileServerPaths}
}
