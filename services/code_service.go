package services

import (
	"context"
	"fmt"
	"log"
	"path/filepath"
	"sync"
	"time"

	"github.com/etesam913/bytebook/lib/contracts"
	"github.com/etesam913/bytebook/lib/kernel_helpers"
	"github.com/etesam913/bytebook/lib/messaging"
	"github.com/etesam913/bytebook/lib/project_helpers"
	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/etesam913/bytebook/lib/sockets"
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
	HeartbeatState                 kernel_helpers.KernelHeartbeatState
	LanguageToKernelConnectionInfo project_types.LanguageToKernelConnectionInfo
	AllKernels                     project_types.AllKernels
}

func (c *CodeService) SendExecuteRequest(codeBlockId, executionId, language, code string) project_types.BackendResponseWithoutData {
	if c.ShellSocketDealer == nil || c.IOPubSocketSubscriber == nil || c.HeartbeatSocketReq == nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: "Coding sockets are not initialized. Try turning on the kernel by using the language button at the bottom of the editor.",
		}
	}

	isHeartBeating := c.HeartbeatState.GetHeartbeatStatus()

	if !isHeartBeating {
		// Try to initialize kernel here
		projectSettings, err := project_helpers.GetProjectSettings(c.ProjectPath)

		if err != nil {
			return project_types.BackendResponseWithoutData{
				Success: false,
				Message: fmt.Sprintf("The %s kernel is not initialized. Try turning on the kernel by using the language button at the bottom of the editor.", language),
			}
		}

		response := c.CreateSocketsAndListen(language, projectSettings.Code.PythonVenvPath)

		if !response.Success {
			return project_types.BackendResponseWithoutData{
				Success: false,
				Message: response.Message,
			}
		}

	}

	err := messaging.SendExecuteRequest(
		c.ShellSocketDealer,
		messaging.ExecuteMessageParams{
			MessageParams: messaging.MessageParams{
				MessageID: fmt.Sprintf("%s:%s", codeBlockId, executionId),
				SessionID: "current-session",
			},
			Code: code,
		},
	)

	if err != nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to send execute request: %v", err),
		}
	}

	return project_types.BackendResponseWithoutData{
		Success: true,
		Message: "Execute request sent successfully",
	}
}

// SendShutdownMessage sends a shutdown request to the kernel with an option to restart
func (c *CodeService) SendShutdownMessage(restart bool) project_types.BackendResponseWithoutData {
	if c.ControlSocketDealer == nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: "Control socket is not initialized. Unable to shut down kernel.",
		}
	}

	isHeartBeating := c.HeartbeatState.GetHeartbeatStatus()
	if !isHeartBeating {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: "The kernel is not running. No need to shut it down.",
		}
	}

	err := messaging.SendShutdownMessage(
		c.ControlSocketDealer,
		messaging.ShutdownMessageParams{
			MessageParams: messaging.MessageParams{
				MessageID: fmt.Sprintf("shutdown-%d", time.Now().UnixNano()),
				SessionID: "current-session",
			},
			Restart: restart,
		},
	)

	if err != nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to send shutdown request: %v", err),
		}
	}

	return project_types.BackendResponseWithoutData{
		Success: true,
		Message: fmt.Sprintf("Kernel shutdown request sent successfully (restart: %v)", restart),
	}
}

// SendInterruptRequest sends an interrupt request to the kernel to stop the currently executing code
func (c *CodeService) SendInterruptRequest(codeBlockId, executionId string) project_types.BackendResponseWithoutData {
	if c.ControlSocketDealer == nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: "Control socket is not initialized. Unable to interrupt kernel.",
		}
	}

	isHeartBeating := c.HeartbeatState.GetHeartbeatStatus()
	if !isHeartBeating {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: "The kernel is not running. No execution to interrupt.",
		}
	}

	err := messaging.SendInterruptMessage(
		c.ControlSocketDealer,
		messaging.MessageParams{
			MessageID: fmt.Sprintf("%s:%s", codeBlockId, executionId),
			SessionID: "current-session",
		},
	)

	if err != nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to send interrupt request: %v", err),
		}
	}

	return project_types.BackendResponseWithoutData{
		Success: true,
		Message: "Kernel interrupt request sent successfully",
	}
}

func (c *CodeService) CreateSocketsAndListen(language, venvPath string) project_types.BackendResponseWithoutData {
	if !kernel_helpers.IsVirtualEnv(venvPath) {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: "A virtual environment is not set. A virtual environment can be configured in the \"Code Block\" section of the settings.",
		}
	}

	codeServiceUpdater := contracts.CodeServiceUpdater(c)
	connectionInfo, err := kernel_helpers.GetConnectionInfoFromLanguage(c.ProjectPath, language)
	if err != nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: err.Error(),
		}
	}

	if kernel_helpers.IsPortInUse(connectionInfo.ShellPort) {
		// Still have to make sure that the sockets exist
		createdSockets, err := sockets.CreateSockets(
			c.ShellSocketDealer,
			c.IOPubSocketSubscriber,
			c.HeartbeatSocketReq,
			c.ControlSocketDealer,
			language,
			connectionInfo,
			c.Context,
			c.Cancel,
			codeServiceUpdater,
			&c.HeartbeatState,
		)

		if err != nil {
			return project_types.BackendResponseWithoutData{
				Success: false,
				Message: err.Error(),
			}
		}

		c.ShellSocketDealer = createdSockets.ShellSocketDealer
		c.IOPubSocketSubscriber = createdSockets.IOPubSocketSubscriber
		c.HeartbeatSocketReq = createdSockets.HeartbeatSocketReq
		c.ControlSocketDealer = createdSockets.ControlSocketDealer

		return project_types.BackendResponseWithoutData{
			Success: true,
			Message: fmt.Sprintf(
				"Something is already running on the port: %d",
				connectionInfo.ShellPort,
			),
		}
	}
	projectSettings, err := project_helpers.GetProjectSettings(c.ProjectPath)

	pathToConnectionFile := filepath.Join(c.ProjectPath, "code", "connection.json")

	// Start up the kernel
	err = kernel_helpers.LaunchKernel(
		c.AllKernels.Python.Argv,
		pathToConnectionFile,
		"python",
		projectSettings.Code.PythonVenvPath,
	)

	if err != nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to launch kernel: %v", err),
		}
	}

	log.Println("🟩 launched kernel")

	createdSockets, err := sockets.CreateSockets(
		c.ShellSocketDealer,
		c.IOPubSocketSubscriber,
		c.HeartbeatSocketReq,
		c.ControlSocketDealer,
		language,
		connectionInfo,
		c.Context,
		c.Cancel,
		codeServiceUpdater,
		&c.HeartbeatState,
	)

	if err != nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: err.Error(),
		}
	}

	c.ShellSocketDealer = createdSockets.ShellSocketDealer
	c.IOPubSocketSubscriber = createdSockets.IOPubSocketSubscriber
	c.HeartbeatSocketReq = createdSockets.HeartbeatSocketReq
	c.ControlSocketDealer = createdSockets.ControlSocketDealer
	app := application.Get()
	if app != nil {
		app.EmitEvent("kernel:launch-success", project_types.KernelLaunchEventType{
			Language: language,
			Data:     "",
		})
	}

	return project_types.BackendResponseWithoutData{
		Success: true,
		Message: "Sockets created and listening...",
	}
}

// GetPythonVirtualEnvironments retrieves the paths to all Python virtual environments in the project code directory.
func (c *CodeService) GetPythonVirtualEnvironments() project_types.BackendResponseWithData[[]string] {
	virtualEnvironmentPaths, err := kernel_helpers.GetPythonVirtualEnvironments(c.ProjectPath)
	if err != nil {
		return project_types.BackendResponseWithData[[]string]{
			Success: false,
			Message: err.Error(),
			Data:    []string{},
		}
	}
	return project_types.BackendResponseWithData[[]string]{
		Success: true,
		Message: "Successfully got virtual environment paths",
		Data:    virtualEnvironmentPaths,
	}
}
func (c *CodeService) IsPathAValidVirtualEnvironment(path string) project_types.BackendResponseWithoutData {
	if path == "" {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: "The provided path is empty. Please provide a valid path to a virtual environment.",
		}
	}

	if kernel_helpers.IsVirtualEnv(path) {
		return project_types.BackendResponseWithoutData{
			Success: true,
			Message: fmt.Sprintf("%s is a valid virtual environment", path),
		}
	}

	return project_types.BackendResponseWithoutData{
		Success: false,
		Message: fmt.Sprintf("%s is not a valid virtual environment as a pyvenv.cfg could not be found", path),
	}
}

// ChooseCustomVirtualEnvironmentPath opens a file dialog for the user to select a custom Python virtual environment path.
func (c *CodeService) ChooseCustomVirtualEnvironmentPath() project_types.BackendResponseWithData[string] {
	localFilePath, err := application.OpenFileDialog().CanChooseDirectories(true).CanChooseFiles(false).PromptForSingleSelection()

	if err != nil {
		return project_types.BackendResponseWithData[string]{
			Success: false,
			Data:    "",
			Message: "Failed to open file dialog",
		}
	}

	return project_types.BackendResponseWithData[string]{
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
	c.HeartbeatState = kernel_helpers.KernelHeartbeatState{
		Mutex:  sync.RWMutex{},
		Status: false,
	}
}

var _ contracts.CodeServiceUpdater = (*CodeService)(nil)
