package services

import (
	"fmt"
	"path/filepath"

	"github.com/etesam913/bytebook/lib/git_helpers"
	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/project_helpers"
	"github.com/etesam913/bytebook/lib/project_types"
)

type SettingsService struct {
	ProjectPath string
}

/*
GetProjectSettings returns the project settings for the current project.
If the settings file does not exist, it will be created and the default settings will be returned.
*/
func (s *SettingsService) GetProjectSettings() project_types.ProjectSettingsReponse {
	projectSettings, err := project_helpers.GetProjectSettings(s.ProjectPath)

	if err != nil {
		return project_types.ProjectSettingsReponse{
			Success: false,
			Message: "Failed to create/get project settings",
		}
	}

	return project_types.ProjectSettingsReponse{
		Success: true,
		Data:    projectSettings,
	}
}

func (s *SettingsService) UpdateProjectSettings(newProjectSettings project_types.ProjectSettingsJson) project_types.ProjectSettingsReponse {
	var projectSettings project_types.ProjectSettingsJson
	projectSettingsPath := filepath.Join(s.ProjectPath, "settings", "settings.json")
	err := io_helpers.ReadJsonFromPath(projectSettingsPath, &projectSettings)

	if err != nil {
		return project_types.ProjectSettingsReponse{Success: false, Message: "Failed to read project settings"}
	}
	if newProjectSettings.RepositoryToSyncTo != projectSettings.RepositoryToSyncTo {
		isError := git_helpers.SetRepoOrigin(newProjectSettings.RepositoryToSyncTo)
		if isError {
			return project_types.ProjectSettingsReponse{Success: false, Message: fmt.Sprintf("Failed to set %s as origin", newProjectSettings.RepositoryToSyncTo)}
		}
	}
	validPinnedNotes := io_helpers.GetValidPinnedNotes(s.ProjectPath, newProjectSettings)
	newProjectSettings.PinnedNotes = validPinnedNotes
	err = io_helpers.WriteJsonToPath(projectSettingsPath, newProjectSettings)
	if err != nil {
		return project_types.ProjectSettingsReponse{Success: false, Message: "Failed to write project settings"}
	}
	return project_types.ProjectSettingsReponse{Success: true, Message: "", Data: newProjectSettings}
}
