package services

import (
	"bytes"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"testing"

	"github.com/etesam913/bytebook/internal/apperr"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResponseMessage(t *testing.T) {
	t.Run("Preserves a wrapped user message without exposing the cause", func(t *testing.T) {
		cause := errors.New("rename /private/project/notes/note.md: permission denied")
		userErr := &apperr.UserError{Msg: "Choose another name", Err: cause}
		err := fmt.Errorf("save note: %w", userErr)

		assert.Equal(t, "Choose another name", userFacingError(err, "Could not save note"))
		assert.ErrorIs(t, err, cause)
	})

	t.Run("Preserves formatted user messages through joined errors", func(t *testing.T) {
		err := errors.Join(errors.New("internal detail"), apperr.Userf("Cannot import %s", "folder"))

		assert.Equal(t, "Cannot import folder", responseMessage(err, "Could not add attachments"))
	})

	t.Run("Logs unexpected errors and returns only the fallback", func(t *testing.T) {
		var output bytes.Buffer
		previous := log.Writer()
		log.SetOutput(&output)
		t.Cleanup(func() { log.SetOutput(previous) })
		err := errors.New("open /private/project/search/saved-searches.json: permission denied")

		assert.Equal(t, "Could not load saved searches", responseMessage(err, "Could not load saved searches"))
		assert.Contains(t, output.String(), err.Error())
	})
}

func TestSavedSearchErrorMessages(t *testing.T) {
	project := t.TempDir()
	require.NoError(t, os.Mkdir(filepath.Join(project, "search"), 0755))
	service := SearchService{ProjectPath: project}
	require.True(t, service.AddSavedSearch("Work", "tag:work").Success)

	duplicate := service.AddSavedSearch("Work", "tag:other")
	assert.False(t, duplicate.Success)
	assert.Equal(t, "saved search with name 'Work' already exists", duplicate.Message)

	missing := service.RemoveSavedSearch("Missing")
	assert.False(t, missing.Success)
	assert.Equal(t, "saved search with name 'Missing' not found", missing.Message)

	require.NoError(t, os.WriteFile(filepath.Join(project, "search", "saved-searches.json"), []byte("invalid"), 0644))
	unreadable := service.AddSavedSearch("New", "tag:new")
	assert.False(t, unreadable.Success)
	assert.Equal(t, "Could not add saved search", unreadable.Message)
}
