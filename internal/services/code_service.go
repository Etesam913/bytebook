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
	"github.com/wailsapp/wails/v3/pkg/application"
)

type CodeService struct {
	ProjectPath                    string
	PythonSockets                  sockets.LanguageSockets
	GoSockets                      sockets.LanguageSockets
	LanguageToKernelConnectionInfo config.LanguageToKernelConnectionInfo
	AllKernels                     config.AllKernels
}

func (c *CodeService) getLanguageSockets(language string) *sockets.LanguageSockets {
	switch language {
	case "python":
		return &c.PythonSockets
	case "go":
		return &c.GoSockets
	default:
		return nil
	}
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

	sockets := c.getLanguageSockets(language)
	if sockets == nil || sockets.ShellSocketDealer == nil || sockets.IOPubSocketSubscriber == nil || sockets.HeartbeatSocketReq == nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Coding sockets are not initialized. Try turning on the kernel by using the language button at the bottom of the editor.",
		}
	}

	isHeartBeating := sockets.HeartbeatState.GetHeartbeatStatus()

	if !isHeartBeating {
		response := c.CreateSocketsAndListen(language)
		if !response.Success {
			return response
		}
		// Refresh sockets after (re)creation
		sockets = c.getLanguageSockets(language)
	}

	err = jupyter_protocol.SendExecuteRequest(
		sockets.ShellSocketDealer,
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
func (c *CodeService) SendShutdownMessage(language string, restart bool) config.BackendResponseWithoutData {
	sockets := c.getLanguageSockets(language)
	fmt.Println("sockets", sockets)
	if sockets == nil || sockets.ControlSocketDealer == nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Control socket is not initialized. Unable to shut down kernel.",
		}
	}

	isHeartBeating := sockets.HeartbeatState.GetHeartbeatStatus()
	if !isHeartBeating {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "The kernel is not running. No need to shut it down.",
		}
	}

	err := jupyter_protocol.SendShutdownMessage(
		sockets.ControlSocketDealer,
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
func (c *CodeService) SendInterruptRequest(language, codeBlockId, executionId string) config.BackendResponseWithoutData {
	sockets := c.getLanguageSockets(language)
	if sockets == nil || sockets.ControlSocketDealer == nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Control socket is not initialized. Unable to interrupt kernel.",
		}
	}

	isHeartBeating := sockets.HeartbeatState.GetHeartbeatStatus()
	if !isHeartBeating {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "The kernel is not running. No execution to interrupt.",
		}
	}

	err := jupyter_protocol.SendInterruptMessage(
		sockets.ControlSocketDealer,
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
func (c *CodeService) SendInputReply(language, codeBlockId, executionId, value string) config.BackendResponseWithoutData {
	sockets := c.getLanguageSockets(language)
	if sockets == nil || sockets.ShellSocketDealer == nil || sockets.StdinSocketDealer == nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Stdin socket is not initialized. Unable to send input reply.",
		}
	}

	// It's good practice to check if the kernel is actually running,
	// though input_reply is usually in response to an input_request from an active kernel.
	isHeartBeating := sockets.HeartbeatState.GetHeartbeatStatus()
	if !isHeartBeating {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "The kernel is not running. Cannot send input reply.",
		}
	}

	err := jupyter_protocol.SendInputReplyMessage(
		sockets.StdinSocketDealer,
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
func (c *CodeService) SendCompleteRequest(language, codeBlockId, executionId, code string, cursorPos int) config.BackendResponseWithData[SendCompleteRequestResponse] {
	sockets := c.getLanguageSockets(language)
	if sockets == nil || sockets.ShellSocketDealer == nil {
		return config.BackendResponseWithData[SendCompleteRequestResponse]{
			Success: false,
			Message: "Shell socket is not initialized. Unable to send completion request.",
			Data:    SendCompleteRequestResponse{},
		}
	}

	isHeartBeating := sockets.HeartbeatState.GetHeartbeatStatus()
	if !isHeartBeating {
		return config.BackendResponseWithData[SendCompleteRequestResponse]{
			Success: false,
			Message: "The kernel is not running. Cannot send completion request.",
			Data:    SendCompleteRequestResponse{},
		}
	}

	messageId := fmt.Sprintf("%s|%s", codeBlockId, executionId)
	err := jupyter_protocol.SendCompleteRequest(
		sockets.ShellSocketDealer,
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
func (c *CodeService) SendInspectRequest(language, codeBlockId, executionId, code string, cursorPos, detailLevel int) config.BackendResponseWithoutData {
	sockets := c.getLanguageSockets(language)
	if sockets == nil || sockets.ShellSocketDealer == nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Shell socket is not initialized. Unable to send inspection request.",
		}
	}

	isHeartBeating := sockets.HeartbeatState.GetHeartbeatStatus()
	if !isHeartBeating {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "The kernel is not running. Cannot send inspection request.",
		}
	}

	err := jupyter_protocol.SendInspectRequest(
		sockets.ShellSocketDealer,
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
func (c *CodeService) IsKernelAvailable(language string) bool {
	sockets := c.getLanguageSockets(language)
	if sockets == nil || sockets.ShellSocketDealer == nil || sockets.IOPubSocketSubscriber == nil || sockets.ControlSocketDealer == nil || sockets.HeartbeatSocketReq == nil {
		return false
	}
	return sockets.HeartbeatState.GetHeartbeatStatus()
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

	socketsStruct := c.getLanguageSockets(language)
	if socketsStruct == nil {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "Unknown language for sockets",
		}
	}

	// Function to create sockets and update CodeService properties
	createAndUpdateSockets := func() (*sockets.SocketSet, error) {
		codeServiceUpdater := sockets.CodeServiceUpdater(c)
		createdSockets, err := sockets.CreateSockets(
			socketsStruct.ShellSocketDealer,
			socketsStruct.IOPubSocketSubscriber,
			socketsStruct.HeartbeatSocketReq,
			socketsStruct.ControlSocketDealer,
			socketsStruct.StdinSocketDealer,
			language,
			connectionInfo,
			socketsStruct.Context,
			socketsStruct.Cancel,
			codeServiceUpdater,
			&socketsStruct.HeartbeatState,
		)

		if err != nil {
			return nil, err
		}

		// Update socket properties for the selected language
		socketsStruct.ShellSocketDealer = createdSockets.ShellSocketDealer
		socketsStruct.IOPubSocketSubscriber = createdSockets.IOPubSocketSubscriber
		socketsStruct.HeartbeatSocketReq = createdSockets.HeartbeatSocketReq
		socketsStruct.ControlSocketDealer = createdSockets.ControlSocketDealer
		socketsStruct.StdinSocketDealer = createdSockets.StdinSocketDealer

		return createdSockets, nil
	}

	if util.IsPortInUse(connectionInfo.ShellPort) {
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
		argv = c.AllKernels.Go.Argv
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
		app.Event.EmitEvent(&application.CustomEvent{
			Name: "kernel:launch-success",
			Data: jupyter_protocol.KernelLaunchEvent{
				Language: language,
				Data:     "",
			},
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

func (c *CodeService) ResetCodeServiceProperties(language string) *sockets.LanguageSockets {
	switch language {
	case "python":
		// Reset Python context and sockets
		newKernelCtx, newKernelCtxCancel := context.WithCancel(context.Background())
		c.PythonSockets = sockets.LanguageSockets{
			ShellSocketDealer:     nil,
			IOPubSocketSubscriber: nil,
			ControlSocketDealer:   nil,
			HeartbeatSocketReq:    nil,
			StdinSocketDealer:     nil,
			HeartbeatState: jupyter_protocol.KernelHeartbeatState{
				Mutex:  sync.RWMutex{},
				Status: false,
			},
			Context: newKernelCtx,
			Cancel:  newKernelCtxCancel,
		}
		return &c.PythonSockets
	case "go":
		// Reset Go context and sockets
		newKernelCtx, newKernelCtxCancel := context.WithCancel(context.Background())
		c.GoSockets = sockets.LanguageSockets{
			ShellSocketDealer:     nil,
			IOPubSocketSubscriber: nil,
			ControlSocketDealer:   nil,
			HeartbeatSocketReq:    nil,
			StdinSocketDealer:     nil,
			HeartbeatState: jupyter_protocol.KernelHeartbeatState{
				Mutex:  sync.RWMutex{},
				Status: false,
			},
			Context: newKernelCtx,
			Cancel:  newKernelCtxCancel,
		}
		return &c.GoSockets
	}
	return nil
}

func (c *CodeService) GetKernelInfoByLanguage(language string) *config.KernelJson {
	switch language {
	case "python":
		return &c.AllKernels.Python
	case "go":
		return &c.AllKernels.Go
	default:
		return nil
	}
}

var _ sockets.CodeServiceUpdater = (*CodeService)(nil)
