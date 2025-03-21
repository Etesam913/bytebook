package services

import (
	"fmt"
	"log"

	"github.com/etesam913/bytebook/lib/kernel_helpers"
	"github.com/etesam913/bytebook/lib/messaging"
	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/etesam913/bytebook/lib/sockets"
	"github.com/pebbe/zmq4"
)

type CodeService struct {
	ShellSocketDealer     *zmq4.Socket
	IOPubSocketSubscriber *zmq4.Socket
	ConnectionInfo        sockets.ConnectionInfo
	AllKernels            project_types.AllKernels
}

func (c *CodeService) createSocketsAndListenToKernel(language string) project_types.BackendResponseWithoutData {
	fmt.Println("createSocketsAndListenToKernel")
	if kernel_helpers.IsPortInUse(c.ConnectionInfo.ShellPort) {
		return project_types.BackendResponseWithoutData{
			Success: true,
			Message: fmt.Sprintf(
				"Something is already running on the port: %d",
				c.ConnectionInfo.ShellPort,
			),
		}
	}
	// Start up the kernel
	err := kernel_helpers.LaunchKernel(
		c.AllKernels.Python.Argv,
		"lib/config/connection.json",
		"/Users/etesam/Coding/bytebook/venv",
	)

	if err != nil {
		return project_types.BackendResponseWithoutData{
			Success: false,
			Message: fmt.Sprintf("Failed to launch kernel: %v", err),
		}
	}

	if c.ShellSocketDealer == nil && c.IOPubSocketSubscriber == nil {
		shellSocketDealer := sockets.CreateShellSocketDealer()
		c.ShellSocketDealer = shellSocketDealer
		go sockets.ListenToShellSocket(shellSocketDealer, c.ConnectionInfo)

		ioPubSocketSubscriber := sockets.CreateIOPubSocketSubscriber()
		c.IOPubSocketSubscriber = ioPubSocketSubscriber
		go sockets.ListenToIOPubSocket(language, ioPubSocketSubscriber, c.ConnectionInfo)

	} else {
		log.Println("Does nothing, the sockets already exist")
	}
	return project_types.BackendResponseWithoutData{
		Success: true,
		Message: "Sockets created and listening...",
	}
}

func (c *CodeService) SendExecuteRequest(codeBlockId, executionId, language, code string) project_types.BackendResponseWithoutData {
	response := c.createSocketsAndListenToKernel(language)
	// If the kernel is already running on the port, then it is fine to send the message
	if response.Success == false {
		return response
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
