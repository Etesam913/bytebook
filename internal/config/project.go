package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/etesam913/bytebook/lib/tags_helper"
	"github.com/wailsapp/wails/v3/pkg/application"
)

const PROJECT_NAME = "Bytebook"

func GetProjectPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("could not get user's home directory: %w", err)
	}

	// TODO: This projectPath solution only works on MacOS.
	projectPath := filepath.Join(
		homeDir,
		"Library",
		"Application Support",
		PROJECT_NAME,
	)

	// Ensure the directory exists
	if err := os.MkdirAll(filepath.Dir(projectPath), os.ModePerm); err != nil {
		return "", fmt.Errorf("could not create the dbPath directory: %w", err)
	}
	return projectPath, nil
}

type ProjectFiles struct {
	ProjectSettings ProjectSettingsJson
	ConnectionInfo  LanguageToKernelConnectionInfo
	AllKernels      AllKernels
}

// CreateProjectFiles initializes and loads all necessary project files from the given project path.
// It creates the tags map if it doesn't exist, loads project settings, connection information,
// and kernel information. Returns a ProjectFiles struct containing all loaded data or an error
// if any operation fails.
func CreateProjectFiles(projectPath string) (ProjectFiles, error) {
	// Creating tags map
	if err := tags_helper.CreateNoteToTagsMapIfNotExists(projectPath); err != nil {
		return ProjectFiles{}, fmt.Errorf("failed to create note to tags map: %w", err)
	}

	projectSettings, err := GetProjectSettings(projectPath)
	if err != nil {
		return ProjectFiles{}, fmt.Errorf("failed to read project settings: %w", err)
	}

	connectionInfo, err := GetAllConnectionInfo(projectPath)
	if err != nil {
		return ProjectFiles{}, fmt.Errorf("failed to read connection.json: %w", err)
	}

	allKernelInfo, err := GetAllKernels(projectPath)
	if err != nil {
		return ProjectFiles{}, fmt.Errorf("failed to read json files for kernels: %w", err)
	}

	return ProjectFiles{
		ProjectSettings: projectSettings,
		ConnectionInfo:  connectionInfo,
		AllKernels:      allKernelInfo,
	}, nil
}

// CreateProjectDirectories ensures all required directories exist in the project path.
// It creates the settings, code, tags, and notes directories with appropriate permissions.
// Returns an error if any directory creation fails.
func CreateProjectDirectories(projectPath string) error {
	if err := os.MkdirAll(filepath.Join(projectPath, "settings"), os.ModePerm); err != nil {
		return fmt.Errorf("failed to create project settings directory: %v", err)
	}

	if err := os.MkdirAll(filepath.Join(projectPath, "code"), os.ModePerm); err != nil {
		return fmt.Errorf("failed to create project code directory: %v", err)
	}

	if err := os.MkdirAll(filepath.Join(projectPath, "tags"), os.ModePerm); err != nil {
		return fmt.Errorf("failed to create project tags directory: %v", err)
	}

	if err := os.MkdirAll(filepath.Join(projectPath, "notes"), os.ModePerm); err != nil {
		return fmt.Errorf("failed to create project notes directory: %v", err)
	}

	return nil
}

type AppearanceProjectSettingsJson struct {
	Theme               string `json:"theme"`
	AccentColor         string `json:"accentColor"`
	NoteWidth           string `json:"noteWidth"`
	EditorFontFamily    string `json:"editorFontFamily"`
	NoteSidebarItemSize string `json:"noteSidebarItemSize"`
}

type CodeProjectSettingsJson struct {
	CodeBlockVimMode      bool     `json:"codeBlockVimMode"`
	PythonVenvPath        string   `json:"pythonVenvPath"`
	CustomPythonVenvPaths []string `json:"customPythonVenvPaths"`
}

type ProjectSettingsJson struct {
	PinnedNotes        []string                      `json:"pinnedNotes"`
	ProjectPath        string                        `json:"projectPath"`
	RepositoryToSyncTo string                        `json:"repositoryToSyncTo"`
	Appearance         AppearanceProjectSettingsJson `json:"appearance"`
	Code               CodeProjectSettingsJson       `json:"code"`
}

func GetProjectSettings(projectPath string) (ProjectSettingsJson, error) {
	projectSettingsPath := filepath.Join(projectPath, "settings", "settings.json")

	// Default settings
	defaultSettings := ProjectSettingsJson{
		PinnedNotes:        []string{},
		ProjectPath:        projectPath,
		RepositoryToSyncTo: "",
		Appearance: AppearanceProjectSettingsJson{
			Theme:               "light",
			AccentColor:         "",
			EditorFontFamily:    "Bricolage Grotesque",
			NoteSidebarItemSize: "card",
		},
		Code: CodeProjectSettingsJson{
			CodeBlockVimMode:      false,
			PythonVenvPath:        "",
			CustomPythonVenvPaths: []string{},
		},
	}

	// Load or create settings file
	projectSettings, err := util.ReadOrCreateJSON(
		projectSettingsPath,
		defaultSettings,
	)

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
	projectSettings ProjectSettingsJson,
) (
	ProjectSettingsJson,
	error,
) {
	projectSettingsPath := filepath.Join(projectPath, "settings", "settings.json")

	// Validate pinned notes
	projectSettings.PinnedNotes = GetValidPinnedNotes(projectPath, projectSettings)

	// Update accent color if application is available
	app := application.Get()
	if app != nil {
		accentColor := app.GetAccentColor()
		projectSettings.Appearance.AccentColor = fmt.Sprintf(
			"rgb(%d,%d,%d)", accentColor.R, accentColor.G, accentColor.B,
		)
	}

	// Write the updated settings
	err := util.WriteJsonToPath(projectSettingsPath, projectSettings)

	return projectSettings, err
}

/*
GetValidPinnedNotes returns a list of valid pinned notes.
It checks if the pinned note exists in the notes folder and returns all of the pinned notes that exist.
*/
func GetValidPinnedNotes(projectPath string, projectSettings ProjectSettingsJson) []string {
	validPinnedNotes := []string{}
	for _, pinnedNote := range projectSettings.PinnedNotes {
		pathToPinnedNote := filepath.Join(projectPath, "notes", pinnedNote)
		pathExists, _ := util.FileOrFolderExists(pathToPinnedNote)
		if pathExists {
			validPinnedNotes = append(validPinnedNotes, pinnedNote)
		}
	}
	return validPinnedNotes
}
