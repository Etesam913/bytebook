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

type ControlSocket struct {
	socket             *zmq4.Socket
	codeServiceUpdater CodeServiceUpdater
}

type ShutdownReplyEvent struct {
	Status   string `json:"status"`
	Language string `json:"language"`
}

func CreateControlSocket(codeServiceUpdater CodeServiceUpdater) *ControlSocket {
	controlSocketDealer, err := zmq4.NewSocket(zmq4.DEALER)
	if err != nil {
		log.Print("Could not create 🛂 socket sender:", err)
		return &ControlSocket{
			socket:             nil,
			codeServiceUpdater: codeServiceUpdater,
		}
	}
	return &ControlSocket{
		socket:             controlSocketDealer,
		codeServiceUpdater: codeServiceUpdater,
	}
}

func (s *ControlSocket) Get() *zmq4.Socket {
	return s.socket
}

func (s *ControlSocket) Listen(
	controlSocketDealer *zmq4.Socket,
	connectionInfo config.KernelConnectionInfo,
	ctx context.Context,
) {
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
			app.EmitEvent("code:kernel:shutdown_reply", ShutdownReplyEvent{
				Status:   "success",
				Language: connectionInfo.Language,
			})
			s.codeServiceUpdater.ResetCodeServiceProperties()
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
			envelope, err := controlSocketDealer.RecvMessageBytes(zmq4.DONTWAIT)
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
				// restart, ok := msg.Content["restart"].(bool)
				// if !ok {
				// 	log.Println("⚠️ Invalid restart type")
				// }

				status, ok := msg.Content["status"].(string)
				if !ok {
					log.Println("⚠️ Invalid status type")
				}

				if status != "ok" {
					app.EmitEvent("code:kernel:shutdown_reply", ShutdownReplyEvent{
						Status:   "error",
						Language: connectionInfo.Language,
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
