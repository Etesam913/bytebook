package util

var Events = struct {
	// Note events
	NoteCreate string
	NoteDelete string
	NoteRename string
	NoteWrite  string

	// Folder events
	FolderRename string
	FolderDelete string
	FolderCreate string

	// UI events
	ZoomIn           string
	ZoomOut          string
	ZoomReset        string
	SettingsOpen     string
	SearchOpen       string
	SearchNote       string
	NewNoteMenu      string
	FolderCreateMenu string
	Fullscreen       string
	WindowReload     string
	ToggleSidebar    string

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
	// Note events
	NoteCreate: "note:create",
	NoteDelete: "note:delete",
	NoteRename: "note:rename",
	NoteWrite:  "note:write",

	// Folder events
	FolderRename: "folder:rename",
	FolderDelete: "folder:delete",
	FolderCreate: "folder:create",

	// UI events
	ZoomIn:           "zoom:in",
	ZoomOut:          "zoom:out",
	ZoomReset:        "zoom:reset",
	SettingsOpen:     "settings:open",
	SearchOpen:       "search:open",
	SearchNote:       "search:note",
	NewNoteMenu:      "note:create-dialog",
	FolderCreateMenu: "folder:create-dialog",
	Fullscreen:       "window:fullscreen",
	WindowReload:     "window:reload",
	ToggleSidebar:    "sidebar:toggle",

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
	Folder string `json:"folder"`
}

// FolderDeleteEventData represents the data structure for folder delete events
type FolderDeleteEventData struct {
	Folder string `json:"folder"`
}

// FolderRenameEventData represents the data structure for folder rename events
type FolderRenameEventData struct {
	OldFolder string `json:"oldFolder"`
	NewFolder string `json:"newFolder"`
}
