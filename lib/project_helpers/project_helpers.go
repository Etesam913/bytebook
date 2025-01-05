package project_helpers

import (
	"crypto/rand"
	"encoding/hex"

	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/project_types"
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

func GetProjectSettings(projectPath string) project_types.ProjectSettingsReponse {
	var projectSettings project_types.ProjectSettingsJson
	projectSettingsPath := filepath.Join(projectPath, "settings", "settings.json")
	err := io_helpers.ReadJsonFromPath(projectSettingsPath, &projectSettings)

	// The file does not exist
	if err != nil {
		err = io_helpers.WriteJsonToPath(projectSettingsPath,
			project_types.ProjectSettingsJson{
				PinnedNotes:         []string{},
				ProjectPath:         projectPath,
				RepositoryToSyncTo:  "",
				DarkMode:            "light",
				NoteSidebarItemSize: "regular",
			},
		)
		if err != nil {
			return project_types.ProjectSettingsReponse{Success: false, Message: "Failed to write project settings"}
		}
		err = io_helpers.ReadJsonFromPath(projectSettingsPath, &projectSettings)
		if err != nil {
			return project_types.ProjectSettingsReponse{Success: false, Message: "Failed to read project settings"}
		}
	}
	validPinnedNotes := io_helpers.GetValidPinnedNotes(projectPath, projectSettings)
	projectSettings.PinnedNotes = validPinnedNotes
	// Write the updated project settings to the file
	io_helpers.WriteJsonToPath(projectSettingsPath, projectSettings)

	return project_types.ProjectSettingsReponse{Success: true, Message: "", Data: projectSettings}
}
