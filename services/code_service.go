package services

import (
	"fmt"
	"log"

	"github.com/etesam913/bytebook/lib/kernel_helpers"
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

func (c *CodeService) CreateSocketsAndListenToKernel() project_types.BackendResponseWithoutData {
	if kernel_helpers.IsPortInUse(c.ConnectionInfo.ShellPort) {
		return project_types.BackendResponseWithoutData{
			Success: false,
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

		iopubSocketSubscriber := sockets.CreateIOPubSocketSubscriber()
		c.IOPubSocketSubscriber = iopubSocketSubscriber
		go sockets.ListenToIOPubSocket(iopubSocketSubscriber, c.ConnectionInfo)

	} else {
		log.Println("Does nothing, the sockets already exist")
	}
	return project_types.BackendResponseWithoutData{
		Success: true,
		Message: "Sockets created and listening...",
	}
}
