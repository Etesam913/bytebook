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

// handleMoveToTrash handles the "Move to Trash" menu item click
func handleMoveToTrash(data *application.Context) {
	contextMenuData := data.ContextMenuData()
	if contextMenuData == "" {
		log.Println("No context menu data provided for move to trash")
		return
	}
	// URL-decode the path since it may contain encoded special characters
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
	if err := util.MoveToTrash(fullPath); err != nil {
		log.Printf("Failed to move to trash: %v", err)
	}
}

// createFolderContextMenu creates the context menu for folders
func createFolderContextMenu() *application.ContextMenu {
	app := config.GetApp()

	contextMenu := app.ContextMenu.New()

	revealInFinder := contextMenu.Add("Reveal in Finder")
	revealInFinder.OnClick(handleRevealInFinder)

	addFolder := contextMenu.Add("Add folder")
	addFolder.OnClick(func(data *application.Context) {
		// TODO: Implement add folder
	})

	addNote := contextMenu.Add("Add note")
	addNote.OnClick(func(data *application.Context) {
		// TODO: Implement add note
	})

	renameFolder := contextMenu.Add("Rename")
	renameFolder.OnClick(func(data *application.Context) {
		// TODO: Implement rename folder
	})

	moveToTrash := contextMenu.Add("Move to trash")
	moveToTrash.OnClick(handleMoveToTrash)

	return contextMenu
}

// createFileContextMenu creates the context menu for files/notes
func createFileContextMenu() *application.ContextMenu {
	app := config.GetApp()

	contextMenu := app.ContextMenu.New()

	revealInFinder := contextMenu.Add("Reveal in Finder")
	revealInFinder.OnClick(handleRevealInFinder)

	pinNotes := contextMenu.Add("Pin note")
	pinNotes.OnClick(func(data *application.Context) {
		// TODO: Implement pin notes
	})

	// unpinNotes := contextMenu.Add("Unpin note")
	// unpinNotes.OnClick(func(data *application.Context) {
	// 	// TODO: Implement unpin notes
	// })

	editTags := contextMenu.Add("Edit tags")
	editTags.OnClick(func(data *application.Context) {
		// TODO: Implement edit tags
	})

	rename := contextMenu.Add("Rename note")
	rename.OnClick(func(data *application.Context) {
		// TODO: Implement rename
	})

	moveToTrash := contextMenu.Add("Move to trash")
	moveToTrash.OnClick(handleMoveToTrash)

	return contextMenu
}
