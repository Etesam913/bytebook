package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-git/go-git/v5"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/project_helpers"
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

func GetExtensionFromLanguage(language string) (bool, string) {
	languageToExtension := map[string]string{
		"python":     ".py",
		"javascript": ".js",
		"java":       ".java",
		"typescript": ".ts",
		"go":         ".go",
		"c":          ".c",
		"cpp":        ".cpp",
		"rust":       ".rs",
	}

	value, exists := languageToExtension[language]
	if exists {
		return true, value
	}
	return false, ""
}

type CodeContextStore = map[string]context.CancelFunc

var contextStore = CodeContextStore{}

func handleCppCompilation(pathToCppFile string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "g++", "-o", "main", pathToCppFile)
	languageFolderPath := filepath.Dir(filepath.Dir(pathToCppFile))
	cmd.Dir = languageFolderPath
	out, err := cmd.CombinedOutput()
	if ctx.Err() != nil {
		return ctx.Err().Error(), ctx.Err()
	}
	if err != nil {
		return err.Error() + "\n" + string(out), err
	}
	return filepath.Join(filepath.Dir(pathToCppFile), "main"), nil
}

// writeCargoToml creates a standard Cargo.toml file in the specified directory.
func writeCargoToml(dir string) error {
	// Define the content of the Cargo.toml file
	cargoTomlContent := `[package]
name = "temp_project"
version = "0.1.0"
authors = ["Your Name <your.email@example.com>"]
edition = "2021"

[dependencies]
`

	// Ensure the directory exists
	err := os.MkdirAll(dir, 0755)
	if err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	// Define the file path
	filePath := filepath.Join(dir, "Cargo.toml")

	// Create and open the file
	file, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	// Write the content to the file
	_, err = file.WriteString(cargoTomlContent)
	if err != nil {
		return fmt.Errorf("failed to write to file: %w", err)
	}

	fmt.Println("Cargo.toml file created successfully!")
	return nil
}

func RunFile(projectPath string, nodeKey string, filePath string, command string) (string, error) {
	commandSplit := strings.Split(command, " ")
	// contextId, _ := project_helpers.GenerateRandomID()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	contextStore[nodeKey] = cancel
	defer cancel()

	cmd := exec.CommandContext(ctx, commandSplit[0], append(commandSplit[1:], filePath)...)
	cmd.Dir = projectPath
	out, err := cmd.CombinedOutput()

	if _, exists := contextStore[nodeKey]; exists {
		delete(contextStore, nodeKey)
	}

	if ctx.Err() != nil {
		if ctx.Err() == context.Canceled {
			return "Code execution was cancelled", ctx.Err()
		} else if ctx.Err() == context.DeadlineExceeded {
			return "Code execution timed out", ctx.Err()
		} else {
			return ctx.Err().Error(), ctx.Err()
		}
	}

	if err != nil {
		return err.Error() + "\n" + string(out), err
	}

	return string(out), nil
}

func (n *NodeService) CancelCode(nodeKey string) bool {
	if _, exists := contextStore[nodeKey]; exists {
		// Cancel the context
		contextStore[nodeKey]()
		// We can delete the context from the store as it won't be used anymore'
		delete(contextStore, nodeKey)
		return true
	}
	return false
}

func (n *NodeService) RunCode(nodeKey string, language string, code string, command string) CodeResponse {
	extensionExists, extension := GetExtensionFromLanguage(language)

	uniqueId, _ := project_helpers.GenerateRandomID()

	if !extensionExists {
		return CodeResponse{
			Success: false,
			Message: "Your programming language is invalid",
			Id:      uniqueId,
		}
	}

	// Creates a temp file for the code
	dirPath := filepath.Join(n.ProjectPath, language, "src")
	err := os.MkdirAll(dirPath, 0755)
	if err != nil {
		return CodeResponse{
			Success: false,
			Message: "Failed to create directory. Please try again later.",
			Id:      uniqueId,
		}
	}

	// Construct the file path
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

	_, err = file.WriteString(code)

	if err != nil {
		return CodeResponse{
			Success: false,
			Message: "Something went wrong when running your code. Please try again later",
			Id:      uniqueId,
		}
	}

	if language == "rust" {
		err = writeCargoToml(filepath.Join(n.ProjectPath, language))
		if err != nil {
			return CodeResponse{
				Success: false,
				Message: "Something went wrong when running your code. Please try again later",
				Id:      uniqueId,
			}
		}
	}

	if language == "cpp" {
		cppExecutablePath, err := handleCppCompilation(filePath)
		if err != nil {
			return CodeResponse{
				Success: false,
				Message: "Something went wrong when running your code. Please try again later",
				Id:      uniqueId,
			}
		}
		filePath = cppExecutablePath
	}
	pathToLanguage := filepath.Join(n.ProjectPath, language)
	res, err := RunFile(pathToLanguage, nodeKey, filePath, command)

	if err != nil {
		return CodeResponse{
			Success: false,
			Message: res,
			Id:      uniqueId,
		}
	}

	return CodeResponse{
		Success: true,
		Message: res,
		Id:      uniqueId,
	}
}

type GitResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Error   error  `json:"error"`
}

var allowedErrors = make(map[error]struct{})
var stringAllowedErrors = [5]string{"remote repository is empty"}

func (n *NodeService) SyncChangesWithRepo(username string, accessToken string) GitResponse {
	allowedErrors[git.NoErrAlreadyUpToDate] = struct{}{}
	fmt.Println(username, accessToken)
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
		RemoteURL:  "https://github.com/Etesam913/bytebook-test.git",
	})

	// Handling the error
	if err != nil {
		fmt.Println(err)
		if !errors.Is(err, git.NoErrAlreadyUpToDate){
			return GitResponse{Success: false, Message: "Error when pulling from your repo", Error: err}
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
	_, err = worktree.Commit("test-commit", &git.CommitOptions{})
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
