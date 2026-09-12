package services

import (
	"log"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/fonts"
	"github.com/etesam913/bytebook/internal/util"
)

type SettingsService struct {
	ProjectPath string
}

// GetFontFamilies returns the installed system font families.
func (s *SettingsService) GetFontFamilies() config.BackendResponseWithData[[]string] {
	families, err := fonts.Families()
	if err != nil {
		log.Printf("Failed to get font families: %v", err)
		return config.BackendResponseWithData[[]string]{Success: false, Message: "Could not load installed fonts"}
	}
	return config.BackendResponseWithData[[]string]{Success: true, Data: families}
}

/*
GetProjectSettings returns the project settings for the current project.
If the settings file does not exist, it will be created and the default settings will be returned.
*/
func (s *SettingsService) GetProjectSettings() config.BackendResponseWithData[config.ProjectSettingsJson] {
	projectSettings, err := config.GetProjectSettings(s.ProjectPath)

	if err != nil {
		return config.BackendResponseWithData[config.ProjectSettingsJson]{
			Success: false,
			Message: "Failed to create/get project settings",
		}
	}

	return config.BackendResponseWithData[config.ProjectSettingsJson]{
		Success: true,
		Data:    projectSettings,
	}
}

func (s *SettingsService) UpdateProjectSettings(
	newProjectSettings config.ProjectSettingsJson) config.BackendResponseWithData[config.ProjectSettingsJson] {
	projectSettingsPath := filepath.Join(s.ProjectPath, "settings", "settings.json")
	newProjectSettings.PinnedNotes = config.GetValidPinned(s.ProjectPath, newProjectSettings)
	err := util.WriteJsonToPath(projectSettingsPath, newProjectSettings)
	if err != nil {
		return config.BackendResponseWithData[config.ProjectSettingsJson]{
			Success: false,
			Message: "Failed to write project settings",
		}
	}
	return config.BackendResponseWithData[config.ProjectSettingsJson]{
		Success: true,
		Message: "",
		Data:    newProjectSettings,
	}
}
