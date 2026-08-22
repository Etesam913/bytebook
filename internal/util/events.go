package util

import "github.com/wailsapp/wails/v3/pkg/application"

// Event name constants. Every custom Wails event used by the app is named here.
// Events whose payload types live in this package are registered in init below;
// events with payload types in other packages (config, notes, kernel_manager,
// jupyter_protocol/sockets) are registered in those packages' init functions.
// Each event must be registered exactly once — application.RegisterEvent panics
// on duplicates — and registration gives emit-time payload validation plus
// generated TypeScript typings for the frontend.
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
	EventFullscreen          = "window:fullscreen"
	EventToggleSidebar       = "sidebar:toggle"
	EventSidebarFilesOpen    = "sidebar:files:open"
	EventFileTreeFilterFocus = "file-tree:filter:focus"
	EventFileTreeContentDrop = "file-tree:content-drop"
	EventEditorContentDrop   = "editor:content-drop"

	// File watcher events
	EventSettingsUpdate    = "settings:update"
	EventTagsUpdate        = "tags:update"
	EventTagsIndexUpdate   = "tags:index_update"
	EventSavedSearchUpdate = "saved-search:update"
	EventCodeResultsUpdate = "code-results:update"

	// Kernel instance events (per-instance, not per-language)
	EventKernelInstanceCreated     = "kernel:instance:created"
	EventKernelInstanceShutdown    = "kernel:instance:shutdown"
	EventKernelInstanceStatus      = "kernel:instance:status"
	EventKernelInstanceHeartbeat   = "kernel:instance:heartbeat"
	EventKernelInstanceLaunchError = "kernel:instance:launch_error"
	EventKernelInstanceExited      = "kernel:instance:exited"

	// Code block events (scoped by messageId)
	EventCodeBlockStream        = "code:code-block:stream"
	EventCodeBlockExecuteResult = "code:code-block:execute_result"
	EventCodeBlockDisplayData   = "code:code-block:display_data"
	EventCodeBlockExecuteInput  = "code:code-block:execute_input"
	EventCodeBlockStatus        = "code:code-block:status"
	EventCodeBlockIopubError    = "code:code-block:iopub_error"
	EventCodeBlockInputRequest  = "code:code-block:input_request"
	EventCodeBlockInspectReply  = "code:code-block:inspect_reply"
	EventCodeBlockCompleteReply = "code:code-block:complete_reply"
	EventCodeBlockExecuteReply  = "code:code-block:execute_reply"
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
	Markdown string `json:"markdown,omitempty"`
}

// ContentDropEventData represents dropped OS files over a registered drop target
// (file tree or editor).
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
	application.RegisterEvent[bool](EventFullscreen)
	application.RegisterEvent[application.Void](EventToggleSidebar)
	application.RegisterEvent[application.Void](EventSidebarFilesOpen)
	application.RegisterEvent[application.Void](EventFileTreeFilterFocus)
	application.RegisterEvent[ContentDropEventData](EventFileTreeContentDrop)
	application.RegisterEvent[ContentDropEventData](EventEditorContentDrop)

	application.RegisterEvent[TagsUpdateEventData](EventTagsUpdate)
	application.RegisterEvent[application.Void](EventTagsIndexUpdate)
	application.RegisterEvent[application.Void](EventSavedSearchUpdate)
}
