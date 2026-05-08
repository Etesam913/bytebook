package sockets

import (
	"context"
	"errors"
	"log"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/jupyter_protocol"
	"github.com/pebbe/zmq4"
)

// LanguageSockets is the per-instance bundle of ZMQ sockets used to talk to a kernel.
type LanguageSockets struct {
	ShellSocketDealer     *zmq4.Socket
	IOPubSocketSubscriber *zmq4.Socket
	ControlSocketDealer   *zmq4.Socket
	HeartbeatSocketReq    *zmq4.Socket
	StdinSocketDealer     *zmq4.Socket
}

// CreateParams carries everything the socket goroutines need to identify the
// instance they belong to and emit instance-scoped events.
type CreateParams struct {
	ConnectionInfo config.KernelConnectionInfo
	Ctx            context.Context
	Cancel         context.CancelFunc
	HeartbeatState *jupyter_protocol.KernelHeartbeatState
	InstanceID     string
	NoteID         string

	// OnExecuteStatus is called from the iopub goroutine whenever a kernel
	// status event arrives whose parent_header.msg_type == "execute_request".
	// Used by the manager to maintain per-instance activeExecutions and the
	// derived IsIdle() flag for LRU eviction.
	OnExecuteStatus func(status, parentMsgID string)
}

// CreateSockets initializes all 5 ZMQ sockets for a kernel instance and starts
// listener goroutines for each. The goroutines exit when p.Ctx is cancelled.
func CreateSockets(p CreateParams) (*LanguageSockets, error) {
	out := &LanguageSockets{}

	shell := createShellSocket(p)
	if shell == nil {
		return nil, errors.New("failed to create shell socket dealer")
	}
	go shell.Listen(p)
	out.ShellSocketDealer = shell.socket
	log.Println("🟩 created shell socket dealer")

	iopub := createIOPubSocket(p)
	if iopub == nil {
		return nil, errors.New("failed to create IOPub socket subscriber")
	}
	go iopub.Listen(p)
	out.IOPubSocketSubscriber = iopub.socket
	log.Println("🟩 created IOPub socket subscriber")

	hb := createHeartbeatSocket(p)
	if hb == nil {
		return nil, errors.New("failed to create heartbeat socket request")
	}
	go hb.Listen(p)
	out.HeartbeatSocketReq = hb.socket
	log.Println("🟩 created heartbeat socket request")

	control := createControlSocket(p)
	if control == nil {
		return nil, errors.New("failed to create control socket dealer")
	}
	go control.Listen(p)
	out.ControlSocketDealer = control.socket
	log.Println("🟩 created control socket dealer")

	stdin := createStdinSocket(p)
	if stdin == nil {
		return nil, errors.New("failed to create stdin socket dealer")
	}
	go stdin.Listen(p)
	out.StdinSocketDealer = stdin.socket
	log.Println("🟩 created stdin socket dealer")

	return out, nil
}
