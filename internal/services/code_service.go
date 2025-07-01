package services

import (
	"context"
	"fmt"
	"log"
	"path/filepath"
	"sync"
	"time"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/jupyter_protocol"
	"github.com/etesam913/bytebook/internal/jupyter_protocol/sockets"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/pebbe/zmq4"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type CodeService struct {
	ProjectPath                    string
	Context                        context.Context
	Cancel                         context.CancelFunc
	ShellSocketDealer              *zmq4.Socket
	IOPubSocketSubscriber          *zmq4.Socket
	ControlSocketDealer            *zmq4.Socket
	HeartbeatSocketReq             *zmq4.Socket
	StdinSocketDealer              *zmq4.Socket
	HeartbeatState                 jupyter_protocol.KernelHeartbeatState
	LanguageToKernelConnectionInfo config.LanguageToKernelConnectionInfo
	AllKernels                     config.AllKernels
}

func (c *CodeService) SendExecuteRequest(codeBlockId, executionId, language, code string) config.BackendResponseWithoutData {
	projectSettings, err := config.GetProjectSettings(c.ProjectPath)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Failed to get project settings. Please check if the settings.json file exists.",
		}
	}

	if !util.IsVirtualEnv(projectSettings.Code.PythonVenvPath) {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "A virtual environment is not set. A virtual environment can be configured in the \"Code Block\" section of the settings.",
		}
	}

	if c.ShellSocketDealer == nil || c.IOPubSocketSubscriber == nil || c.HeartbeatSocketReq == nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Coding sockets are not initialized. Try turning on the kernel by using the language button at the bottom of the editor.",
		}
	}

	isHeartBeating := c.HeartbeatState.GetHeartbeatStatus()

	if !isHeartBeating {
		response := c.CreateSocketsAndListen(language)
		if !response.Success {
			return response
		}
	}

	err = jupyter_protocol.SendExecuteRequest(
		c.ShellSocketDealer,
		jupyter_protocol.ExecuteMessageParams{
			MessageParams: jupyter_protocol.MessageParams{
				MessageID: fmt.Sprintf("%s|%s", codeBlockId, executionId),
				SessionID: "current-session",
			},
			Code: code,
		},
	)

	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to send execute request: %v", err),
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Execute request sent successfully",
	}
}

// SendShutdownMessage sends a shutdown request to the kernel with an option to restart
func (c *CodeService) SendShutdownMessage(restart bool) config.BackendResponseWithoutData {
	if c.ControlSocketDealer == nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Control socket is not initialized. Unable to shut down kernel.",
		}
	}

	isHeartBeating := c.HeartbeatState.GetHeartbeatStatus()
	if !isHeartBeating {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "The kernel is not running. No need to shut it down.",
		}
	}

	err := jupyter_protocol.SendShutdownMessage(
		c.ControlSocketDealer,
		jupyter_protocol.ShutdownMessageParams{
			MessageParams: jupyter_protocol.MessageParams{
				MessageID: fmt.Sprintf("shutdown-%d", time.Now().UnixNano()),
				SessionID: "current-session",
			},
			Restart: restart,
		},
	)

	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to send shutdown request: %v", err),
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: fmt.Sprintf("Kernel shutdown request sent successfully (restart: %v)", restart),
	}
}

// SendInterruptRequest sends an interrupt request to the kernel to stop the currently executing code
func (c *CodeService) SendInterruptRequest(codeBlockId, executionId string) config.BackendResponseWithoutData {
	if c.ControlSocketDealer == nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Control socket is not initialized. Unable to interrupt kernel.",
		}
	}

	isHeartBeating := c.HeartbeatState.GetHeartbeatStatus()
	if !isHeartBeating {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "The kernel is not running. No execution to interrupt.",
		}
	}

	err := jupyter_protocol.SendInterruptMessage(
		c.ControlSocketDealer,
		jupyter_protocol.MessageParams{
			MessageID: fmt.Sprintf("%s|%s", codeBlockId, executionId),
			SessionID: "current-session",
		},
	)

	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to send interrupt request: %v", err),
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Kernel interrupt request sent successfully",
	}
}

// SendInputReply sends an input_reply message to the kernel.
func (c *CodeService) SendInputReply(codeBlockId, executionId, value string) config.BackendResponseWithoutData {
	if c.ShellSocketDealer == nil || c.StdinSocketDealer == nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Stdin socket is not initialized. Unable to send input reply.",
		}
	}

	// It's good practice to check if the kernel is actually running,
	// though input_reply is usually in response to an input_request from an active kernel.
	isHeartBeating := c.HeartbeatState.GetHeartbeatStatus()
	if !isHeartBeating {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "The kernel is not running. Cannot send input reply.",
		}
	}

	err := jupyter_protocol.SendInputReplyMessage(
		c.StdinSocketDealer,
		jupyter_protocol.InputReplyMessageParams{
			MessageParams: jupyter_protocol.MessageParams{
				MessageID: fmt.Sprintf("%s|%s", codeBlockId, executionId),
				SessionID: "current-session",
			},
			Value: value,
		},
	)

	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to send input reply: %v", err),
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Input reply sent successfully",
	}
}

type SendCompleteRequestResponse struct {
	MessageId *string `json:"messageId"`
}

// SendCompleteRequest sends a complete_request message to the kernel.
func (c *CodeService) SendCompleteRequest(codeBlockId, executionId, code string, cursorPos int) config.BackendResponseWithData[SendCompleteRequestResponse] {
	if c.ShellSocketDealer == nil {
		return config.BackendResponseWithData[SendCompleteRequestResponse]{
			Success: false,
			Message: "Shell socket is not initialized. Unable to send completion request.",
			Data:    SendCompleteRequestResponse{},
		}
	}

	isHeartBeating := c.HeartbeatState.GetHeartbeatStatus()
	if !isHeartBeating {
		return config.BackendResponseWithData[SendCompleteRequestResponse]{
			Success: false,
			Message: "The kernel is not running. Cannot send completion request.",
			Data:    SendCompleteRequestResponse{},
		}
	}

	messageId := fmt.Sprintf("%s|%s", codeBlockId, executionId)
	err := jupyter_protocol.SendCompleteRequest(
		c.ShellSocketDealer,
		jupyter_protocol.CompleteRequestParams{
			MessageParams: jupyter_protocol.MessageParams{
				MessageID: messageId,
				SessionID: "current-session",
			},
			Code:      code,
			CursorPos: cursorPos,
		},
	)

	if err != nil {
		return config.BackendResponseWithData[SendCompleteRequestResponse]{
			Success: false,
			Message: fmt.Sprintf("Failed to send completion request: %v", err),
			Data:    SendCompleteRequestResponse{},
		}
	}

	return config.BackendResponseWithData[SendCompleteRequestResponse]{
		Success: true,
		Message: "Completion request sent successfully",
		Data: SendCompleteRequestResponse{
			MessageId: &messageId,
		},
	}
}

// SendInspectRequest sends an inspect_request message to the kernel.
func (c *CodeService) SendInspectRequest(codeBlockId, executionId, code string, cursorPos, detailLevel int) config.BackendResponseWithoutData {
	if c.ShellSocketDealer == nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Shell socket is not initialized. Unable to send inspection request.",
		}
	}

	isHeartBeating := c.HeartbeatState.GetHeartbeatStatus()
	if !isHeartBeating {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "The kernel is not running. Cannot send inspection request.",
		}
	}

	err := jupyter_protocol.SendInspectRequest(
		c.ShellSocketDealer,
		jupyter_protocol.InspectRequestParams{
			MessageParams: jupyter_protocol.MessageParams{
				MessageID: fmt.Sprintf("%s|%s", codeBlockId, executionId),
				SessionID: "current-session",
			},
			Code:        code,
			CursorPos:   cursorPos,
			DetailLevel: detailLevel,
		},
	)

	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to send inspection request: %v", err),
		}
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Inspection request sent successfully",
	}
}

// IsKernelAvailable returns true if the kernel sockets are initialized
// and the heartbeat is currently active.
func (c *CodeService) IsKernelAvailable() bool {
	// First, make sure all sockets have been wired up
	if c.ShellSocketDealer == nil ||
		c.IOPubSocketSubscriber == nil ||
		c.ControlSocketDealer == nil ||
		c.HeartbeatSocketReq == nil {
		return false
	}
	// Then check that the heartbeat state reports "alive"
	return c.HeartbeatState.GetHeartbeatStatus()
}

func (c *CodeService) CreateSocketsAndListen(language string) config.BackendResponseWithoutData {
	projectSettings, err := config.GetProjectSettings(c.ProjectPath)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Failed to retrieve project settings. Check if settings.json exists.",
		}
	}
	venvPath := ""
	if language == "python" {
		venvPath = projectSettings.Code.PythonVenvPath

		if !util.IsVirtualEnv(venvPath) {
			return config.BackendResponseWithoutData{
				Success: false,
				Message: "A virtual environment is not set. A virtual environment can be configured in the \"Code Block\" section of the settings.",
			}
		}
	}

	connectionInfo, err := config.GetConnectionInfoFromLanguage(c.ProjectPath, language)
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: err.Error(),
		}
	}

	// Function to create sockets and update CodeService properties
	createAndUpdateSockets := func() (*sockets.SocketSet, error) {
		codeServiceUpdater := sockets.CodeServiceUpdater(c)
		createdSockets, err := sockets.CreateSockets(
			c.ShellSocketDealer,
			c.IOPubSocketSubscriber,
			c.HeartbeatSocketReq,
			c.ControlSocketDealer,
			c.StdinSocketDealer,
			language,
			connectionInfo,
			c.Context,
			c.Cancel,
			codeServiceUpdater,
			&c.HeartbeatState,
		)

		if err != nil {
			return nil, err
		}

		// Update CodeService socket properties
		c.ShellSocketDealer = createdSockets.ShellSocketDealer
		c.IOPubSocketSubscriber = createdSockets.IOPubSocketSubscriber
		c.HeartbeatSocketReq = createdSockets.HeartbeatSocketReq
		c.ControlSocketDealer = createdSockets.ControlSocketDealer
		c.StdinSocketDealer = createdSockets.StdinSocketDealer

		return createdSockets, nil
	}

	if util.IsPortInUse(connectionInfo.ShellPort) {
		// Still have to make sure that the sockets exist
		_, err := createAndUpdateSockets()
		if err != nil {
			return config.BackendResponseWithoutData{
				Success: false,
				Message: err.Error(),
			}
		}

		return config.BackendResponseWithoutData{
			Success: true,
			Message: fmt.Sprintf(
				"Something is already running on the port: %d",
				connectionInfo.ShellPort,
			),
		}
	}

	pathToConnectionFile := filepath.Join(c.ProjectPath, "code", fmt.Sprintf("%s-connection.json", language))
	if fileExists, _ := util.FileOrFolderExists(pathToConnectionFile); !fileExists {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Connection file for %s not found", language),
		}
	}

	var argv []string

	switch language {
	case "python":
		argv = c.AllKernels.Python.Argv
	case "go":
		argv = c.AllKernels.Golang.Argv
	default:
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Couldn't get launch command for language",
		}
	}

	// Start up the kernel
	err = jupyter_protocol.LaunchKernel(
		argv,
		pathToConnectionFile,
		language,
		venvPath,
	)

	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to launch kernel: %v", err),
		}
	}

	log.Println("🟩 launched kernel")

	_, err = createAndUpdateSockets()
	if err != nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: err.Error(),
		}
	}

	app := application.Get()
	if app != nil {
		app.EmitEvent("kernel:launch-success", jupyter_protocol.KernelLaunchEvent{
			Language: language,
			Data:     "",
		})
	}

	return config.BackendResponseWithoutData{
		Success: true,
		Message: "Sockets created and listening...",
	}
}

// GetPythonVirtualEnvironments retrieves the paths to all Python virtual environments in the project code directory.
func (c *CodeService) GetPythonVirtualEnvironments() config.BackendResponseWithData[[]string] {
	projectSettings, err := config.GetProjectSettings(c.ProjectPath)
	if err != nil {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: "Failed to retrieve project settings",
			Data:    []string{},
		}
	}

	virtualEnvironmentPaths, err := config.GetPythonVirtualEnvironments(
		c.ProjectPath,
		projectSettings.Code.CustomPythonVenvPaths,
	)
	if err != nil {
		return config.BackendResponseWithData[[]string]{
			Success: false,
			Message: err.Error(),
			Data:    []string{},
		}
	}
	return config.BackendResponseWithData[[]string]{
		Success: true,
		Message: "Successfully got virtual environment paths",
		Data:    virtualEnvironmentPaths,
	}
}
func (c *CodeService) IsPathAValidVirtualEnvironment(path string) config.BackendResponseWithoutData {
	if path == "" {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "The provided path is empty. Please provide a valid path to a virtual environment.",
		}
	}

	if util.IsVirtualEnv(path) {
		return config.BackendResponseWithoutData{
			Success: true,
			Message: fmt.Sprintf("%s is a valid virtual environment", path),
		}
	}

	return config.BackendResponseWithoutData{
		Success: false,
		Message: fmt.Sprintf("%s is not a valid virtual environment as a pyvenv.cfg could not be found", path),
	}
}

// ChooseCustomVirtualEnvironmentPath opens a file dialog for the user to select a custom Python virtual environment path.
func (c *CodeService) ChooseCustomVirtualEnvironmentPath() config.BackendResponseWithData[string] {
	localFilePath, err := application.OpenFileDialog().CanChooseDirectories(true).CanChooseFiles(false).PromptForSingleSelection()

	if err != nil {
		return config.BackendResponseWithData[string]{
			Success: false,
			Data:    "",
			Message: "Failed to open file dialog",
		}
	}

	return config.BackendResponseWithData[string]{
		Success: true,
		Data:    localFilePath,
		Message: "Successfully selected virtual environment",
	}
}

func (c *CodeService) ResetCodeServiceProperties() {
	newKernelCtx, newKernelCtxCancel := context.WithCancel(context.Background())
	c.Context = newKernelCtx
	c.Cancel = newKernelCtxCancel
	c.ShellSocketDealer = nil
	c.IOPubSocketSubscriber = nil
	c.ControlSocketDealer = nil
	c.HeartbeatSocketReq = nil
	c.HeartbeatState = jupyter_protocol.KernelHeartbeatState{
		Mutex:  sync.RWMutex{},
		Status: false,
	}
}

var _ sockets.CodeServiceUpdater = (*CodeService)(nil)
