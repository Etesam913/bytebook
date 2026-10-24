package services

import (
	"testing"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/util"
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

func TestSettingsServiceNormalizesUpdates(t *testing.T) {
	projectPath := t.TempDir()
	service := SettingsService{ProjectPath: projectPath}
	initial := service.GetProjectSettings()
	require.True(t, initial.Success)
	settings := initial.Data
	settings.Appearance.EditorFontSize = 0
	settings.Appearance.EditorLineHeight = 10
	settings.Appearance.AccentColor = " "
	settings.Code.CodeBlockFontSize = 1
	settings.Code.CodeBlockDefaultLanguage = "ruby"
	settings.PinnedNotes = []string{"missing.md"}

	updated := service.UpdateProjectSettings(settings)

	require.True(t, updated.Success)
	assert.Equal(t, config.DefaultEditorFontSize, updated.Data.Appearance.EditorFontSize)
	assert.Equal(t, config.MaxEditorLineHeight, updated.Data.Appearance.EditorLineHeight)
	assert.Equal(t, config.DefaultAccentColor, updated.Data.Appearance.AccentColor)
	assert.Equal(t, config.MinCodeBlockFontSize, updated.Data.Code.CodeBlockFontSize)
	assert.Equal(t, config.DefaultCodeBlockLanguage, updated.Data.Code.CodeBlockDefaultLanguage)
	assert.Empty(t, updated.Data.PinnedNotes)
	var persisted config.ProjectSettingsJson
	require.NoError(t, util.ReadJsonFromPath(config.SettingsFile(projectPath), &persisted))
	assert.Equal(t, updated.Data, persisted)
	reopened := service.GetProjectSettings()
	require.True(t, reopened.Success)
	assert.Equal(t, updated.Data, reopened.Data)
}

func TestSettingsServicePersistsSidebarWidth(t *testing.T) {
	projectPath := t.TempDir()
	service := SettingsService{ProjectPath: projectPath}
	initial := service.GetProjectSettings()
	require.True(t, initial.Success)
	settings := initial.Data
	settings.Appearance.SidebarWidth = 340.5

	updated := service.UpdateProjectSettings(settings)

	require.True(t, updated.Success)
	reopened := (&SettingsService{ProjectPath: projectPath}).GetProjectSettings()
	require.True(t, reopened.Success)
	assert.Equal(t, 340.5, reopened.Data.Appearance.SidebarWidth)
}
