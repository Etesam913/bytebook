package util

var Events = struct {
	// Note events
	NoteCreated string
	NoteDeleted string

	// UI events
	ZoomIn  string
	ZoomOut string

	// File watcher events
	SettingsUpdate string
	TagsUpdate     string
	NotesFolder    string
	TagsFolder     string

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

	// Auth events
	AuthAccessToken string
}{
	// Note events
	NoteCreated: "note.created",
	NoteDeleted: "note.deleted",

	// UI events
	ZoomIn:  "zoom:in",
	ZoomOut: "zoom:out",

	// File watcher events
	SettingsUpdate: "settings:update",
	TagsUpdate:     "tags:update",
	NotesFolder:    "notes-folder",
	TagsFolder:     "tags-folder",

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

	// Auth events
	AuthAccessToken: "auth:access-token",
}
