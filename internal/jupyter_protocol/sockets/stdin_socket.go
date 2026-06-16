package sockets

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/etesam913/bytebook/internal/jupyter_protocol"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/pebbe/zmq4"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type stdinSocket struct {
	socket *zmq4.Socket
}

type InputRequestEvent struct {
	MessageId string `json:"messageId"`
	Prompt    string `json:"prompt"`
	Password  bool   `json:"password"`
}

func createStdinSocket(p CreateParams) *stdinSocket {
	sock, err := zmq4.NewSocket(zmq4.Type(zmq4.DEALER))
	if err != nil {
		log.Print("Could not create stdin socket:", err)
		return nil
	}
	// Stdin socket identity must match the shell socket so the kernel can route to us.
	if err := sock.SetIdentity("current-session"); err != nil {
		log.Printf("could not set ZMQ IDENTITY: %v", err)
		_ = sock.Close()
		return nil
	}
	return &stdinSocket{socket: sock}
}

func (s *stdinSocket) Listen(p CreateParams) {
	if s.socket == nil {
		log.Println("📥 Stdin socket is nil, cannot listen")
		return
	}
	defer s.socket.Close()
	app := application.Get()

	stdinAddress := fmt.Sprintf("tcp://%s:%d", p.ConnectionInfo.IP, p.ConnectionInfo.StdinPort)
	if err := s.socket.Connect(stdinAddress); err != nil {
		log.Printf("Could not connect 📥 stdin socket: %v", err)
		return
	}

	for {
		select {
		case <-p.Ctx.Done():
			log.Println("🛑 Stdin socket listener received context cancellation")
			return
		default:
			envelope, err := s.socket.RecvMessageBytes(zmq4.Flag(zmq4.DONTWAIT))
			if err != nil {
				if strings.Contains(err.Error(), "resource temporarily unavailable") {
					time.Sleep(50 * time.Millisecond)
					continue
				}
				log.Println("📥 Error receiving message:", err)
				continue
			}

			_, msg, _, err := jupyter_protocol.ParseMultipartMessage(envelope)
			if err != nil {
				log.Println("📥 Error parsing message:", err)
				continue
			}

			if msg.Header.MsgType == StdinSocket.InputRequest {
				msgId, ok := msg.ParentHeader["msg_id"].(string)
				if !ok {
					continue
				}
				prompt, _ := msg.Content["prompt"].(string)
				password, _ := msg.Content["password"].(bool)
				if app != nil {
					app.Event.EmitEvent(&application.CustomEvent{
						Name: util.Events.CodeBlockInputRequest,
						Data: InputRequestEvent{MessageId: msgId, Prompt: prompt, Password: password},
					})
				}
			}
		}
	}
}
