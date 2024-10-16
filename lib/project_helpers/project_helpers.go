package project_helpers

import (
	"crypto/rand"
	"encoding/hex"

	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/lib/io_helpers"
)

const ProjectName = "Bytebook"

func GetProjectPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "Could not get user's home directory", err
	}

	// Customize the folder and database name as needed
	var projectPath string

	err = io_helpers.CompleteCustomActionForOS(
		io_helpers.ActionStruct{
			WindowsAction: func() {
				projectPath = filepath.Join(homeDir, "AppData", "Local", ProjectName)
			},
			MacAction: func() {
				projectPath = filepath.Join(homeDir, "Library", "Application Support", ProjectName)
			},
			LinuxAction: func() {
				projectPath = filepath.Join(homeDir, ".local", "share", ProjectName)
			},
		},
	)

	if err != nil {
		return "Could not get the project path", err
	}
	// Ensure the directory exists
	if err := os.MkdirAll(filepath.Dir(projectPath), os.ModePerm); err != nil {
		return "Could not create the dbPath directory", err
	}
	return projectPath, nil
}

// MenuItem represents an item in the context menu
type MenuItem struct {
	Label     string
	EventName string
}

func GenerateRandomID() (string, error) {
	bytes := make([]byte, 8) // Adjust the size as needed
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
