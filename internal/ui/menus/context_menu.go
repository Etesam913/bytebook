package menus

import (
	"log"
	"net/url"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

func CreateContextMenus() {
	app := config.GetApp()
	if app == nil {
		log.Fatalf("GetApp() Error: could not get application")
		return
	}

	app.ContextMenu.Add("folder-menu", createFolderContextMenu())
	app.ContextMenu.Add("file-menu", createFileContextMenu())
}

// handleRevealInFinder handles the "Reveal In Finder" menu item click
func handleRevealInFinder(data *application.Context) {
	contextMenuData := data.ContextMenuData()
	if contextMenuData == "" {
		log.Println("No context menu data provided for reveal in finder")
		return
	}
	// URL-decode the path since it may contain encoded special characters
	// ex: single quotes are converted to double quotes from the --context-menu-data property
	decodedPath, err := url.PathUnescape(contextMenuData)
	if err != nil {
		log.Printf("Failed to decode context menu data: %v", err)
		return
	}
	projectPath, err := config.GetProjectPath()
	if err != nil {
		log.Printf("Failed to get project path: %v", err)
		return
	}
	fullPath := filepath.Join(projectPath, "notes", decodedPath)
	if err := util.RevealInFinder(fullPath); err != nil {
		log.Printf("Failed to reveal in finder: %v", err)
	}
}

// createFolderContextMenu creates the context menu for folders
func createFolderContextMenu() *application.ContextMenu {
	app := config.GetApp()

	contextMenu := app.ContextMenu.New()

	revealInFinder := contextMenu.Add("Reveal In Finder")
	revealInFinder.OnClick(handleRevealInFinder)

	renameFolder := contextMenu.Add("Rename Folder")
	renameFolder.OnClick(func(data *application.Context) {
		// TODO: Implement rename folder
	})

	moveToTrash := contextMenu.Add("Move to Trash")
	moveToTrash.OnClick(func(data *application.Context) {
		// TODO: Implement move to trash
	})

	return contextMenu
}

// createFileContextMenu creates the context menu for files/notes
func createFileContextMenu() *application.ContextMenu {
	app := config.GetApp()

	contextMenu := app.ContextMenu.New()

	revealInFinder := contextMenu.Add("Reveal In Finder")
	revealInFinder.OnClick(handleRevealInFinder)

	pinNotes := contextMenu.Add("Pin Notes")
	pinNotes.OnClick(func(data *application.Context) {
		// TODO: Implement pin notes
	})

	unpinNotes := contextMenu.Add("Unpin Notes")
	unpinNotes.OnClick(func(data *application.Context) {
		// TODO: Implement unpin notes
	})

	editTags := contextMenu.Add("Edit Tags")
	editTags.OnClick(func(data *application.Context) {
		// TODO: Implement edit tags
	})

	rename := contextMenu.Add("Rename")
	rename.OnClick(func(data *application.Context) {
		// TODO: Implement rename
	})

	moveToTrash := contextMenu.Add("Move to Trash")
	moveToTrash.OnClick(func(data *application.Context) {
		// TODO: Implement move to trash
	})

	return contextMenu
}
