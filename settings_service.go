package main

import (
	"path/filepath"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/project_helpers"
)

type SettingsService struct {
	ProjectPath string
}

type SettingsResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data project_helpers.ProjectSettingsJson `json:"data"`
}

func (s *SettingsService) GetProjectSettings() SettingsResponse{
	var projectSettings project_helpers.ProjectSettingsJson
	projectSettingsPath := filepath.Join(s.ProjectPath, "settings", "settings.json")
	err := io_helpers.ReadJsonFromPath(projectSettingsPath, &projectSettings)

	// The file does not exist
	if err != nil {
		err = io_helpers.WriteJsonToPath(projectSettingsPath, project_helpers.ProjectSettingsJson{PinnedNotes: []string{}})
		if err != nil {
			return SettingsResponse{Success: false, Message: "Failed to write project settings"}

		}
		err = io_helpers.ReadJsonFromPath(projectSettingsPath, &projectSettings)
		if err != nil {
			return SettingsResponse{Success: false, Message: "Failed to read project settings"}
		}
	}
	return SettingsResponse{Success: true, Message: "", Data: projectSettings}
}

func (s *SettingsService) UpdateProjectSettings(newProjectSettings project_helpers.ProjectSettingsJson) SettingsResponse {
	var projectSettings project_helpers.ProjectSettingsJson
	projectSettingsPath := filepath.Join(s.ProjectPath, "project_settings.json")
	err := io_helpers.ReadJsonFromPath(projectSettingsPath, &projectSettings)

	if err != nil {
		return SettingsResponse{Success: false, Message: "Failed to read project settings"}
	}
	err = io_helpers.WriteJsonToPath(projectSettingsPath, newProjectSettings)
	if err != nil {
		return SettingsResponse{Success: false, Message: "Failed to write project settings"}
	}
	return SettingsResponse{Success: true, Message: "", Data: newProjectSettings}
}
