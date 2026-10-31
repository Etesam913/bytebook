package util

import "github.com/wailsapp/wails/v3/pkg/application"

// Custom event names are declared here. Payloads are registered in their owning
// packages to avoid import cycles and generate typed frontend bindings.
const (
	// File events
	EventFileCreate = "file:create"
	EventFileDelete = "file:delete"
	EventFileRename = "file:rename"
	EventFileWrite  = "file:write"

	// Folder events
	EventFolderRename = "folder:rename"
	EventFolderDelete = "folder:delete"
	EventFolderCreate = "folder:create"

	// UI events
	EventZoomIn              = "zoom:in"
	EventZoomOut             = "zoom:out"
	EventZoomReset           = "zoom:reset"
	EventSettingsOpen        = "settings:open"
	EventSearchNote          = "search:note"
	EventQuickOpen           = "navigation:quick-open"
	EventCommandPaletteOpen  = "commands:open"
	EventFullscreen          = "window:fullscreen"
	EventToggleSidebar       = "sidebar:toggle"
	EventSidebarFilesOpen    = "sidebar:files:open"
	EventFileTreeFilterFocus = "file-tree:filter:focus"
	EventFileTreeContentDrop = "file-tree:content-drop"
	EventEditorContentDrop   = "editor:content-drop"
	EventFolderContentDrop   = "folder:content-drop"
	EventNavigateBack        = "navigation:back"
	EventNavigateForward     = "navigation:forward"

	// File watcher events
	EventSettingsUpdate    = "settings:update"
	EventTagsUpdate        = "tags:update"
	EventTagsIndexUpdate   = "tags:index_update"
	EventSavedSearchUpdate = "saved-search:update"
)

// A map of folderAndNoteNames to tags
type TagsUpdateEventData map[string][]string

// FolderCreateEventData represents the data structure for folder create events
type FolderCreateEventData struct {
	FolderPath string `json:"folderPath"`
}

// FolderDeleteEventData represents the data structure for folder delete events
type FolderDeleteEventData struct {
	FolderPath string `json:"folderPath"`
}

// FolderRenameEventData represents the data structure for folder rename events
type FolderRenameEventData struct {
	OldFolderPath string `json:"oldFolderPath"`
	NewFolderPath string `json:"newFolderPath"`
}

// FileCreateEventData represents the data structure for file create events
type FileCreateEventData struct {
	FilePath string `json:"filePath"`
}

// FileDeleteEventData represents the data structure for file delete events
type FileDeleteEventData struct {
	FilePath string `json:"filePath"`
}

// FileRenameEventData represents the data structure for file rename events
type FileRenameEventData struct {
	OldFilePath string `json:"oldFilePath"`
	NewFilePath string `json:"newFilePath"`
}

// FileWriteEventData represents the data structure for file write events
type FileWriteEventData struct {
	FilePath string `json:"filePath"`
	Markdown string `json:"markdown"`
}

// ContentDropEventData represents dropped OS files over a registered drop target
// (file tree, editor, or folder view).
type ContentDropEventData struct {
	DroppedFiles    []string `json:"droppedFiles"`
	TargetElementID string   `json:"targetElementId,omitempty"`
	X               int      `json:"x"`
	Y               int      `json:"y"`
}

func init() {
	// File and folder events are emitted as batches accumulated per debounce
	// cycle by the file watcher, hence the slice payloads.
	application.RegisterEvent[[]FileCreateEventData](EventFileCreate)
	application.RegisterEvent[[]FileDeleteEventData](EventFileDelete)
	application.RegisterEvent[[]FileRenameEventData](EventFileRename)
	application.RegisterEvent[[]FileWriteEventData](EventFileWrite)
	application.RegisterEvent[[]FolderCreateEventData](EventFolderCreate)
	application.RegisterEvent[[]FolderDeleteEventData](EventFolderDelete)
	application.RegisterEvent[[]FolderRenameEventData](EventFolderRename)

	application.RegisterEvent[application.Void](EventZoomIn)
	application.RegisterEvent[application.Void](EventZoomOut)
	application.RegisterEvent[application.Void](EventZoomReset)
	application.RegisterEvent[application.Void](EventSettingsOpen)
	application.RegisterEvent[application.Void](EventSearchNote)
	application.RegisterEvent[application.Void](EventQuickOpen)
	application.RegisterEvent[application.Void](EventCommandPaletteOpen)
	application.RegisterEvent[bool](EventFullscreen)
	application.RegisterEvent[application.Void](EventToggleSidebar)
	application.RegisterEvent[application.Void](EventSidebarFilesOpen)
	application.RegisterEvent[application.Void](EventFileTreeFilterFocus)
	application.RegisterEvent[ContentDropEventData](EventFileTreeContentDrop)
	application.RegisterEvent[ContentDropEventData](EventEditorContentDrop)
	application.RegisterEvent[ContentDropEventData](EventFolderContentDrop)
	application.RegisterEvent[application.Void](EventNavigateBack)
	application.RegisterEvent[application.Void](EventNavigateForward)

	application.RegisterEvent[TagsUpdateEventData](EventTagsUpdate)
	application.RegisterEvent[application.Void](EventTagsIndexUpdate)
	application.RegisterEvent[application.Void](EventSavedSearchUpdate)
}
