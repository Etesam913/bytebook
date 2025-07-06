package sockets

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/jupyter_protocol"
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

func CreateStdinSocket(language string) *stdinSocket {
	stdinSocketDealer, err := zmq4.NewSocket(zmq4.Type(zmq4.DEALER))
	if err != nil {
		log.Print("Could not create stdin socket:", err)
		return &stdinSocket{socket: nil}
	}
	// the identity of the stdin socket has to be the same as the identity
	// of the shell socket. This is required to be set on the stdin socket
	// as it receives messages from the kernel via the shell socket.
	if err := stdinSocketDealer.SetIdentity("current-session"); err != nil {
		log.Fatalf("could not set ZMQ IDENTITY: %v", err)
	}
	return &stdinSocket{socket: stdinSocketDealer}
}

func (s *stdinSocket) Get() *zmq4.Socket {
	return s.socket
}

func (s *stdinSocket) Listen(
	stdinSocketDealer *zmq4.Socket,
	connectionInfo config.KernelConnectionInfo,
	ctx context.Context,
) {
	defer stdinSocketDealer.Close()
	app := application.Get()

	stdinAddress := fmt.Sprintf("tcp://%s:%d", connectionInfo.IP, connectionInfo.StdinPort)
	if err := stdinSocketDealer.Connect(stdinAddress); err != nil {
		log.Fatal("Could not connect 📥 stdin socket dealer to port:", err)
	}

	for {
		select {
		case <-ctx.Done():
			stdinSocketDealer.Close()
			log.Println("🛑 Stdin socket listener received context cancellation")
			return
		default:
			envelope, err := stdinSocketDealer.RecvMessageBytes(zmq4.Flag(zmq4.DONTWAIT))
			if err != nil {
				if strings.Contains(err.Error(), "resource temporarily unavailable") {
					time.Sleep(50 * time.Millisecond)
					continue
				}
				log.Println("📥 Error receiving message:", err)
				continue
			}

			identities, msg, signature, err := jupyter_protocol.ParseMultipartMessage(envelope)
			if err != nil {
				log.Println("📥 Error parsing message:", err)
				continue
			}

			log.Println("📥 stdin socket identities:", identities)
			log.Println("📥 stdin socket signature:", signature)
			log.Println("📥 stdin socket parent header:", msg.ParentHeader)
			log.Println("📥 stdin socket message type:", msg.Header.MsgType)
			log.Println("📥 stdin socket content:", msg.Content)

			switch msg.Header.MsgType {
			case "input_request":
				msgId, ok := msg.ParentHeader["msg_id"].(string)
				if !ok {
					log.Println("⚠️ Invalid message ID type")
					continue
				}

				prompt, promptOk := msg.Content["prompt"].(string)
				if !promptOk {
					log.Println("⚠️ Invalid prompt type")
					prompt = "Input: "
				}

				password, passwordOk := msg.Content["password"].(bool)
				if !passwordOk {
					password = false
				}

				app.Event.EmitEvent(&application.CustomEvent{
					Name: "code:code-block:input_request",
					Data: InputRequestEvent{
						MessageId: msgId,
						Prompt:    prompt,
						Password:  password,
					},
				})
			}
		}
	}
}
