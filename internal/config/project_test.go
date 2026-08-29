package config

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func projectSettingsFixture(projectPath string) ProjectSettingsJson {
	return ProjectSettingsJson{
		PinnedNotes: []string{"notes.md"},
		ProjectPath: projectPath,
		Appearance: AppearanceProjectSettingsJson{
			Theme:            "dark",
			AccentColor:      "rgb(1, 2, 3)",
			EditorFontSize:   DefaultEditorFontSize,
			EditorLineHeight: DefaultEditorLineHeight,
		},
		Code: CodeProjectSettingsJson{
			CodeBlockFontSize:        DefaultCodeBlockFontSize,
			CodeBlockDefaultLanguage: DefaultCodeBlockLanguage,
			CustomPythonVenvPaths:    []string{"/tmp/custom-venv"},
		},
	}
}

func writeProjectSettingsFixture(
	t *testing.T,
	projectPath string,
	settings ProjectSettingsJson,
) string {
	t.Helper()

	settingsPath := filepath.Join(projectPath, "settings", "settings.json")
	require.NoError(t, os.MkdirAll(filepath.Dir(settingsPath), 0o755))
	require.NoError(t, util.WriteJsonToPath(settingsPath, settings))
	return settingsPath
}

func readProjectSettingsFixture(
	t *testing.T,
	settingsPath string,
) ProjectSettingsJson {
	t.Helper()

	var settings ProjectSettingsJson
	require.NoError(t, util.ReadJsonFromPath(settingsPath, &settings))
	return settings
}

func writePinnedSettingsFixture(
	t *testing.T,
	projectPath string,
	pinnedNotes []string,
) (ProjectSettingsJson, string) {
	t.Helper()

	settings := projectSettingsFixture(projectPath)
	settings.PinnedNotes = pinnedNotes
	return settings, writeProjectSettingsFixture(t, projectPath, settings)
}

func TestGetProjectSettings(t *testing.T) {
	t.Run("Creates default settings when the file is missing", func(t *testing.T) {
		projectPath := t.TempDir()

		settings, err := GetProjectSettings(projectPath)

		require.NoError(t, err)
		assert.Equal(t, projectPath, settings.ProjectPath)
		assert.Equal(t, "light", settings.Appearance.Theme)
		assert.Equal(t, DefaultAccentColor, settings.Appearance.AccentColor)
		assert.Equal(t, DefaultEditorFontSize, settings.Appearance.EditorFontSize)
		assert.Equal(t, DefaultEditorLineHeight, settings.Appearance.EditorLineHeight)
		assert.Equal(t, DefaultCodeBlockFontSize, settings.Code.CodeBlockFontSize)
		assert.Equal(t, DefaultCodeBlockLanguage, settings.Code.CodeBlockDefaultLanguage)
		assert.NotNil(t, settings.PinnedNotes)
		assert.NotNil(t, settings.Code.CustomPythonVenvPaths)

		persisted := readProjectSettingsFixture(
			t,
			filepath.Join(projectPath, "settings", "settings.json"),
		)
		assert.Equal(t, settings, persisted)
	})

	t.Run("Uses defaults for non-positive numeric values", func(t *testing.T) {
		projectPath := t.TempDir()
		original := projectSettingsFixture(projectPath)
		original.PinnedNotes = []string{}
		original.Appearance.EditorFontSize = 0
		original.Appearance.EditorLineHeight = 0
		original.Code.CodeBlockFontSize = 0
		settingsPath := writeProjectSettingsFixture(t, projectPath, original)

		settings, err := GetProjectSettings(projectPath)

		require.NoError(t, err)
		assert.Equal(t, DefaultEditorFontSize, settings.Appearance.EditorFontSize)
		assert.Equal(t, DefaultEditorLineHeight, settings.Appearance.EditorLineHeight)
		assert.Equal(t, DefaultCodeBlockFontSize, settings.Code.CodeBlockFontSize)
		assert.Equal(t, original, readProjectSettingsFixture(t, settingsPath))
	})

	t.Run("Clamps positive numeric values below their minima", func(t *testing.T) {
		projectPath := t.TempDir()
		original := projectSettingsFixture(projectPath)
		original.PinnedNotes = []string{}
		original.Appearance.EditorFontSize = 1
		original.Appearance.EditorLineHeight = 0.5
		original.Code.CodeBlockFontSize = 1
		writeProjectSettingsFixture(t, projectPath, original)

		settings, err := GetProjectSettings(projectPath)

		require.NoError(t, err)
		assert.Equal(t, MinEditorFontSize, settings.Appearance.EditorFontSize)
		assert.Equal(t, MinEditorLineHeight, settings.Appearance.EditorLineHeight)
		assert.Equal(t, MinCodeBlockFontSize, settings.Code.CodeBlockFontSize)
	})

	t.Run("Clamps numeric values above their maxima", func(t *testing.T) {
		projectPath := t.TempDir()
		original := projectSettingsFixture(projectPath)
		original.PinnedNotes = []string{}
		original.Appearance.EditorFontSize = MaxEditorFontSize + 1
		original.Appearance.EditorLineHeight = MaxEditorLineHeight + 1
		original.Code.CodeBlockFontSize = MaxCodeBlockFontSize + 1
		writeProjectSettingsFixture(t, projectPath, original)

		settings, err := GetProjectSettings(projectPath)

		require.NoError(t, err)
		assert.Equal(t, MaxEditorFontSize, settings.Appearance.EditorFontSize)
		assert.Equal(t, MaxEditorLineHeight, settings.Appearance.EditorLineHeight)
		assert.Equal(t, MaxCodeBlockFontSize, settings.Code.CodeBlockFontSize)
	})

	t.Run("Uses the default language when the configured language is unsupported", func(t *testing.T) {
		projectPath := t.TempDir()
		original := projectSettingsFixture(projectPath)
		original.PinnedNotes = []string{}
		original.Code.CodeBlockDefaultLanguage = "ruby"
		writeProjectSettingsFixture(t, projectPath, original)

		settings, err := GetProjectSettings(projectPath)

		require.NoError(t, err)
		assert.Equal(t, DefaultCodeBlockLanguage, settings.Code.CodeBlockDefaultLanguage)
	})

	t.Run("Returns invalid JSON without replacing it", func(t *testing.T) {
		projectPath := t.TempDir()
		settingsPath := filepath.Join(projectPath, "settings", "settings.json")
		require.NoError(t, os.MkdirAll(filepath.Dir(settingsPath), 0o755))
		invalidJSON := []byte("{invalid")
		require.NoError(t, os.WriteFile(settingsPath, invalidJSON, 0o644))

		_, err := GetProjectSettings(projectPath)

		assert.Error(t, err)
		persisted, readErr := os.ReadFile(settingsPath)
		require.NoError(t, readErr)
		assert.Equal(t, invalidJSON, persisted)
	})
}

func TestGetValidPinned(t *testing.T) {
	projectPath := t.TempDir()
	notesPath := filepath.Join(projectPath, "notes")
	require.NoError(t, os.MkdirAll(filepath.Join(notesPath, "docs"), 0o755))
	require.NoError(
		t,
		os.WriteFile(filepath.Join(notesPath, "guide.md"), []byte("# Guide"), 0o644),
	)
	settings := projectSettingsFixture(projectPath)
	settings.PinnedNotes = []string{"docs", "missing.md", "guide.md"}

	validPinned := GetValidPinned(projectPath, settings)

	assert.Equal(t, []string{"docs", "guide.md"}, validPinned)
}

func TestPinnedPathUpdates(t *testing.T) {
	t.Run("Renames an exact pinned file and preserves unrelated settings", func(t *testing.T) {
		projectPath := t.TempDir()
		original, settingsPath := writePinnedSettingsFixture(
			t,
			projectPath,
			[]string{"draft.md", "draft.md/child", "other.md"},
		)

		err := RenamePinnedFile(projectPath, "draft.md", "published.md")

		require.NoError(t, err)
		expected := original
		expected.PinnedNotes = []string{"published.md", "draft.md/child", "other.md"}
		assert.Equal(t, expected, readProjectSettingsFixture(t, settingsPath))
	})

	t.Run("Renames a pinned folder and its descendants without matching prefix siblings", func(t *testing.T) {
		projectPath := t.TempDir()
		original, settingsPath := writePinnedSettingsFixture(t, projectPath, []string{
			"work", "work/today.md", "work/archive/old.md", "work-old/note.md", "other.md",
		})

		err := RenamePinnedFolder(projectPath, "work", "projects")

		require.NoError(t, err)
		expected := original
		expected.PinnedNotes = []string{
			"projects",
			"projects/today.md",
			"projects/archive/old.md",
			"work-old/note.md",
			"other.md",
		}
		assert.Equal(t, expected, readProjectSettingsFixture(t, settingsPath))
	})

	t.Run("Deletes only an exact pinned file", func(t *testing.T) {
		projectPath := t.TempDir()
		original, settingsPath := writePinnedSettingsFixture(
			t,
			projectPath,
			[]string{"draft.md", "draft.md/child", "other.md"},
		)

		err := DeletePinnedFile(projectPath, "draft.md")

		require.NoError(t, err)
		expected := original
		expected.PinnedNotes = []string{"draft.md/child", "other.md"}
		assert.Equal(t, expected, readProjectSettingsFixture(t, settingsPath))
	})

	t.Run("Deletes a pinned folder and its descendants without matching prefix siblings", func(t *testing.T) {
		projectPath := t.TempDir()
		original, settingsPath := writePinnedSettingsFixture(t, projectPath, []string{
			"work", "work/today.md", "work/archive/old.md", "work-old/note.md", "other.md",
		})

		err := DeletePinnedFolder(projectPath, "work")

		require.NoError(t, err)
		expected := original
		expected.PinnedNotes = []string{"work-old/note.md", "other.md"}
		assert.Equal(t, expected, readProjectSettingsFixture(t, settingsPath))
	})

	t.Run("Succeeds when the settings file is missing", func(t *testing.T) {
		projectPath := t.TempDir()
		settingsPath := filepath.Join(projectPath, "settings", "settings.json")

		err := RenamePinnedFolder(projectPath, "work", "projects")

		assert.NoError(t, err)
		assert.NoFileExists(t, settingsPath)
	})

	t.Run("Returns malformed settings without replacing them", func(t *testing.T) {
		projectPath := t.TempDir()
		settingsPath := filepath.Join(projectPath, "settings", "settings.json")
		require.NoError(t, os.MkdirAll(filepath.Dir(settingsPath), 0o755))
		invalidJSON := []byte("{invalid")
		require.NoError(t, os.WriteFile(settingsPath, invalidJSON, 0o644))

		err := DeletePinnedFile(projectPath, "notes.md")

		assert.Error(t, err)
		persisted, readErr := os.ReadFile(settingsPath)
		require.NoError(t, readErr)
		assert.Equal(t, invalidJSON, persisted)
	})
}
