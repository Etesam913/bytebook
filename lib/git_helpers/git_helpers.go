package git_helpers

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/lib/project_helpers"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/config"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
)

var auth = &http.BasicAuth{
	Username: "etesam913",
	Password: "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",
}

var allowedErrors = make(map[error]struct{})
var stringAllowedErrors = [5]string{"remote repository is empty"}

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
	Success bool
	Message string
	Error   error
}

func CommitChanges(projectPath string) GitReponse {
	allowedErrors[git.NoErrAlreadyUpToDate] = struct{}{}

	// Open the repository
	repo, err := git.PlainOpen(projectPath)
	if err != nil {
		return GitReponse{Success: false, Message: "Error in entering your repo", Error: err}
	}

	// Entering into the worktree
	worktree, err := repo.Worktree()
	if err != nil {
		return GitReponse{Success: false, Message: "Error in entering in your repo's worktree", Error: err}
	}

	// Make pull request to get the latest changes
	err = worktree.Pull(&git.PullOptions{
		RemoteName: "origin",
		Auth:       auth,
	})

	// Checking if the error that we get is fine
	_, errorIsAllowed := allowedErrors[err]
	for _, allowedError := range stringAllowedErrors {
		if err.Error() == allowedError {
			errorIsAllowed = true
		}
	}

	// Handling the error
	if err != nil && !errorIsAllowed {
		return GitReponse{Success: false, Message: "Error when pulling from your repo", Error: err}
	} else if err == git.NoErrAlreadyUpToDate {
		fmt.Println("Already up-to-date.")
	} else {
		fmt.Println("Pulled latest changes from origin.")
	}

	status, err := worktree.Status()
	if err != nil {
		return GitReponse{Success: false, Message: "Error when getting git status", Error: err}
	}

	if status.IsClean() {
		fmt.Println("No changes to sync")
		return GitReponse{Success: true, Message: "No changes to sync", Error: nil}
	}

	// Staging the changes
	err = worktree.AddWithOptions(&git.AddOptions{All: true})
	if err != nil {
		return GitReponse{Success: false, Message: "Error when staging changes", Error: err}
	}

	// Committing the changes
	_, err = worktree.Commit("test-commit", &git.CommitOptions{})
	if err != nil {
		return GitReponse{Success: false, Message: "Error when commiting changes", Error: err}
	}

	// Pushing the changes
	err = repo.Push(&git.PushOptions{
		RemoteName: "origin",
		Auth:       auth,
	})

	// Checking if the error that we get is fine
	if err != nil {
		return GitReponse{Success: false, Message: "Error when pushing changes", Error: err}
	}
	fmt.Println("Pushed changes to origin")
	return GitReponse{Success: true, Message: "Successfully synced with repo", Error: nil}

}
