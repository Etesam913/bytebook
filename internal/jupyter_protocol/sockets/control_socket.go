package sockets

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/etesam913/bytebook/internal/jupyter_protocol"
	"github.com/pebbe/zmq4"
)

type controlSocket struct {
	socket *zmq4.Socket
}

func createControlSocket(p CreateParams) *controlSocket {
	sock, err := zmq4.NewSocket(zmq4.Type(zmq4.DEALER))
	if err != nil {
		log.Print("Could not create 🛂 socket sender:", err)
		return nil
	}
	if err := sock.SetIdentity("current-session"); err != nil {
		log.Printf("could not set ZMQ IDENTITY: %v", err)
		_ = sock.Close()
		return nil
	}
	return &controlSocket{socket: sock}
}

func (s *controlSocket) Listen(p CreateParams) {
	if s.socket == nil {
		log.Println("🛂 Control socket is nil, cannot listen")
		return
	}
	defer s.socket.Close()

	controlAddress := fmt.Sprintf("tcp://%s:%d", p.ConnectionInfo.IP, p.ConnectionInfo.ControlPort)
	if err := s.socket.Connect(controlAddress); err != nil {
		log.Printf("Could not connect 🛂 socket: %v", err)
		return
	}

	for {
		select {
		case <-p.Ctx.Done():
			log.Println("🛑 Control socket listener received context cancellation")
			return
		default:
			envelope, err := s.socket.RecvMessageBytes(zmq4.Flag(zmq4.DONTWAIT))
			if err != nil {
				if strings.Contains(err.Error(), "resource temporarily unavailable") {
					time.Sleep(50 * time.Millisecond)
					continue
				}
				log.Println("🛂 Error receiving message:", err)
				continue
			}

			_, msg, _, err := jupyter_protocol.ParseMultipartMessage(envelope)
			if err != nil {
				log.Println("🛂 Error parsing message:", err)
				continue
			}

			switch msg.Header.MsgType {
			case ControlSocket.ShutdownReply:
				// Shutdown is now driven from KernelInstance.shutdown(); the manager
				// will emit kernel:instance:shutdown when the process actually exits.
			case ControlSocket.InterruptReply:
				if status, ok := msg.Content["status"].(string); ok {
					log.Printf("🔴 Received interrupt reply with status: %s\n", status)
				}
			}
		}
	}
}
