package git

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/etesam913/bytebook/internal/config"
	git "github.com/go-git/go-git/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInitializeGitRepo(t *testing.T) {
	tempDir := t.TempDir()

	t.Run("new repository initialization", func(t *testing.T) {
		err := InitializeGitRepo(tempDir)
		assert.NoError(t, err, "InitializeGitRepo should succeed")

		// Verify .gitignore was created
		gitignorePath := filepath.Join(tempDir, ".gitignore")
		_, err = os.Stat(gitignorePath)
		assert.False(t, os.IsNotExist(err), ".gitignore file should exist")

		// Verify git repository was created
		_, err = git.PlainOpen(tempDir)
		assert.NoError(t, err, "git repository should exist and be openable")
	})

	t.Run("initializing existing repository", func(t *testing.T) {
		err := InitializeGitRepo(tempDir)
		assert.NoError(t, err, "initializing existing repo should not error")
	})
}

func TestSetRepoOrigin(t *testing.T) {
	tempDir := t.TempDir()

	originalUserHomeDir := config.UserHomeDir
	defer func() { config.UserHomeDir = originalUserHomeDir }()

	// Set up the mock
	config.UserHomeDir = func() (string, error) {
		return tempDir, nil
	}
	projectPath, err := config.GetProjectPath()
	require.NoError(t, err, "GetProjectPath should succeed")
	// Initialize git repo first
	err = InitializeGitRepo(projectPath)

	require.NoError(t, err, "git repo initialization should succeed")

	t.Run("setting initial origin", func(t *testing.T) {
		testURL := "https://github.com/test/repo.git"
		err := SetRepoOrigin(testURL)
		assert.NoError(t, err, "SetRepoOrigin should succeed")

		// Verify origin was set correctly
		repo, err := git.PlainOpen(projectPath)
		assert.NoError(t, err, "should be able to open git repo")

		remote, err := repo.Remote("origin")
		assert.NoError(t, err, "should be able to get remote")
		assert.Equal(t, testURL, remote.Config().URLs[0], "remote URL should match set URL")
	})

	t.Run("updating existing origin", func(t *testing.T) {
		newURL := "https://github.com/test/newrepo.git"
		err := SetRepoOrigin(newURL)
		assert.NoError(t, err, "updating existing origin should succeed")

		// Verify origin was updated
		repo, err := git.PlainOpen(projectPath)
		assert.NoError(t, err, "should be able to open git repo")

		remote, err := repo.Remote("origin")
		assert.NoError(t, err, "should be able to get remote")
		assert.Equal(t, newURL, remote.Config().URLs[0], "remote URL should be updated to new URL")
	})
}
