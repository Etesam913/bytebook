package sockets

// Jupyter message type constants for kernel communication

// ShellSocket contains message type constants for the shell socket
var ShellSocket = struct {
	// ExecuteReply is the response to an execute_request message, containing the execution status and results
	ExecuteReply string

	// CompleteReply is the response to a complete_request message, containing code completion suggestions
	CompleteReply string

	// InspectReply is the response to an inspect_request message, containing object introspection information
	InspectReply string

	// ShutdownReply is the response to a shutdown_request message, confirming kernel shutdown
	ShutdownReply string
}{
	ExecuteReply:  "execute_reply",
	CompleteReply: "complete_reply",
	InspectReply:  "inspect_reply",
	ShutdownReply: "shutdown_reply",
}

// ControlSocket contains message type constants for the control socket
var ControlSocket = struct {
	// ShutdownReply is the response to a shutdown_request message, confirming kernel shutdown
	ShutdownReply string

	// InterruptReply is the response to an interrupt_request message, confirming that execution was interrupted
	InterruptReply string
}{
	ShutdownReply:  "shutdown_reply",
	InterruptReply: "interrupt_reply",
}

// IOPubSocket contains message type constants for the IOPub socket
var IOPubSocket = struct {
	// Stream is a streaming output message containing stdout or stderr text
	Stream string

	// ExecuteResult is a message containing the result of code execution with various MIME types
	ExecuteResult string

	// DisplayData is a message containing display data output (similar to execute_result but for display purposes)
	DisplayData string

	// ExecuteInput is a message indicating that code input was executed, containing the code and execution count
	ExecuteInput string

	// Status is a message containing kernel execution state updates (idle, busy, starting)
	Status string

	// Error is a message containing error information from code execution, including traceback
	Error string
}{
	Stream:        "stream",
	ExecuteResult: "execute_result",
	DisplayData:   "display_data",
	ExecuteInput:  "execute_input",
	Status:        "status",
	Error:         "error",
}

// StdinSocket contains message type constants for the stdin socket
var StdinSocket = struct {
	// InputRequest is a message requesting user input from stdin
	InputRequest string
}{
	InputRequest: "input_request",
}
