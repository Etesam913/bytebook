package git_helpers

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/lib/project_helpers"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/config"
)

func InitializeGitRepo(projectPath string) {
	// Creates the git repository
	_, err := git.PlainInit(projectPath, false)
	if err != nil && !errors.Is(git.ErrRepositoryAlreadyExists, err) {
		log.Fatalf("Could not initialize git repo, %v", err)
	} else{
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
`
		err := os.WriteFile(filepath.Join(projectPath, ".gitignore"), []byte(gitignoreContent), 0644)
		if err != nil {
			return
		}
	}
}

func SetRepoOrigin(originUrl string) {
	projectPath, err := project_helpers.GetProjectPath()
	if err != nil {
		log.Fatalf("Cannot get project path: %v", err)
	}
	repo, err := git.PlainOpen(projectPath)
	if err != nil {
		log.Fatalf("Could not open repo: %v", err)
	}

	_, err = repo.CreateRemote(&config.RemoteConfig{
		Name: "origin",
		URLs: []string{originUrl},
	})
	if err != nil {
		fmt.Println(err)
		return
	}
}

type GitResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Error   error  `json:"error"`
}
