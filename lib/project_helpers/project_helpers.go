package project_helpers

import (
	"fmt"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

func UpdatePinnedNotesAndAccentColorFromProjectSettings(
	projectPath string,
	projectSettings config.ProjectSettingsJson,
) (
	config.ProjectSettingsJson,
	error,
) {
	projectSettingsPath := filepath.Join(projectPath, "settings", "settings.json")

	// Validate pinned notes
	projectSettings.PinnedNotes = config.GetValidPinnedNotes(projectPath, projectSettings)

	// Update accent color if application is available
	app := application.Get()
	if app != nil {
		accentColor := app.GetAccentColor()
		projectSettings.Appearance.AccentColor = fmt.Sprintf("rgb(%d,%d,%d)", accentColor.R, accentColor.G, accentColor.B)
	}

	// Write the updated settings
	err := util.WriteJsonToPath(projectSettingsPath, projectSettings)

	return projectSettings, err
}
