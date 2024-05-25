package project_helpers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/wailsapp/wails/v3/pkg/application"
)

const ProjectName = "Bytebook"

func GetProjectPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "Could not get user's home directory", err
	}

	// Customize the folder and database name as needed
	var projectPath string

	err = io_helpers.CompleteCustomActionForOS(
		io_helpers.ActionStruct{
			WindowsAction: func() {
				projectPath = filepath.Join(homeDir, "AppData", "Local", ProjectName)
			},
			MacAction: func() {
				projectPath = filepath.Join(homeDir, "Library", "Application Support", ProjectName)
			},
			LinuxAction: func() {
				projectPath = filepath.Join(homeDir, ".local", "share", ProjectName)
			},
		},
	)

	if err != nil {
		return "Could not get the project path", err
	}
	// Ensure the directory exists
	if err := os.MkdirAll(filepath.Dir(projectPath), os.ModePerm); err != nil {
		return "Could not create the dbPath directory", err
	}
	return projectPath, nil
}

// SetupFolderContextMenu dynamically sets up the folder context menu
func CreateContextMenu(app *application.App, contextMenu *application.Menu, menuItems []MenuItem) {
	for _, item := range menuItems {
		contextMenu.Add(item.Label).OnClick(func(data *application.Context) {
			contextData, isString := data.ContextMenuData().(string)
			if isString {
				app.Events.Emit(&application.WailsEvent{
					Name: item.EventName,
					Data: contextData,
				})
			}
		})
	}
}

func GenerateRandomID() (string, error) {
	bytes := make([]byte, 8) // Adjust the size as needed
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// MenuItem represents an item in the context menu
type MenuItem struct {
	Label     string
	EventName string
}

// Pop removes and returns the last element of the slice.
func Pop[T any](slice []T) ([]T, T, error) {
	if len(slice) == 0 {
		var zeroValue T
		return nil, zeroValue, fmt.Errorf("cannot pop from an empty slice")
	}
	lastIndex := len(slice) - 1
	element := slice[lastIndex]
	slice = slice[:lastIndex]
	return slice, element, nil
}
