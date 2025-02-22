package project_helpers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/wailsapp/wails/v3/pkg/application"
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
				NoteSidebarItemSize: "card",
				AccentColor:         "",
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
	app := application.Get()
	// Update the accent color if it exists
	if app != nil {
		accentColor := app.GetAccentColor()
		projectSettings.AccentColor = fmt.Sprintf("rgb(%d,%d,%d)", accentColor.R, accentColor.G, accentColor.B)
	}
	// Write the updated project settings to the file
	io_helpers.WriteJsonToPath(projectSettingsPath, projectSettings)

	return project_types.ProjectSettingsReponse{Success: true, Message: "", Data: projectSettings}
}

// FormatStringListForErrorMessage formats a list of strings for error messages.
// If the list exceeds the specified capacity, it appends "etc..." to the end of the formatted string.
// Parameters:
//   - stringList: The list of strings to format.
//   - capacity: The maximum number of strings to include in the formatted string.
func FormatStringListForErrorMessage(stringList []string, capacity int) string {
	isLargerThanCapacity := len(stringList) > capacity
	joinedString := strings.Join(stringList[:capacity+1], ", ")
	if isLargerThanCapacity {
		joinedString += "etc..."
	}
	return joinedString
}
