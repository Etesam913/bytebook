package sockets

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/jupyter_protocol"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/pebbe/zmq4"
	"github.com/robert-nix/ansihtml"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/yuin/goldmark"
)

type shellSocket struct {
	socket     *zmq4.Socket
	cancelFunc context.CancelFunc
}

type executeReplyEvent struct {
	Status         string   `json:"status"`
	MessageId      string   `json:"messageId"`
	ErrorName      string   `json:"errorName"`
	ErrorValue     string   `json:"errorValue"`
	ErrorTraceback []string `json:"errorTraceback"`
}

type inspectReplyEvent struct {
	Status    string         `json:"status"`
	MessageId string         `json:"messageId"`
	Found     bool           `json:"found"`
	Data      map[string]any `json:"data"`
	Metadata  map[string]any `json:"metadata"`
}

func CreateShellSocket(language string, cancelFunc context.CancelFunc) *shellSocket {
	shellSocketDealer, err := zmq4.NewSocket(zmq4.Type(zmq4.DEALER)) // Could also use REQ
	if err != nil {
		log.Print("Could not create 🐚 socket sender:", err)
		return &shellSocket{
			socket: nil,
		}
	}
	if err := shellSocketDealer.SetIdentity("current-session"); err != nil {
		log.Fatalf("could not set ZMQ IDENTITY: %v", err)
	}
	return &shellSocket{
		socket:     shellSocketDealer,
		cancelFunc: cancelFunc,
	}
}

func (s *shellSocket) Get() *zmq4.Socket {
	return s.socket
}

func (s *shellSocket) Listen(
	shellSocketDealer *zmq4.Socket,
	connectionInfo config.KernelConnectionInfo,
	ctx context.Context,
) {
	if shellSocketDealer == nil {
		log.Println("🐚 Shell socket is nil, cannot listen")
		return
	}
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
			envelope, err := shellSocketDealer.RecvMessageBytes(zmq4.Flag(zmq4.DONTWAIT))
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
			case ShellSocket.ExecuteReply:
				status, ok := msg.Content["status"].(string)
				if !ok {
					log.Printf("⚠️ Invalid status type: %v (type: %T)", msg.Content["status"], msg.Content["status"])
					continue
				}
				msgId, ok := msg.ParentHeader["msg_id"].(string)
				if !ok {
					log.Printf("⚠️ Invalid message ID type: %v (type: %T)", msg.ParentHeader["msg_id"], msg.ParentHeader["msg_id"])
					continue
				}

				errorName := ""
				errorValue := ""
				errorTraceback := []string{}

				if status == "error" {
					if errorName, ok = msg.Content["ename"].(string); !ok {
						log.Printf("⚠️ Invalid error name type: %v (type: %T)", msg.Content["ename"], msg.Content["ename"])
						errorName = ""
					}
					if errorValue, ok = msg.Content["evalue"].(string); !ok {
						log.Printf("⚠️ Invalid error value type: %v (type: %T)", msg.Content["evalue"], msg.Content["evalue"])
						errorValue = ""
					}
					uncleanTraceback, ok := msg.Content["traceback"].([]any)
					if !ok {
						log.Printf("⚠️ Invalid error traceback type: %v (type: %T)", msg.Content["traceback"], msg.Content["traceback"])
						errorTraceback = []string{}
					} else {

						for _, item := range uncleanTraceback {
							if ansiStr, ok := item.(string); ok {
								htmlStr := string(ansihtml.ConvertToHTML([]byte(ansiStr)))
								errorTraceback = append(errorTraceback, htmlStr)
							}
						}
					}
				}
				currentWindow := app.Window.Current()
				if currentWindow != nil {
					currentWindow.EmitEvent(
						"code:code-block:execute_reply",
						executeReplyEvent{
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

			case ShellSocket.ShutdownReply:
				// TODO: Handle restart functionality later

				status, ok := msg.Content["status"].(string)
				if !ok {
					log.Printf("⚠️ Invalid status type: %v (type: %T)", msg.Content["status"], msg.Content["status"])
				}

				if status != "ok" {
					app.Event.EmitEvent(&application.CustomEvent{
						Name: util.Events.KernelShutdownReply,
						Data: shutdownReplyEvent{
							Status:   "error",
							Language: connectionInfo.Language,
						},
					})
				} else if connectionInfo.Language == "go" {
					// For some reason gonb only sends shutdown_request to the shell socket
					// It does not use a control socket
					s.cancelFunc()
				}
			case ShellSocket.InspectReply:
				status, ok := msg.Content["status"].(string)
				if !ok {
					log.Printf("⚠️ Invalid status type in inspect_reply: %v (type: %T)", msg.Content["status"], msg.Content["status"])
					continue
				}
				msgId, ok := msg.ParentHeader["msg_id"].(string)
				if !ok {
					log.Printf("⚠️ Invalid message ID type in inspect_reply: %v (type: %T)", msg.ParentHeader["msg_id"], msg.ParentHeader["msg_id"])
					continue
				}

				found := false
				data := map[string]any{}
				metadata := map[string]any{}

				if status == "ok" {
					if foundBool, ok := msg.Content["found"].(bool); ok {
						found = foundBool
					}
					if dataRaw, ok := msg.Content["data"].(map[string]any); ok {
						data = dataRaw
						if text, ok := dataRaw["text/plain"].(string); ok {
							data["text/plain"] = string(ansihtml.ConvertToHTML([]byte(text)))
						}
						if markdown, ok := dataRaw["text/markdown"].(string); ok {
							markdownConverter := goldmark.New()
							var buf bytes.Buffer
							if err := markdownConverter.Convert([]byte(markdown), &buf); err != nil {
								log.Printf("⚠️ Error converting markdown: %v", err)
								continue
							}
							data["text/markdown"] = buf.String()
						}
					}
					if metadataRaw, ok := msg.Content["metadata"].(map[string]any); ok {
						metadata = metadataRaw
					}
				}

				currentWindow := app.Window.Current()
				if currentWindow != nil {
					currentWindow.EmitEvent(
						"code:code-block:inspect_reply",
						inspectReplyEvent{
							Status:    status,
							MessageId: msgId,
							Found:     found,
							Data:      data,
							Metadata:  metadata,
						},
					)
				}
			}
		}
	}
}
