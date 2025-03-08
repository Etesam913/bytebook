package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/go-git/go-git/v5"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/project_helpers"
	"github.com/etesam913/bytebook/lib/terminal_helpers"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type NodeService struct {
	ProjectPath string
}

type NodeResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

type CodeResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Id      string `json:"id"`
}

type CodeContextStore = map[string]context.CancelFunc

// UpdateTempCodeFile creates a temporary file for the given code and returns a CodeResponse
// It handles different programming languages and performs necessary setup
func (n *NodeService) UpdateTempCodeFile(nodeKey string, language string, code string, command string) CodeResponse {
	// Get the file extension for the given language
	extensionExists, extension := terminal_helpers.GetExtensionFromLanguage(language)

	// Generate a unique ID for this operation
	uniqueId, _ := project_helpers.GenerateRandomID()

	// Check if the language is supported
	if !extensionExists {
		return CodeResponse{
			Success: false,
			Message: "Your programming language is invalid",
			Id:      uniqueId,
		}
	}

	// Create the directory for the temporary file
	dirPath := filepath.Join(n.ProjectPath, language, "src")
	err := os.MkdirAll(dirPath, 0755)
	if err != nil {
		return CodeResponse{
			Success: false,
			Message: "Failed to create directory. Please try again later.",
			Id:      uniqueId,
		}
	}

	// Create the temporary file
	filePath := filepath.Join(dirPath, "main"+extension)
	file, err := os.Create(filePath)
	if err != nil {
		return CodeResponse{
			Success: false,
			Message: "Something went wrong when creating the file. Please try again later.",
			Id:      uniqueId,
		}
	}
	defer file.Close()

	// Write the code to the file
	_, err = file.WriteString(code)
	if err != nil {
		return CodeResponse{
			Success: false,
			Message: "Something went wrong when running your code. Please try again later",
			Id:      uniqueId,
		}
	}

	// Handle Rust-specific setup
	if language == "rust" {
		err = terminal_helpers.WriteCargoToml(filepath.Join(n.ProjectPath, language))
		if err != nil {
			return CodeResponse{
				Success: false,
				Message: "Something went wrong when running your code. Please try again later",
				Id:      uniqueId,
			}
		}
	}

	// Return success response
	return CodeResponse{
		Success: true,
		Message: "Successfully updated code",
		Id:      uniqueId,
	}
}

type GitResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Error   error  `json:"error"`
}

func (n *NodeService) SyncChangesWithRepo(username, accessToken, repositoryToSyncTo, commitMessage string) GitResponse {
	if len(username) == 0 {
		return GitResponse{Success: false, Message: "You must first login to be able to sync changes", Error: errors.New("username cannot be empty")}
	}
	fmt.Println("repository to sync to:", repositoryToSyncTo)
	var auth = &http.BasicAuth{
		Username: username,
		Password: accessToken,
	}

	// Open the repository
	repo, err := git.PlainOpen(n.ProjectPath)
	if err != nil {
		return GitResponse{Success: false, Message: "Error in entering your repo", Error: err}
	}

	// Entering into the worktree
	worktree, err := repo.Worktree()
	if err != nil {
		return GitResponse{Success: false, Message: "Error in entering in your repo's worktree", Error: err}
	}

	// Make pull request to get the latest changes
	err = worktree.Pull(&git.PullOptions{
		RemoteName: "origin",
		Auth:       auth,
		RemoteURL:  repositoryToSyncTo,
		Force:      true,
		Depth:      1,
	})

	// Handling the error
	if err != nil {
		if !errors.Is(err, git.NoErrAlreadyUpToDate) && err.Error() != "remote repository is empty" {
			fmt.Println(err)
			return GitResponse{Success: false, Message: "Error when pulling from your repo: " + err.Error(), Error: err}
		}
	}

	// } else if !errors.Is(err, git.NoErrAlreadyUpToDate) {
	// 	fmt.Println(err)
	// 	fmt.Println("Pulled latest changes from origin.")
	// } else {
	// 	fmt.Println("Already up-to-date.")
	// }

	status, err := worktree.Status()
	fmt.Println(status)
	if err != nil {
		fmt.Println(err)
		return GitResponse{Success: false, Message: "Error when getting git status", Error: err}
	}

	if status.IsClean() {
		fmt.Println("No changes to sync")
		return GitResponse{Success: true, Message: "No changes to sync", Error: nil}
	}

	fmt.Println("Staging changes")
	// Staging the changes
	err = worktree.AddWithOptions(&git.AddOptions{All: true})
	if err != nil {
		fmt.Println(err)
		return GitResponse{Success: false, Message: "Error when staging changes", Error: err}
	}

	fmt.Println("Comitting changes")
	// Committing the changes
	_, err = worktree.Commit(commitMessage, &git.CommitOptions{})
	if err != nil {
		fmt.Println(err)
		return GitResponse{Success: false, Message: "Error when commiting changes", Error: err}
	}
	// Pushing the changes
	err = repo.Push(&git.PushOptions{
		RemoteName: "origin",
		Auth:       auth,
	})

	// Checking if the error that we get is fine
	if err != nil {
		return GitResponse{Success: false, Message: "Error when pushing changes", Error: err}
	}
	fmt.Println("Pushed changes to origin")
	return GitResponse{Success: true, Message: "Successfully synced changes", Error: nil}

}

type AttachmentResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	Paths   []string `json:"paths"`
}

// Copies the files from the selected folder to the project folder and returns the file paths
func (n *NodeService) AddFilePathsToProject(filePaths []string, folderPath string, notePath string) ([]string, error) {
	// We have to use a string for filePaths instead of an array because of a binding problem, might get fixed later on
	newFilePaths := make([]string, 0)

	// Process the selected file
	if len(filePaths) > 0 {
		for _, file := range filePaths {
			cleanedFileName := io_helpers.CleanFileName(filepath.Base(file))
			fileInProjectPath := filepath.Join(n.ProjectPath, "notes", folderPath, cleanedFileName)
			fileInProjectPath, err := io_helpers.CreateUniqueNameForFileIfExists(fileInProjectPath)
			if err != nil {
				return []string{}, err
			}
			_, newFileName := filepath.Split(fileInProjectPath)

			// This is the path url that the frontend will access
			fileServerPath := filepath.Join("notes", folderPath, newFileName)

			errObj := io_helpers.CopyFile(file, fileInProjectPath, false)
			if errObj.Err != nil {
				return []string{}, errObj.Err
			}
			newFilePaths = append(newFilePaths, fileServerPath)
		}
	}

	return newFilePaths, nil
}

func (n *NodeService) AddAttachments(folder string, note string) AttachmentResponse {
	localFilePaths, _ := application.OpenFileDialog().
		CanChooseFiles(true).
		PromptForMultipleSelection()
	fileServerPaths, err := n.AddFilePathsToProject(localFilePaths, folder, note)
	if err != nil {
		return AttachmentResponse{Success: false, Message: err.Error(), Paths: fileServerPaths}
	}
	return AttachmentResponse{Success: true, Message: "", Paths: fileServerPaths}
}
