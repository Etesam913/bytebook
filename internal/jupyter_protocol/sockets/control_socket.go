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

type controlSocket struct {
	socket             *zmq4.Socket
	codeServiceUpdater CodeServiceUpdater
}

type shutdownReplyEvent struct {
	Status   string `json:"status"`
	Language string `json:"language"`
}

func CreateControlSocket(codeServiceUpdater CodeServiceUpdater) *controlSocket {
	controlSocketDealer, err := zmq4.NewSocket(zmq4.Type(zmq4.DEALER))
	if err != nil {
		log.Print("Could not create 🛂 socket sender:", err)
		return &controlSocket{
			socket:             nil,
			codeServiceUpdater: codeServiceUpdater,
		}
	}

	if err := controlSocketDealer.SetIdentity("current-session"); err != nil {
		log.Fatalf("could not set ZMQ IDENTITY: %v", err)
	}
	return &controlSocket{
		socket:             controlSocketDealer,
		codeServiceUpdater: codeServiceUpdater,
	}
}

func (s *controlSocket) Get() *zmq4.Socket {
	return s.socket
}

func (s *controlSocket) Listen(
	controlSocketDealer *zmq4.Socket,
	connectionInfo config.KernelConnectionInfo,
	ctx context.Context,
) {
	if controlSocketDealer == nil {
		log.Println("🛂 Control socket is nil, cannot listen")
		return
	}
	defer controlSocketDealer.Close()
	app := application.Get()

	controlAddress := fmt.Sprintf("tcp://%s:%d", connectionInfo.IP, connectionInfo.ControlPort)
	if err := controlSocketDealer.Connect(controlAddress); err != nil {
		log.Fatal("Could not connect 🛂 socket sender to port:", err)
	}

	for {
		select {
		case <-ctx.Done():
			controlSocketDealer.Close()
			log.Println("🛑 Control socket listener received context cancellation")
			app.Event.EmitEvent(&application.CustomEvent{
				Name: "code:kernel:shutdown_reply",
				Data: shutdownReplyEvent{
					Status:   "success",
					Language: connectionInfo.Language,
				},
			})
			s.codeServiceUpdater.ResetCodeServiceProperties(connectionInfo.Language)
			jupyter_protocol.SendShutdownMessage(
				controlSocketDealer,
				jupyter_protocol.ShutdownMessageParams{
					MessageParams: jupyter_protocol.MessageParams{
						MessageID: "",
						SessionID: "current-session",
					},
					Restart: false,
				},
			)
			return
		default:
			envelope, err := controlSocketDealer.RecvMessageBytes(zmq4.Flag(zmq4.DONTWAIT))
			if err != nil {
				if strings.Contains(err.Error(), "resource temporarily unavailable") {
					time.Sleep(50 * time.Millisecond)
					continue
				}
				log.Println("🛂 Error receiving message:", err)
				continue
			}

			identities, msg, signature, err := jupyter_protocol.ParseMultipartMessage(envelope)
			if err != nil {
				log.Println("🛂 Error parsing message:", err)
				continue
			}

			log.Println("🛂 control socket identities:", identities)
			log.Println("🛂 control socket signature:", signature)
			log.Println("🛂 control socket parent header:", msg.ParentHeader)
			log.Println("🛂 control socket message type:", msg.Header.MsgType)
			log.Println("🛂 control socket content:", msg.Content)

			switch msg.Header.MsgType {
			case "shutdown_reply":
				// TODO: Handle restart functionality later
				status, ok := msg.Content["status"].(string)
				if !ok {
					log.Println("⚠️ Invalid status type")
				}

				if status != "ok" {
					app.Event.EmitEvent(&application.CustomEvent{
						Name: "code:kernel:shutdown_reply",
						Data: shutdownReplyEvent{
							Status:   "error",
							Language: connectionInfo.Language,
						},
					})
				}
			case "interrupt_reply":
				status, ok := msg.Content["status"].(string)
				if !ok {
					log.Println("⚠️ Invalid status type in interrupt_reply")
					continue
				}
				log.Printf("🔴 Received interrupt reply with status: %s\n", status)
			}
		}
	}
}
