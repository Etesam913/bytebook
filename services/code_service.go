package services

import (
	"context"
	"fmt"
	"log"
	"path/filepath"

	"github.com/etesam913/bytebook/lib/kernel_helpers"
	"github.com/etesam913/bytebook/lib/messaging"
	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/etesam913/bytebook/lib/sockets"
	"github.com/pebbe/zmq4"
)

type CodeService struct {
	ProjectPath           string
	Context               context.Context
	ShellSocketDealer     *zmq4.Socket
	IOPubSocketSubscriber *zmq4.Socket
	HeartbeatSocketReq    *zmq4.Socket
	HeartbeatState        kernel_helpers.KernelHeartbeatState
	ConnectionInfo        project_types.KernelConnectionInfo
	AllKernels            project_types.AllKernels
}

func (c *CodeService) SendExecuteRequest(codeBlockId, executionId, language, code string) project_types.BackendResponseWithoutData {
	if c.ShellSocketDealer == nil || c.IOPubSocketSubscriber == nil || c.HeartbeatSocketReq == nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: "Coding sockets are not initialized. Try restarting the kernel using the language button at the bottom of the editor.",
		}
	}

	c.HeartbeatState.Mutex.RLock()
	isHeartBeating := c.HeartbeatState.Status
	c.HeartbeatState.Mutex.RUnlock()

	if !isHeartBeating {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("The %s kernel is not initialized. Try restarting the kernel using the language button at the bottom of the editor.", language),
		}
	}

	err := messaging.SendExecuteRequest(
		c.ShellSocketDealer,
		messaging.ExecuteMessageParams{
			MessageID: fmt.Sprintf("%s:%s", codeBlockId, executionId),
			SessionID: "current-session",
			Code:      code,
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

func (c *CodeService) CreateSocketsAndListen(language string) project_types.BackendResponseWithoutData {
	if kernel_helpers.IsPortInUse(c.ConnectionInfo.ShellPort) {
		return project_types.BackendResponseWithoutData{
			Success: true,
			Message: fmt.Sprintf(
				"Something is already running on the port: %d",
				c.ConnectionInfo.ShellPort,
			),
		}
	}
	pathToConnectionFile := filepath.Join(c.ProjectPath, "code", "connection.json")
	pathToVenv := filepath.Join(c.ProjectPath, "code", "python-venv")

	// Start up the kernel
	err := kernel_helpers.LaunchKernel(
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

	if c.ShellSocketDealer == nil && c.IOPubSocketSubscriber == nil && c.HeartbeatSocketReq == nil {
		shellSocketDealer := sockets.CreateShellSocketDealer()
		if shellSocketDealer == nil {
			return project_types.BackendResponseWithoutData{
				Success: false,
				Message: "Failed to create shell socket dealer",
			}
		}
		c.ShellSocketDealer = shellSocketDealer

		ioPubSocketSubscriber := sockets.CreateIOPubSocketSubscriber()
		if ioPubSocketSubscriber == nil {
			return project_types.BackendResponseWithoutData{
				Success: false,
				Message: "Failed to create IOPub socket subscriber",
			}
		}

		c.IOPubSocketSubscriber = ioPubSocketSubscriber

		heartbeatSocketReq := sockets.CreateHeartbeatSocketReq()
		if heartbeatSocketReq == nil {
			return project_types.BackendResponseWithoutData{
				Success: false,
				Message: "Failed to create heartbeat socket request",
			}
		}

		c.HeartbeatSocketReq = heartbeatSocketReq

		go sockets.ListenToShellSocket(
			shellSocketDealer,
			c.ConnectionInfo,
			c.Context,
		)

		go sockets.ListenToIOPubSocket(
			ioPubSocketSubscriber,
			language,
			c.ConnectionInfo,
			c.Context,
		)

		go sockets.ListenToHeartbeatSocket(
			heartbeatSocketReq,
			language,
			c.ConnectionInfo,
			c.Context,
			&c.HeartbeatState,
		)

	} else {
		log.Println("Does nothing, the sockets already exist")
	}
	return project_types.BackendResponseWithoutData{
		Success: true,
		Message: "Sockets created and listening...",
	}
}
