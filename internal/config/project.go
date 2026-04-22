package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

const PROJECT_NAME = "Bytebook"
const DefaultEditorFontSize = 14
const MinEditorFontSize = 8
const MaxEditorFontSize = 24

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
	EditorFontSize           int    `json:"editorFontSize"`
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
			EditorFontSize:           DefaultEditorFontSize,
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

	if projectSettings.Appearance.EditorFontSize <= 0 {
		projectSettings.Appearance.EditorFontSize = DefaultEditorFontSize
	}
	if projectSettings.Appearance.EditorFontSize < MinEditorFontSize {
		projectSettings.Appearance.EditorFontSize = MinEditorFontSize
	}
	if projectSettings.Appearance.EditorFontSize > MaxEditorFontSize {
		projectSettings.Appearance.EditorFontSize = MaxEditorFontSize
	}

	projectSettings = ValidateProjectSettings(projectPath, projectSettings)

	return projectSettings, nil
}

// ValidateProjectSettings validates pinned notes and updates the accent color
// in the project settings without writing to disk.
func ValidateProjectSettings(
	projectPath string,
	projectSettings ProjectSettingsJson,
) ProjectSettingsJson {
	projectSettings.PinnedNotes = GetValidPinned(projectPath, projectSettings)
	app := application.Get()
	if app != nil {
		projectSettings.Appearance.AccentColor = app.Env.GetAccentColor()
	}
	return projectSettings
}


/*
GetValidPinned returns a list of valid pinned paths.
It checks if the pinned path exists in the notes folder and returns all of the pinned paths that exist.
*/
func GetValidPinned(projectPath string, projectSettings ProjectSettingsJson) []string {
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

// updatePinnedNotesOnDisk reads settings.json, applies transform to PinnedNotes,
// and writes back only if the resulting slice differs from the original. It is
// a no-op (and returns nil) when settings.json does not exist.
func updatePinnedNotesOnDisk(projectPath string, transform func([]string) []string) error {
	settingsPath := filepath.Join(projectPath, "settings", "settings.json")

	var cfg ProjectSettingsJson
	if err := util.ReadJsonFromPath(settingsPath, &cfg); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}

	updated := transform(cfg.PinnedNotes)
	if slices.Equal(cfg.PinnedNotes, updated) {
		return nil
	}

	cfg.PinnedNotes = updated
	return util.WriteJsonToPath(settingsPath, cfg)
}

// RenamePinnedFile replaces any pinned entry equal to oldPath with newPath.
// Used for file renames (exact path equality).
func RenamePinnedFile(projectPath, oldPath, newPath string) error {
	if oldPath == "" || newPath == "" || oldPath == newPath {
		return nil
	}
	return updatePinnedNotesOnDisk(projectPath, func(pinned []string) []string {
		next := make([]string, len(pinned))
		for i, p := range pinned {
			if p == oldPath {
				next[i] = newPath
			} else {
				next[i] = p
			}
		}
		return next
	})
}

// RenamePinnedFolder rewrites pinned entries where path == oldPath OR
// path starts with oldPath + "/" to use newPath instead.
func RenamePinnedFolder(projectPath, oldPath, newPath string) error {
	if oldPath == "" || newPath == "" || oldPath == newPath {
		return nil
	}
	prefix := oldPath + "/"
	return updatePinnedNotesOnDisk(projectPath, func(pinned []string) []string {
		next := make([]string, len(pinned))
		for i, p := range pinned {
			switch {
			case p == oldPath:
				next[i] = newPath
			case strings.HasPrefix(p, prefix):
				next[i] = newPath + "/" + p[len(prefix):]
			default:
				next[i] = p
			}
		}
		return next
	})
}

// DeletePinnedFile removes any pinned entry equal to path.
func DeletePinnedFile(projectPath, path string) error {
	if path == "" {
		return nil
	}
	return updatePinnedNotesOnDisk(projectPath, func(pinned []string) []string {
		next := make([]string, 0, len(pinned))
		for _, p := range pinned {
			if p == path {
				continue
			}
			next = append(next, p)
		}
		return next
	})
}

// DeletePinnedFolder removes pinned entries where path == folderPath OR
// path starts with folderPath + "/".
func DeletePinnedFolder(projectPath, folderPath string) error {
	if folderPath == "" {
		return nil
	}
	prefix := folderPath + "/"
	return updatePinnedNotesOnDisk(projectPath, func(pinned []string) []string {
		next := make([]string, 0, len(pinned))
		for _, p := range pinned {
			if p == folderPath || strings.HasPrefix(p, prefix) {
				continue
			}
			next = append(next, p)
		}
		return next
	})
}
