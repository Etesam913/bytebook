package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSettingsServicePersistsSidebarOrder(t *testing.T) {
	projectPath := t.TempDir()
	service := SettingsService{ProjectPath: projectPath}
	initial := service.GetProjectSettings()
	require.True(t, initial.Success)
	settings := initial.Data
	settings.Appearance.SidebarOrder = []string{"tags", "files", "pinned", "recent", "kernels", "savedSearches"}

	updated := service.UpdateProjectSettings(settings)

	require.True(t, updated.Success)
	// A fresh service reads the same project settings as a newly opened window.
	reopened := (&SettingsService{ProjectPath: projectPath}).GetProjectSettings()
	require.True(t, reopened.Success)
	assert.Equal(t, settings.Appearance.SidebarOrder, reopened.Data.Appearance.SidebarOrder)
	assert.Equal(t, settings.Code, reopened.Data.Code)
}
