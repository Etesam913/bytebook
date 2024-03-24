package git_helpers

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/lib/project_helpers"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/config"
)

func InitalizeGitRepo(projectPath string) {
	// Creates the git repository
	_, err := git.PlainInit(projectPath, false)
	if err != nil && err != git.ErrRepositoryAlreadyExists {
		log.Fatalf("Could not initialize git repo, %v", err)
	} else if err != git.ErrRepositoryAlreadyExists {
		// The git repo is being created
		os.WriteFile(filepath.Join(projectPath, ".gitignore"), []byte("bytebook.db"), 0644)
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

	repo.CreateRemote(&config.RemoteConfig{
		Name: "origin",
		URLs: []string{originUrl},
	})
	if err != nil {
		fmt.Println(err)
		return
	}
}

type GitReponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Error   error  `json:"error"`
}
