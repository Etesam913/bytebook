package git

import (
	"errors"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/config"
	git "github.com/go-git/go-git/v5"
	gitconfig "github.com/go-git/go-git/v5/config"
)

// InitializeGitRepo creates a new git repository at the specified project path
// if one doesn't already exist. It also creates an empty .gitignore file.
// Returns nil if successful or if the repository already exists.
func InitializeGitRepo(projectPath string) error {
	// Creates the git repository
	_, err := git.PlainInit(projectPath, false)
	if errors.Is(err, git.ErrRepositoryAlreadyExists) || err == nil {
		// Adds the .gitignore file
		gitignoreContent := ``
		err := os.WriteFile(filepath.Join(projectPath, ".gitignore"), []byte(gitignoreContent), 0644)
		if err != nil {
			return errors.New("failed to create .gitignore file: " + err.Error())
		}
	} else {
		return errors.New("failed to initialize git repository: " + err.Error())
	}
	return nil
}

// SetRepoOrigin sets the remote "origin" for the git repository to the provided URL.
// If an origin already exists, it will be removed and recreated with the new URL.
// Returns an error if any git operations fail.
func SetRepoOrigin(originUrl string) error {
	projectPath, err := config.GetProjectPath()
	if err != nil {
		return errors.New("failed to get project path: " + err.Error())
	}
	repo, err := git.PlainOpen(projectPath)
	if err != nil {
		return errors.New("failed to open git repository: " + err.Error())
	}
	originRemote, _ := repo.Remote("origin")

	// Remove the "origin" remote so the CreateRemote is not stale
	if originRemote != nil {
		err := repo.DeleteRemote("origin")
		if err != nil {
			return errors.New("failed to delete existing origin remote: " + err.Error())
		}
	}
	_, err = repo.CreateRemote(&gitconfig.RemoteConfig{
		Name: "origin",
		URLs: []string{originUrl},
	})
	if err != nil {
		return errors.New("failed to create origin remote: " + err.Error())
	}
	return nil
}
