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
	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/etesam913/bytebook/lib/sockets"
	"github.com/pebbe/zmq4"
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
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("The %s kernel is not initialized. Try turning on the kernel by using the language button at the bottom of the editor.", language),
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
func (c *CodeService) SendInterruptRequest() project_types.BackendResponseWithoutData {
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
			MessageID: fmt.Sprintf("interrupt-%d", time.Now().UnixNano()),
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

func (c *CodeService) CreateSocketsAndListen(language string) project_types.BackendResponseWithoutData {
	connectionInfo, err := kernel_helpers.GetConnectionInfoFromLanguage(c.ProjectPath, language)
	if err != nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: err.Error(),
		}
	}

	if kernel_helpers.IsPortInUse(connectionInfo.ShellPort) {
		return project_types.BackendResponseWithoutData{
			Success: true,
			Message: fmt.Sprintf(
				"Something is already running on the port: %d",
				connectionInfo.ShellPort,
			),
		}
	}
	pathToConnectionFile := filepath.Join(c.ProjectPath, "code", "connection.json")
	pathToVenv := filepath.Join(c.ProjectPath, "code", "python-venv")

	// Start up the kernel
	err = kernel_helpers.LaunchKernel(
		c.AllKernels.Python.Argv,
		pathToConnectionFile,
		pathToVenv,
	)

	if err != nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to launch kernel: %v", err),
		}
	}

	log.Println("🟩 launched kernel")

	codeServiceUpdater := contracts.CodeServiceUpdater(c)
	if c.ShellSocketDealer == nil {
		shellSocketDealer := sockets.CreateShellSocketDealer()
		if shellSocketDealer == nil {
			return project_types.BackendResponseWithoutData{
				Success: false,
				Message: "Failed to create shell socket dealer",
			}
		}
		c.ShellSocketDealer = shellSocketDealer
		log.Println("🟩 created shell socket dealer")
		go sockets.ListenToShellSocket(
			shellSocketDealer,
			connectionInfo,
			c.Context,
		)
	}

	if c.IOPubSocketSubscriber == nil {
		ioPubSocketSubscriber := sockets.CreateIOPubSocketSubscriber()
		if ioPubSocketSubscriber == nil {
			return project_types.BackendResponseWithoutData{
				Success: false,
				Message: "Failed to create IOPub socket subscriber",
			}
		}
		c.IOPubSocketSubscriber = ioPubSocketSubscriber
		log.Println("🟩 created IOPub socket subscriber")
		go sockets.ListenToIOPubSocket(
			ioPubSocketSubscriber,
			language,
			connectionInfo,
			c.Context,
			c.Cancel,
		)
	}

	if c.HeartbeatSocketReq == nil {
		heartbeatSocketReq := sockets.CreateHeartbeatSocketReq()
		if heartbeatSocketReq == nil {
			return project_types.BackendResponseWithoutData{
				Success: false,
				Message: "Failed to create heartbeat socket request",
			}
		}
		c.HeartbeatSocketReq = heartbeatSocketReq
		log.Println("🟩 created heartbeat socket request")
		go sockets.ListenToHeartbeatSocket(
			heartbeatSocketReq,
			language,
			connectionInfo,
			c.Context,
			&c.HeartbeatState,
		)
	}

	if c.ControlSocketDealer == nil {
		controlSocketDealer := sockets.CreateControlSocketDealer()

		if controlSocketDealer == nil {
			return project_types.BackendResponseWithoutData{
				Success: false,
				Message: "Failed to create control socket dealer",
			}
		}

		c.ControlSocketDealer = controlSocketDealer
		log.Println("🟩 created control socket dealer")
		go sockets.ListenToControlSocket(
			controlSocketDealer,
			connectionInfo,
			c.Context,
			codeServiceUpdater,
		)

	} else {
		log.Println("Does nothing, the sockets already exist")
	}
	return project_types.BackendResponseWithoutData{
		Success: true,
		Message: "Sockets created and listening...",
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
