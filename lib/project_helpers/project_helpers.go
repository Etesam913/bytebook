package project_helpers

import (
	"crypto/rand"
	"encoding/hex"

	"os"
	"path/filepath"
	"strings"

	"github.com/etesam913/bytebook/lib/custom_events"
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

// MenuItem represents an item in the context menu
type MenuItem struct {
	Label     string
	EventName string
}

// SetupFolderContextMenu dynamically sets up the folder context menu
func CreateContextMenu(app *application.App, contextMenu *application.Menu, menuItems []MenuItem) {
	for _, item := range menuItems {
		contextMenu.Add(item.Label).OnClick(func(data *application.Context) {
			contextData, isString := data.ContextMenuData().(string)
			if isString {
				app.EmitEvent(item.EventName, contextData)
			}
		})
	}
}

func CreateNoteContextMenu(app *application.App, projectPath string, contextMenu *application.Menu, backgroundColor application.RGBA) {
	contextMenu.Add("Send To Trash").OnClick(func(data *application.Context) {
		contextData, isString := data.ContextMenuData().(string)
		if !isString {
			return
		}
		notePaths := strings.Split(contextData, ",")
		io_helpers.MoveNotesToTrash(projectPath, notePaths)
	})

	contextMenu.Add("Open Note In New Window").OnClick(func(data *application.Context) {
		contextData, isString := data.ContextMenuData().(string)
		if !isString {
			return
		}
		notePaths := strings.Split(contextData, ",")
		// Creates a new window for each note that is selected on the frontend
		for _, notePath := range notePaths {
			folderAndNote := strings.Split(notePath, "/")
			folder := folderAndNote[len(folderAndNote)-2]
			note := folderAndNote[len(folderAndNote)-1]
			dotIndex := strings.LastIndex(note, ".")
			noteNameWithoutExtension := note[:dotIndex]
			noteExtension := note[dotIndex+1:]
			// Constructs the URL for the note based on the folder and note name using the query param that the frontend can understand
			url := "/" + folder + "/" + noteNameWithoutExtension + "?ext=" + noteExtension
			custom_events.CreateWindow(app, url, backgroundColor)
		}
	})
}

func GenerateRandomID() (string, error) {
	bytes := make([]byte, 8) // Adjust the size as needed
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
