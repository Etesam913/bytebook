package main

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/go-git/go-git/v5"

	"github.com/etesam913/bytebook/lib/io_helpers"
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

func GetExtensionFromLanguage(language string) (bool, string) {
	languageToExtension := map[string]string{
		"python":     ".py",
		"javascript": ".js",
		"java":       ".java",
		"typescript": ".ts",
		"go":         ".go",
		"c":          ".c",
		"c++":        ".cpp",
	}

	value, exists := languageToExtension[language]
	if exists {
		return true, value
	}
	return false, ""
}

func RunFile(path string, command string) (string, error) {
	commandSplit := strings.Split(command, " ")
	cmd := exec.Command(commandSplit[0], append(commandSplit[1:], path)...)
	out, err := cmd.CombinedOutput()

	if err != nil {
		return err.Error() + "\n" + string(out), err
	}

	return string(out), nil
}

func (n *NodeService) RunCode(language string, code string, command string) NodeResponse {

	extensionExists, extension := GetExtensionFromLanguage(language)
	if !extensionExists {
		return NodeResponse{
			Success: false,
			Message: "Your programming language is invalid",
		}
	}

	// Creates a temp file for the code
	filePath := fmt.Sprintf("%s/tmp%s", n.ProjectPath, extension)
	file, err := os.Create(filePath)
	if err != nil {
		return NodeResponse{
			Success: false,
			Message: "Something went wrong when running your code. Please try again later",
		}
	}

	defer file.Close()

	_, err = file.WriteString(code)

	if err != nil {
		return NodeResponse{
			Success: false,
			Message: "Something went wrong when running your code. Please try again later",
		}
	}

	res, err := RunFile(filePath, command)

	if err != nil {
		return NodeResponse{
			Success: false,
			Message: res,
		}
	}

	err = os.Remove(filePath)
	if err != nil {
		return NodeResponse{}
	}

	return NodeResponse{
		Success: true,
		Message: res,
	}
}

type GitResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Error   error  `json:"error"`
}

var allowedErrors = make(map[error]struct{})
var stringAllowedErrors = [5]string{"remote repository is empty"}
var auth = &http.BasicAuth{
	Username: "etesam913",
	Password: "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",
}

func (n *NodeService) SyncChangesWithRepo() GitResponse {
	allowedErrors[git.NoErrAlreadyUpToDate] = struct{}{}

	// Open the repository
	repo, err := git.PlainOpen(n.ProjectPath)
	if err != nil {
		return GitResponse{Status: "error", Message: "Error in entering your repo", Error: err}
	}

	// Entering into the worktree
	worktree, err := repo.Worktree()
	if err != nil {
		return GitResponse{Status: "error", Message: "Error in entering in your repo's worktree", Error: err}
	}

	// Make pull request to get the latest changes
	err = worktree.Pull(&git.PullOptions{
		RemoteName: "origin",
		Auth:       auth,
	})

	// Checking if the error that we get is fine
	hasAllowedErrorOrNoError := true
	if err != nil {
		_, hasAllowedErrorOrNoError = allowedErrors[err]
		for _, allowedError := range stringAllowedErrors {
			if err.Error() == allowedError {
				hasAllowedErrorOrNoError = true
			}
		}
	}

	// Handling the error
	if err != nil && !hasAllowedErrorOrNoError {
		return GitResponse{Status: "error", Message: "Error when pulling from your repo", Error: err}
	} else if !errors.Is(err, git.NoErrAlreadyUpToDate) {
		fmt.Println(err)
		fmt.Println("Pulled latest changes from origin.")
	} else {
		fmt.Println("Already up-to-date.")
	}

	status, err := worktree.Status()
	if err != nil {
		fmt.Println(err)
		return GitResponse{Status: "error", Message: "Error when getting git status", Error: err}
	}

	if status.IsClean() {
		fmt.Println("No changes to sync")
		return GitResponse{Status: "info", Message: "No changes to sync", Error: nil}
	}

	// Staging the changes
	err = worktree.AddWithOptions(&git.AddOptions{All: true})
	if err != nil {
		fmt.Println(err)
		return GitResponse{Status: "error", Message: "Error when staging changes", Error: err}
	}

	// Committing the changes
	_, err = worktree.Commit("test-commit", &git.CommitOptions{})
	if err != nil {
		fmt.Println(err)
		return GitResponse{Status: "error", Message: "Error when commiting changes", Error: err}
	}

	// Pushing the changes
	err = repo.Push(&git.PushOptions{
		RemoteName: "origin",
		Auth:       auth,
	})

	// Checking if the error that we get is fine
	if err != nil {
		fmt.Println(err)
		return GitResponse{Status: "error", Message: "Error when pushing changes", Error: err}
	}
	fmt.Println("Pushed changes to origin")
	return GitResponse{Status: "success", Message: "Successfully synced changes", Error: nil}

}

func (n *NodeService) CleanAndCopyFiles(filePaths string, folderPath string, notePath string) []string {
	filePathsAsArray := strings.Split(filePaths, ",")
	newFilePaths := make([]string, 0)
	// Process the selected file
	if len(filePaths) > 0 {
		for _, file := range filePathsAsArray {
			cleanedFileName := io_helpers.CleanFileName(filepath.Base(file))
			newFilePath := filepath.Join(n.ProjectPath, "notes", folderPath, notePath, cleanedFileName)
			fileServerPath := filepath.Join("notes", folderPath, notePath, cleanedFileName)

			newFilePaths = append(newFilePaths, fileServerPath)
			err := io_helpers.CopyFile(file, newFilePath)
			if err != nil {
				return []string{}
			}
		}
	}
	return newFilePaths
}

func (n *NodeService) UploadImage(folderPath string, notePath string) []string {
	filePaths, _ := application.OpenFileDialog().
		AddFilter("Image Files", "*.jpg;*.png;*.webp;*.jpeg").
		CanChooseFiles(true).
		PromptForMultipleSelection()
	return n.CleanAndCopyFiles(strings.Join(filePaths, ","), folderPath, notePath)
}

func (n *NodeService) RemoveImage(src string) bool {
	if strings.HasPrefix(src, "http://localhost:5890") {
		src = strings.Replace(src, "http://localhost:5890/", "", 1)
		err := os.Remove(filepath.Join(n.ProjectPath, src))
		return err == nil
	}
	return false
}
