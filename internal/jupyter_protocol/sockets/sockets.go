package sockets

import (
	"context"
	"errors"
	"log"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/jupyter_protocol"
	"github.com/pebbe/zmq4"
)

type JupyterSocket interface {
	Get() *zmq4.Socket
	Listen(
		socketToListenTo *zmq4.Socket,
		connectionInfo config.KernelConnectionInfo,
		ctx context.Context,
	)
}

type CodeServiceUpdater interface {
	ResetCodeServiceProperties()
}

type socketSet struct {
	ShellSocketDealer     *zmq4.Socket
	ControlSocketDealer   *zmq4.Socket
	IOPubSocketSubscriber *zmq4.Socket
	HeartbeatSocketReq    *zmq4.Socket
}

// CreateSockets initializes the required ZMQ sockets for kernel communication if they don't already exist
// and starts the appropriate listeners for each socket.
func CreateSockets(
	shellSocketDealer *zmq4.Socket,
	ioPubSocketSubscriber *zmq4.Socket,
	heartbeatSocketReq *zmq4.Socket,
	controlSocketDealer *zmq4.Socket,
	language string,
	connectionInfo config.KernelConnectionInfo,
	ctx context.Context,
	cancelFunc context.CancelFunc,
	codeServiceUpdater CodeServiceUpdater,
	heartbeatState *jupyter_protocol.KernelHeartbeatState,
) (*socketSet, error) {
	socketSet := &socketSet{}

	// Create shell socket if it doesn't exist
	var newlyCreatedShellSocket JupyterSocket
	if shellSocketDealer == nil {
		newlyCreatedShellSocket = CreateShellSocket()
		if newlyCreatedShellSocket.Get() == nil {
			return nil, errors.New("failed to create shell socket dealer")
		}
		log.Println("🟩 created shell socket dealer")
		go newlyCreatedShellSocket.Listen(newlyCreatedShellSocket.Get(), connectionInfo, ctx)
	}
	socketSet.ShellSocketDealer = newlyCreatedShellSocket.Get()

	// Create IOPub socket if it doesn't exist
	var newlyCreatedIoPubSocket JupyterSocket
	if ioPubSocketSubscriber == nil {
		newlyCreatedIoPubSocket = CreateIOPubSocket(language, cancelFunc)
		if newlyCreatedIoPubSocket.Get() == nil {
			return nil, errors.New("failed to create IOPub socket subscriber")
		}
		log.Println("🟩 created IOPub socket subscriber")
		go newlyCreatedIoPubSocket.Listen(newlyCreatedIoPubSocket.Get(), connectionInfo, ctx)
	}
	socketSet.IOPubSocketSubscriber = newlyCreatedIoPubSocket.Get()

	// Create heartbeat socket if it doesn't exist
	var newlyCreatedHeartbeatSocket JupyterSocket
	if heartbeatSocketReq == nil {
		newlyCreatedHeartbeatSocket = CreateHeartbeatSocket(heartbeatState)
		if newlyCreatedHeartbeatSocket.Get() == nil {
			return nil, errors.New("failed to create heartbeat socket request")
		}
		log.Println("🟩 created heartbeat socket request")
		go newlyCreatedHeartbeatSocket.Listen(newlyCreatedHeartbeatSocket.Get(), connectionInfo, ctx)
	}
	socketSet.HeartbeatSocketReq = newlyCreatedHeartbeatSocket.Get()

	// Create control socket if it doesn't exist
	var newlyCreatedControlSocket JupyterSocket
	if controlSocketDealer == nil {
		newlyCreatedControlSocket = CreateControlSocket(codeServiceUpdater)
		if newlyCreatedControlSocket.Get() == nil {
			return nil, errors.New("failed to create control socket dealer")
		}
		log.Println("🟩 created control socket dealer")
		go newlyCreatedControlSocket.Listen(newlyCreatedControlSocket.Get(), connectionInfo, ctx)
	}
	socketSet.ControlSocketDealer = newlyCreatedControlSocket.Get()

	return socketSet, nil
}
