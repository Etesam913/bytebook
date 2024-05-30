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

func RunFile(projectPath string, filePath string, command string) (string, error) {
	commandSplit := strings.Split(command, " ")
	contextId, _ := project_helpers.GenerateRandomID()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	contextStore[contextId] = cancel
	defer cancel()

	cmd := exec.CommandContext(ctx, commandSplit[0], append(commandSplit[1:], filePath)...)
	cmd.Dir = projectPath
	out, err := cmd.CombinedOutput()

	if ctx.Err() != nil {
		return ctx.Err().Error(), ctx.Err()
	}

	if err != nil {
		return err.Error() + "\n" + string(out), err
	}
	delete(contextStore, contextId)
	return string(out), nil
}

func (n *NodeService) RunCode(language string, code string, command string) CodeResponse {
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
		fmt.Println("Error creating file:", filePath)
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
	res, err := RunFile(filepath.Join(n.ProjectPath, language), filePath, command)

	if err != nil {
		return CodeResponse{
			Success: false,
			Message: res,
			Id:      uniqueId,
		}
	}

	// err = os.Remove(filePath)
	// if err != nil {
	// 	return CodeResponse{
	// 		Success: false,
	// 		Message: "Something went wrong when running your code. Please try again later",
	// 		Id:      uniqueId,
	// 	}
	// }

	return CodeResponse{
		Success: true,
		Message: res,
		Id:      uniqueId,
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

func (n *NodeService) CleanAndCopyFiles(filePaths string, folderPath string, notePath string) ([]string, error) {
	// We have to use a string for filePaths instead of an array because of a binding problem, might get fixed later on
	filePathsAsArray := strings.Split(filePaths, ",")
	newFilePaths := make([]string, 0)
	destinationFileErrors := make([]string, 0)
	// Process the selected file
	if len(filePaths) > 0 {
		for _, file := range filePathsAsArray {
			cleanedFileName := io_helpers.CleanFileName(filepath.Base(file))
			newFilePath := filepath.Join(n.ProjectPath, "notes", folderPath, "attachments", cleanedFileName)
			fileServerPath := filepath.Join("notes", folderPath, "attachments", cleanedFileName)

			errObj := io_helpers.CopyFile(file, newFilePath, false)
			if errObj.Err != nil {
				// If it is a destination exists error, we want to congeal the errors into one large error
				if errObj.IsDstExists {
					wordsInError := strings.Split(errObj.Err.Error(), " ")
					destinationFileErrors = append(destinationFileErrors, wordsInError[0])
					continue
				} else {
					return []string{}, errObj.Err
				}

			}
			newFilePaths = append(newFilePaths, fileServerPath)
		}
	}

	// Create a mega error for all the failed images
	if len(destinationFileErrors) > 0 {
		exist := ""
		if len(destinationFileErrors) > 1 {
			exist = "exist"
		} else {
			exist = "exists"
		}

		fileNamesWithCommas := strings.Join(destinationFileErrors[:len(destinationFileErrors)-1], ", ")
		if len(destinationFileErrors) > 1 {
			fileNamesWithCommas += " and "
		}
		fileNamesWithCommas += destinationFileErrors[len(destinationFileErrors)-1]

		return newFilePaths, errors.New(
			fmt.Sprintf(
				"%s already %s in your attachments",
				fileNamesWithCommas,
				exist,
			),
		)

	}
	return newFilePaths, nil
}

type UploadImageResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	Paths   []string `json:"paths"`
}

func (n *NodeService) UploadImage(folder string, note string) UploadImageResponse {
	filePaths, _ := application.OpenFileDialog().
		AddFilter("Image Files", "*.jpg;*.png;*.webp;*.jpeg").
		CanChooseFiles(true).
		PromptForMultipleSelection()
	cleanedPaths, err := n.CleanAndCopyFiles(strings.Join(filePaths, ","), folder, note)
	if err != nil {
		return UploadImageResponse{Success: false, Message: err.Error(), Paths: cleanedPaths}
	}
	return UploadImageResponse{Success: true, Message: "", Paths: cleanedPaths}
}

func (n *NodeService) RemoveImage(src string) bool {
	if strings.HasPrefix(src, "http://localhost:5890") {
		src = strings.Replace(src, "http://localhost:5890/", "", 1)
		err := os.Remove(filepath.Join(n.ProjectPath, src))
		return err == nil
	}
	return false
}
