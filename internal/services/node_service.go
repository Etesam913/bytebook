package services

import (
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/notes"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type NodeService struct {
	ProjectPath string
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
			info, err := os.Stat(file)
			if err != nil {
				return []string{}, err
			}
			if info.IsDir() {
				importedPath, err := notes.CopyDroppedFolder(file, fileInProjectPath, projectPath)
				if err != nil {
					return []string{}, err
				}
				newFilePaths = append(newFilePaths, filepath.Join("notes", folderPath, filepath.Base(importedPath)))
				continue
			}
			fileInProjectPath, err = util.CreateUniqueNameForFileIfExists(fileInProjectPath)
			if err != nil {
				return []string{}, err
			}
			_, newFileName := filepath.Split(fileInProjectPath)

			// This is the path url that the frontend will access
			fileServerPath := filepath.Join("notes", folderPath, newFileName)

			copyErr := util.CopyFile(file, fileInProjectPath, false)
			if copyErr != nil {
				return []string{}, copyErr
			}
			newFilePaths = append(newFilePaths, fileServerPath)
		}
	}

	return newFilePaths, nil
}

func (n *NodeService) AddAttachments(folder string) config.BackendResponseWithData[[]string] {
	selection := n.SelectAttachmentPaths()
	if !selection.Success {
		return selection
	}
	return n.AddAttachmentsFromPaths(folder, selection.Data)
}

// SelectAttachmentPaths opens the native file picker without copying the selected files.
func (n *NodeService) SelectAttachmentPaths() config.BackendResponseWithData[[]string] {
	app := application.Get()
	if app == nil || app.Dialog == nil {
		return config.BackendResponseWithData[[]string]{Success: false, Message: "Application not initialized", Data: []string{}}
	}

	localFilePaths, err := app.Dialog.OpenFile().
		CanChooseFiles(true).
		CanChooseDirectories(false).
		PromptForMultipleSelection()
	if err != nil {
		return config.BackendResponseWithData[[]string]{Success: false, Message: userFacingError(err, "Could not open file picker"), Data: []string{}}
	}

	return config.BackendResponseWithData[[]string]{Success: true, Data: localFilePaths}
}

// AddAttachmentsFromPaths copies local files and folders into the requested notes folder.
func (n *NodeService) AddAttachmentsFromPaths(folder string, filePaths []string) config.BackendResponseWithData[[]string] {
	fileServerPaths, err := addFilePathsToProject(n.ProjectPath, filePaths, folder)
	if err != nil {
		return config.BackendResponseWithData[[]string]{Success: false, Message: userFacingError(err, "Could not add attachments"), Data: fileServerPaths}
	}

	return config.BackendResponseWithData[[]string]{Success: true, Message: "", Data: fileServerPaths}
}
