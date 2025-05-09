package project_helpers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/kernel_helpers"
	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/etesam913/bytebook/lib/tags_helper"
	"github.com/wailsapp/wails/v3/pkg/application"
)

const ProjectName = "Bytebook"

func CreateProjectDirectories(projectPath string) {
	if err := os.MkdirAll(filepath.Join(projectPath, "settings"), os.ModePerm); err != nil {
		log.Fatalf("Failed to create project settings directory: %v", err)
	}

	if err := os.MkdirAll(filepath.Join(projectPath, "code"), os.ModePerm); err != nil {
		log.Fatalf("Failed to create project code directory: %v", err)
	}

	if err := os.MkdirAll(filepath.Join(projectPath, "tags"), os.ModePerm); err != nil {
		log.Fatalf("Failed to create project tags directory: %v", err)
	}

	if err := os.MkdirAll(filepath.Join(projectPath, "notes"), os.ModePerm); err != nil {
		log.Fatalf("Failed to create project notes directory: %v", err)
	}
}

type ProjectFiles struct {
	ProjectSettings project_types.ProjectSettingsJson
	ConnectionInfo  project_types.LanguageToKernelConnectionInfo
	AllKernels      project_types.AllKernels
}

func CreateProjectFiles(projectPath string) ProjectFiles {
	// Creating tags map
	if err := tags_helper.CreateNoteToTagsMapIfNotExists(projectPath); err != nil {
		log.Fatalf("Failed to create note to tags map: %v", err)
	}

	projectSettings, err := GetProjectSettings(projectPath)

	if err != nil {
		log.Fatalf("Failed to read project settings")
	}

	connectionInfo, err := kernel_helpers.GetAllConnectionInfo(projectPath)
	if err != nil {
		log.Fatalf("Failed to read connection.json")
	}

	allKernelInfo, err := kernel_helpers.GetAllKernels(projectPath)
	if err != nil {
		log.Fatalf("Failed to read json files for kernels")
	}

	return ProjectFiles{
		ProjectSettings: projectSettings,
		ConnectionInfo:  connectionInfo,
		AllKernels:      allKernelInfo,
	}
}

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

func GetProjectSettings(projectPath string) (project_types.ProjectSettingsJson, error) {
	projectSettingsPath := filepath.Join(projectPath, "settings", "settings.json")

	// Default settings
	defaultSettings := project_types.ProjectSettingsJson{
		PinnedNotes:        []string{},
		ProjectPath:        projectPath,
		RepositoryToSyncTo: "",
		Appearance: project_types.AppearanceProjectSettingsJson{
			Theme:               "light",
			AccentColor:         "",
			EditorFontFamily:    "Bricolage Grotesque",
			NoteSidebarItemSize: "card",
		},
		Code: project_types.CodeProjectSettingsJson{
			CodeBlockVimMode:      false,
			PythonVenvPath:        "",
			CustomPythonVenvPaths: []string{},
		},
	}

	// Load or create settings file
	projectSettings, err := io_helpers.ReadOrCreateJSON(projectSettingsPath, defaultSettings)

	if err != nil {
		return projectSettings, err
	}

	projectSettings, err = UpdatePinnedNotesAndAccentColorFromProjectSettings(
		projectPath,
		projectSettings,
	)

	if err != nil {
		return projectSettings, err
	}

	return projectSettings, nil
}

func UpdatePinnedNotesAndAccentColorFromProjectSettings(
	projectPath string,
	projectSettings project_types.ProjectSettingsJson,
) (
	project_types.ProjectSettingsJson,
	error,
) {
	projectSettingsPath := filepath.Join(projectPath, "settings", "settings.json")

	// Validate pinned notes
	projectSettings.PinnedNotes = io_helpers.GetValidPinnedNotes(projectPath, projectSettings)

	// Update accent color if application is available
	app := application.Get()
	if app != nil {
		accentColor := app.GetAccentColor()
		projectSettings.Appearance.AccentColor = fmt.Sprintf("rgb(%d,%d,%d)", accentColor.R, accentColor.G, accentColor.B)
	}

	// Write the updated settings
	err := io_helpers.WriteJsonToPath(projectSettingsPath, projectSettings)

	return projectSettings, err
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
