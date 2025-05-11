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
	"github.com/robert-nix/ansihtml"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type ShellSocket struct {
	socket *zmq4.Socket
}

type ExecuteReplyEvent struct {
	Status         string   `json:"status"`
	MessageId      string   `json:"messageId"`
	ErrorName      string   `json:"errorName"`
	ErrorValue     string   `json:"errorValue"`
	ErrorTraceback []string `json:"errorTraceback"`
}

func CreateShellSocket() *ShellSocket {
	shellSocketDealer, err := zmq4.NewSocket(zmq4.DEALER) // Could also use REQ
	if err != nil {
		log.Print("Could not create 🐚 socket sender:", err)
		return &ShellSocket{
			socket: nil,
		}
	}
	return &ShellSocket{
		socket: shellSocketDealer,
	}
}

func (s *ShellSocket) Get() *zmq4.Socket {
	return s.socket
}

func (s *ShellSocket) Listen(
	shellSocketDealer *zmq4.Socket,
	connectionInfo config.KernelConnectionInfo,
	ctx context.Context,
) {
	defer shellSocketDealer.Close()
	app := application.Get()

	shellAddress := fmt.Sprintf("tcp://%s:%d", connectionInfo.IP, connectionInfo.ShellPort)
	if err := shellSocketDealer.Connect(shellAddress); err != nil {
		log.Fatal("Could not connect 🐚 socket sender to port:", err)
	}

	for {
		select {
		case <-ctx.Done():
			shellSocketDealer.Close()
			log.Println("🛑 Shell socket listener received context cancellation")
			return
		default:
			envelope, err := shellSocketDealer.RecvMessageBytes(zmq4.DONTWAIT)
			if err != nil {
				if strings.Contains(err.Error(), "resource temporarily unavailable") {
					time.Sleep(50 * time.Millisecond)
					continue
				}
				log.Println("🐚 Error receiving message:", err)
				continue
			}

			identities, msg, signature, err := jupyter_protocol.ParseMultipartMessage(envelope)
			if err != nil {
				log.Println("🐚 Error parsing message:", err)
				continue
			}

			log.Println("🐚 shell socket identities:", identities)
			log.Println("🐚 shell socket signature:", signature)
			log.Println("🐚 shell socket parent header:", msg.ParentHeader)
			log.Println("🐚 shell socket message type:", msg.Header.MsgType)
			log.Println("🐚 shell socket content:", msg.Content)

			switch msg.Header.MsgType {
			case "execute_reply":
				status, ok := msg.Content["status"].(string)
				if !ok {
					log.Println("⚠️ Invalid status type")
					return
				}
				msgId, ok := msg.ParentHeader["msg_id"].(string)
				if !ok {
					log.Println("⚠️ Invalid message ID type")
					return
				}

				errorName := ""
				errorValue := ""
				errorTraceback := []string{}

				if status == "error" {
					if errorName, ok = msg.Content["ename"].(string); !ok {
						log.Println("⚠️ Invalid error name type")
						return
					}
					if errorValue, ok = msg.Content["evalue"].(string); !ok {
						log.Println("⚠️ Invalid error value type")
						return
					}
					uncleanTraceback, ok := msg.Content["traceback"].([]any)
					if !ok {
						log.Println("⚠️ Invalid error traceback type")
						return
					}
					for _, item := range uncleanTraceback {
						if ansiStr, ok := item.(string); ok {
							htmlStr := string(ansihtml.ConvertToHTML([]byte(ansiStr)))
							errorTraceback = append(errorTraceback, htmlStr)
						}
					}
				}
				currentWindow := app.CurrentWindow()
				if currentWindow != nil {
					currentWindow.EmitEvent(
						"code:code-block:execute-reply",
						ExecuteReplyEvent{
							Status:         status,
							MessageId:      msgId,
							ErrorName:      errorName,
							ErrorValue:     errorValue,
							ErrorTraceback: errorTraceback,
						},
					)
				}
				fmt.Println("---")
				time.Sleep(100 * time.Millisecond)
			}
		}
	}
}
