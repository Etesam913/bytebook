package main

import (
	"path/filepath"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/project_types"
)

type SettingsService struct {
	ProjectPath string
}

type SettingsResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data project_types.ProjectSettingsJson `json:"data"`
}

/*
	GetProjectSettings returns the project settings for the current project.
	If the settings file does not exist, it will be created and the default settings will be returned.
*/
func (s *SettingsService) GetProjectSettings() SettingsResponse{
	var projectSettings project_types.ProjectSettingsJson
	projectSettingsPath := filepath.Join(s.ProjectPath, "settings", "settings.json")
	err := io_helpers.ReadJsonFromPath(projectSettingsPath, &projectSettings)

	// The file does not exist
	if err != nil {
		err = io_helpers.WriteJsonToPath(projectSettingsPath,
			project_types.ProjectSettingsJson{PinnedNotes: []string{}},
		)
		if err != nil {
			return SettingsResponse{Success: false, Message: "Failed to write project settings"}
		}
		err = io_helpers.ReadJsonFromPath(projectSettingsPath, &projectSettings)
		if err != nil {
			return SettingsResponse{Success: false, Message: "Failed to read project settings"}
		}
	}
	validPinnedNotes := io_helpers.GetValidPinnedNotes(s.ProjectPath, projectSettings)
	projectSettings.PinnedNotes = validPinnedNotes
	// Write the updated project settings to the file
	io_helpers.WriteJsonToPath(projectSettingsPath, projectSettings)

	return SettingsResponse{Success: true, Message: "", Data: projectSettings}
}

func (s *SettingsService) UpdateProjectSettings(newProjectSettings project_types.ProjectSettingsJson) SettingsResponse {
	var projectSettings project_types.ProjectSettingsJson
	projectSettingsPath := filepath.Join(s.ProjectPath, "settings", "settings.json")
	err := io_helpers.ReadJsonFromPath(projectSettingsPath, &projectSettings)

	if err != nil {
		return SettingsResponse{Success: false, Message: "Failed to read project settings"}
	}
	validPinnedNotes := io_helpers.GetValidPinnedNotes(s.ProjectPath, newProjectSettings)
	newProjectSettings.PinnedNotes = validPinnedNotes
	err = io_helpers.WriteJsonToPath(projectSettingsPath, newProjectSettings)
	if err != nil {
		return SettingsResponse{Success: false, Message: "Failed to write project settings"}
	}
	return SettingsResponse{Success: true, Message: "", Data: newProjectSettings}
}
