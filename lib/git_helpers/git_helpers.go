package git_helpers

import (
	"errors"
	"log"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/go-git/go-git/v5"
	gitconfig "github.com/go-git/go-git/v5/config"
)

func InitializeGitRepo(projectPath string) {
	// Creates the git repository
	_, err := git.PlainInit(projectPath, false)
	if err != nil && !errors.Is(err, git.ErrRepositoryAlreadyExists) {
		log.Fatalf("Could not initialize git repo, %v", err)
	} else {
		// Adds the .gitignore file
		gitignoreContent := `c++/
trash/
cpp/
c++/
java/
javascript/
python/
rust/
go/
c/
`
		err := os.WriteFile(filepath.Join(projectPath, ".gitignore"), []byte(gitignoreContent), 0644)
		if err != nil {
			return
		}
	}
}

func SetRepoOrigin(originUrl string) bool {
	projectPath, err := config.GetProjectPath()
	if err != nil {
		log.Fatalf("Cannot get project path: %v", err)
	}
	repo, err := git.PlainOpen(projectPath)
	if err != nil {
		log.Fatalf("Could not open repo: %v", err)
	}
	originRemote, _ := repo.Remote("origin")

	// Remove the "origin" remote so the CreateRemote is not stale
	if originRemote != nil {
		err := repo.DeleteRemote("origin")
		if err != nil {
			return true
		}
	}
	_, err = repo.CreateRemote(&gitconfig.RemoteConfig{
		Name: "origin",
		URLs: []string{originUrl},
	})
	return err != nil
}

type GitResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Error   error  `json:"error"`
}
