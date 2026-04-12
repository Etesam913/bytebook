package util

var Events = struct {
	// File events
	FileCreate string
	FileDelete string
	FileRename string
	FileWrite  string

	// Folder events
	FolderRename string
	FolderDelete string
	FolderCreate string

	// UI events
	ZoomIn              string
	ZoomOut             string
	ZoomReset           string
	SettingsOpen        string
	SearchNote          string
	NewNoteMenu         string
	FolderCreateMenu    string
	Fullscreen          string
	WindowReload        string
	ToggleSidebar       string
	SidebarFilesOpen    string
	SidebarSearchOpen   string
	FileTreeContentDrop string

	// Context Menu events
	ContextMenuRename    string
	ContextMenuAddFolder string
	ContextMenuAddNote   string

	// File watcher events
	SettingsUpdate    string
	TagsUpdate        string
	TagsIndexUpdate   string
	SavedSearchUpdate string

	// Kernel/Code events
	KernelShutdownReply    string
	KernelLaunchSuccess    string
	KernelLaunchError      string
	CodeBlockStream        string
	CodeBlockExecuteResult string
	CodeBlockDisplayData   string
	CodeBlockExecuteInput  string
	KernelStatus           string
	CodeBlockStatus        string
	CodeBlockIopubError    string
	CodeBlockInputRequest  string
	KernelHeartbeat        string
}{
	// File events
	FileCreate: "file:create",
	FileDelete: "file:delete",
	FileRename: "file:rename",
	FileWrite:  "file:write",

	// Folder events
	FolderRename: "folder:rename",
	FolderDelete: "folder:delete",
	FolderCreate: "folder:create",

	// UI events
	ZoomIn:              "zoom:in",
	ZoomOut:             "zoom:out",
	ZoomReset:           "zoom:reset",
	SettingsOpen:        "settings:open",
	SearchNote:          "search:note",
	NewNoteMenu:         "note:create-dialog",
	FolderCreateMenu:    "folder:create-dialog",
	Fullscreen:          "window:fullscreen",
	WindowReload:        "window:reload",
	ToggleSidebar:       "sidebar:toggle",
	SidebarFilesOpen:    "sidebar:files:open",
	SidebarSearchOpen:   "sidebar:search:open",
	FileTreeContentDrop: "file-tree:content-drop",

	// Context Menu events
	ContextMenuRename:    "context-menu:rename",
	ContextMenuAddFolder: "context-menu:add-folder",
	ContextMenuAddNote:   "context-menu:add-note",

	// File watcher events
	SettingsUpdate:    "settings:update",
	TagsUpdate:        "tags:update",
	TagsIndexUpdate:   "tags:index_update",
	SavedSearchUpdate: "saved-search:update",

	// Kernel/Code events
	KernelShutdownReply:    "code:kernel:shutdown_reply",
	KernelLaunchSuccess:    "kernel:launch-success",
	KernelLaunchError:      "kernel:launch-error",
	CodeBlockStream:        "code:code-block:stream",
	CodeBlockExecuteResult: "code:code-block:execute_result",
	CodeBlockDisplayData:   "code:code-block:display_data",
	CodeBlockExecuteInput:  "code:code-block:execute_input",
	KernelStatus:           "code:kernel:status",
	CodeBlockStatus:        "code:code-block:status",
	CodeBlockIopubError:    "code:code-block:iopub_error",
	CodeBlockInputRequest:  "code:code-block:input_request",
	KernelHeartbeat:        "code:kernel:heartbeat",
}

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

// FileTreeContentDropEventData represents dropped OS files over file-tree targets.
type FileTreeContentDropEventData struct {
	DroppedFiles    []string `json:"droppedFiles"`
	TargetElementID string   `json:"targetElementId,omitempty"`
}
