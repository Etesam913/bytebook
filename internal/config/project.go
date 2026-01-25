package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

const PROJECT_NAME = "Bytebook"

var UserHomeDir = os.UserHomeDir

type BackendResponseWithData[T any] struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    T      `json:"data"`
}

type BackendResponseWithoutData struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

type FolderAndNote struct {
	Folder string `json:"folder"`
	Note   string `json:"note"`
}

// GetProjectPath returns the path to the project directory in the user's home directory.
// On macOS, this is located in ~/Library/Application Support/Bytebook.
// It creates the parent directory if it doesn't exist.
// Returns the project path or an error if the home directory cannot be determined
// or if the directory creation fails.
func GetProjectPath() (string, error) {
	homeDir, err := UserHomeDir()
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

type NotesToTagsMap struct {
	Notes map[string][]string `json:"notes"`
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
// It creates the settings, code, tags, notes, and search directories with appropriate permissions.
// Returns an error if any directory creation fails.
func CreateProjectDirectories(projectPath string) error {
	if err := os.MkdirAll(filepath.Join(projectPath, "settings"), os.ModePerm); err != nil {
		return fmt.Errorf("failed to create project settings directory: %v", err)
	}

	if err := os.MkdirAll(filepath.Join(projectPath, "code"), os.ModePerm); err != nil {
		return fmt.Errorf("failed to create project code directory: %v", err)
	}

	if err := os.MkdirAll(filepath.Join(projectPath, "notes"), os.ModePerm); err != nil {
		return fmt.Errorf("failed to create project notes directory: %v", err)
	}

	if err := os.MkdirAll(filepath.Join(projectPath, "search"), os.ModePerm); err != nil {
		return fmt.Errorf("failed to create project search directory: %v", err)
	}

	return nil
}

type AppearanceProjectSettingsJson struct {
	Theme                    string `json:"theme"`
	AccentColor              string `json:"accentColor"`
	NoteWidth                string `json:"noteWidth"`
	EditorFontFamily         string `json:"editorFontFamily"`
	ShowEmptyLinePlaceholder bool   `json:"showEmptyLinePlaceholder"`
}

type CodeProjectSettingsJson struct {
	CodeBlockVimMode      bool     `json:"codeBlockVimMode"`
	PythonVenvPath        string   `json:"pythonVenvPath"`
	CustomPythonVenvPaths []string `json:"customPythonVenvPaths"`
}

type ProjectSettingsJson struct {
	PinnedNotes []string                      `json:"pinnedNotes"`
	ProjectPath string                        `json:"projectPath"`
	Appearance  AppearanceProjectSettingsJson `json:"appearance"`
	Code        CodeProjectSettingsJson       `json:"code"`
}

// GetProjectSettings retrieves the project settings from the settings.json file.
// If the file doesn't exist, it creates it with default settings.
// It also validates pinned notes and updates the accent color.
// Returns the project settings and any error encountered.
func GetProjectSettings(projectPath string) (ProjectSettingsJson, error) {
	projectSettingsPath := filepath.Join(projectPath, "settings", "settings.json")

	// Default settings
	defaultSettings := ProjectSettingsJson{
		PinnedNotes: []string{},
		ProjectPath: projectPath,
		Appearance: AppearanceProjectSettingsJson{
			Theme:                    "light",
			AccentColor:              "",
			EditorFontFamily:         "Bricolage Grotesque",
			ShowEmptyLinePlaceholder: true,
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

// UpdatePinnedNotesAndAccentColorFromProjectSettings validates pinned notes and updates
// the accent color in the project settings. It writes the updated settings back to the
// settings.json file and returns the updated settings along with any error encountered.
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
	app := application.Get()
	if app != nil {
		projectSettings.Appearance.AccentColor = app.Env.GetAccentColor()
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
