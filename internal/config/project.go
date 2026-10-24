package config

import (
	"errors"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

const PROJECT_NAME = "Bytebook"
const DefaultAccentColor = "rgb(96, 165, 250)"
const DefaultEditorFontSize = 14
const MinEditorFontSize = 8
const MaxEditorFontSize = 24
const DefaultEditorLineHeight = 2.0
const MinEditorLineHeight = 1.2
const MaxEditorLineHeight = 3.0
const DefaultCodeBlockFontSize = 13
const MinCodeBlockFontSize = 8
const MaxCodeBlockFontSize = 24
const DefaultCodeBlockLanguage = "python"

var ValidCodeBlockLanguages = []string{"python", "go", "javascript", "java", "text"}

type BackendResponseWithData[T any] struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    T      `json:"data"`
}

type BackendResponseWithoutData struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// GetProjectPath returns the macOS project path without creating any directories.
func GetProjectPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("could not get user's home directory: %w", err)
	}

	return filepath.Join(homeDir, "Library", "Application Support", PROJECT_NAME), nil
}

// InitProject creates the project directories and initializes settings and kernel descriptors.
// Returns the project path and kernel descriptors needed at startup.
func InitProject() (string, AllKernels, error) {
	projectPath, err := GetProjectPath()
	if err != nil {
		return "", AllKernels{}, err
	}

	// The kernel manager creates code/.kernels when clearing stale connection files.
	for _, directory := range []string{"settings", "code", "notes", "search"} {
		if err := os.MkdirAll(filepath.Join(projectPath, directory), os.ModePerm); err != nil {
			return "", AllKernels{}, fmt.Errorf("failed to create project %s directory: %w", directory, err)
		}
	}

	if _, err := GetProjectSettings(projectPath); err != nil {
		return "", AllKernels{}, fmt.Errorf("failed to initialize project settings: %w", err)
	}

	kernels, err := GetAllKernels(projectPath)
	if err != nil {
		return "", AllKernels{}, fmt.Errorf("failed to initialize kernel descriptors: %w", err)
	}

	return projectPath, kernels, nil
}

type SidebarVisibilitySettings struct {
	HidePinned        bool `json:"hidePinned"`
	HideRecent        bool `json:"hideRecent"`
	HideKernels       bool `json:"hideKernels"`
	HideTags          bool `json:"hideTags"`
	HideSavedSearches bool `json:"hideSavedSearches"`
}

type AppearanceProjectSettingsJson struct {
	SidebarWidth                 float64                   `json:"sidebarWidth"`
	SidebarOrder                 []string                  `json:"sidebarOrder"`
	Theme                        string                    `json:"theme"`
	AccentColor                  string                    `json:"accentColor"`
	NoteWidth                    string                    `json:"noteWidth"`
	UiFontFamily                 string                    `json:"uiFontFamily"`
	EditorFontFamily             string                    `json:"editorFontFamily"`
	EditorFontSize               int                       `json:"editorFontSize"`
	EditorLineHeight             float64                   `json:"editorLineHeight"`
	ShowEmptyLinePlaceholder     bool                      `json:"showEmptyLinePlaceholder"`
	ShowTableOfContentsByDefault bool                      `json:"showTableOfContentsByDefault"`
	SidebarVisibility            SidebarVisibilitySettings `json:"sidebarVisibility"`
}

type CodeProjectSettingsJson struct {
	CodeBlockVimMode         bool     `json:"codeBlockVimMode"`
	CodeBlockFontFamily      string   `json:"codeBlockFontFamily"`
	CodeBlockFontSize        int      `json:"codeBlockFontSize"`
	CodeBlockLineWrapping    bool     `json:"codeBlockLineWrapping"`
	CodeBlockShowLineNumbers bool     `json:"codeBlockShowLineNumbers"`
	CodeBlockDefaultLanguage string   `json:"codeBlockDefaultLanguage"`
	PythonVenvPath           string   `json:"pythonVenvPath"`
	CustomPythonVenvPaths    []string `json:"customPythonVenvPaths"`
}

type ProjectSettingsJson struct {
	PinnedNotes []string                      `json:"pinnedNotes"`
	ProjectPath string                        `json:"projectPath"`
	Appearance  AppearanceProjectSettingsJson `json:"appearance"`
	Code        CodeProjectSettingsJson       `json:"code"`
}

// SettingsFile returns the path to the project's settings file.
func SettingsFile(projectPath string) string {
	return filepath.Join(projectPath, "settings", "settings.json")
}

// LoadProjectSettings reads and normalizes existing settings without creating or writing files.
func LoadProjectSettings(projectPath string) (ProjectSettingsJson, error) {
	var settings ProjectSettingsJson
	if err := util.ReadJsonFromPath(SettingsFile(projectPath), &settings); err != nil {
		return settings, fmt.Errorf("failed to load project settings: %w", err)
	}
	return NormalizeProjectSettings(projectPath, settings), nil
}

// SaveProjectSettings normalizes and writes settings, returning the persisted values.
func SaveProjectSettings(projectPath string, settings ProjectSettingsJson) (ProjectSettingsJson, error) {
	settings = NormalizeProjectSettings(projectPath, settings)
	if err := os.MkdirAll(filepath.Dir(SettingsFile(projectPath)), 0o755); err != nil {
		return settings, fmt.Errorf("failed to create settings directory: %w", err)
	}
	if err := util.WriteJsonToPath(SettingsFile(projectPath), settings); err != nil {
		return settings, fmt.Errorf("failed to save project settings: %w", err)
	}
	return settings, nil
}

// GetProjectSettings loads settings, creating defaults only when the file is missing.
func GetProjectSettings(projectPath string) (ProjectSettingsJson, error) {
	settings, err := LoadProjectSettings(projectPath)
	if !errors.Is(err, os.ErrNotExist) {
		return settings, err
	}

	// Default settings
	defaultSettings := ProjectSettingsJson{
		PinnedNotes: []string{},
		ProjectPath: projectPath,
		Appearance: AppearanceProjectSettingsJson{
			Theme:                        "light",
			AccentColor:                  DefaultAccentColor,
			UiFontFamily:                 "ui-sans-serif",
			EditorFontFamily:             "",
			EditorFontSize:               DefaultEditorFontSize,
			EditorLineHeight:             DefaultEditorLineHeight,
			ShowEmptyLinePlaceholder:     true,
			ShowTableOfContentsByDefault: false,
			SidebarVisibility:            SidebarVisibilitySettings{},
		},
		Code: CodeProjectSettingsJson{
			CodeBlockVimMode:         false,
			CodeBlockFontFamily:      "",
			CodeBlockFontSize:        DefaultCodeBlockFontSize,
			CodeBlockLineWrapping:    false,
			CodeBlockShowLineNumbers: false,
			CodeBlockDefaultLanguage: DefaultCodeBlockLanguage,
			PythonVenvPath:           "",
			CustomPythonVenvPaths:    []string{},
		},
	}

	return SaveProjectSettings(projectPath, defaultSettings)
}

// Non-positive values represent missing settings and use the default in Go and TypeScript.
func clampOrDefault[T ~int | ~float64](value, minimum, maximum, fallback T) T {
	if value <= 0 || math.IsNaN(float64(value)) || math.IsInf(float64(value), 0) {
		return fallback
	}
	return min(maximum, max(minimum, value))
}

// NormalizeProjectSettings applies numeric bounds, language defaults, valid pins, and the system accent color.
func NormalizeProjectSettings(projectPath string, projectSettings ProjectSettingsJson) ProjectSettingsJson {
	projectSettings.Appearance.EditorFontSize = clampOrDefault(projectSettings.Appearance.EditorFontSize, MinEditorFontSize, MaxEditorFontSize, DefaultEditorFontSize)
	projectSettings.Appearance.EditorLineHeight = clampOrDefault(projectSettings.Appearance.EditorLineHeight, MinEditorLineHeight, MaxEditorLineHeight, DefaultEditorLineHeight)
	projectSettings.Code.CodeBlockFontSize = clampOrDefault(projectSettings.Code.CodeBlockFontSize, MinCodeBlockFontSize, MaxCodeBlockFontSize, DefaultCodeBlockFontSize)

	if !slices.Contains(ValidCodeBlockLanguages, projectSettings.Code.CodeBlockDefaultLanguage) {
		projectSettings.Code.CodeBlockDefaultLanguage = DefaultCodeBlockLanguage
	}

	projectSettings.PinnedNotes = ValidPinned(projectPath, projectSettings.PinnedNotes)
	app := application.Get()
	if app != nil {
		if accentColor := strings.TrimSpace(app.Env.GetAccentColor()); accentColor != "" {
			projectSettings.Appearance.AccentColor = accentColor
		}
	}
	if strings.TrimSpace(projectSettings.Appearance.AccentColor) == "" {
		projectSettings.Appearance.AccentColor = DefaultAccentColor
	}
	return projectSettings
}

// ValidPinned returns the pinned paths that still exist in the project's notes directory.
func ValidPinned(projectPath string, pinned []string) []string {
	validPinnedNotes := []string{}
	for _, pinnedNote := range pinned {
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
	settingsPath := SettingsFile(projectPath)

	// Read raw pins: a renamed source no longer exists, but still needs rewriting.
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

// RenamePinnedPath rewrites pinned entries where path == oldPath OR
// path starts with oldPath + "/" to use newPath instead.
func RenamePinnedPath(projectPath, oldPath, newPath string) error {
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

// DeletePinnedPath removes the pinned path and any pinned descendants.
func DeletePinnedPath(projectPath, path string) error {
	if path == "" {
		return nil
	}
	prefix := path + "/"
	return updatePinnedNotesOnDisk(projectPath, func(pinned []string) []string {
		next := make([]string, 0, len(pinned))
		for _, p := range pinned {
			if p == path || strings.HasPrefix(p, prefix) {
				continue
			}
			next = append(next, p)
		}
		return next
	})
}
