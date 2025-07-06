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

type completeReplyEvent struct {
	Status      string         `json:"status"`
	MessageId   string         `json:"messageId"`
	Matches     []string       `json:"matches"`
	CursorStart int            `json:"cursorStart"`
	CursorEnd   int            `json:"cursorEnd"`
	Metadata    map[string]any `json:"metadata"`
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

			case "complete_reply":
				status, ok := msg.Content["status"].(string)
				if !ok {
					log.Println("⚠️ Invalid status type in complete_reply")
					continue
				}
				msgId, ok := msg.ParentHeader["msg_id"].(string)
				if !ok {
					log.Println("⚠️ Invalid message ID type in complete_reply")
					continue
				}

				matches := []string{}
				cursorStart := 0
				cursorEnd := 0
				metadata := map[string]any{}

				if status == "ok" {
					if matchesRaw, ok := msg.Content["matches"].([]any); ok {
						for _, match := range matchesRaw {
							if matchStr, ok := match.(string); ok {
								matches = append(matches, matchStr)
							}
						}
					}
					if cursorStartFloat, ok := msg.Content["cursor_start"].(float64); ok {
						cursorStart = int(cursorStartFloat)
					}
					if cursorEndFloat, ok := msg.Content["cursor_end"].(float64); ok {
						cursorEnd = int(cursorEndFloat)
					}
					if metadataRaw, ok := msg.Content["metadata"].(map[string]any); ok {
						metadata = metadataRaw
					}
				}

				currentWindow := app.Window.Current()
				if currentWindow != nil {
					currentWindow.EmitEvent(
						"code:code-block:complete_reply",
						completeReplyEvent{
							Status:      status,
							MessageId:   msgId,
							Matches:     matches,
							CursorStart: cursorStart,
							CursorEnd:   cursorEnd,
							Metadata:    metadata,
						},
					)
				}
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
				} else if connectionInfo.Language == "go" {
					// For some reason gonb only sends shutdown_request to the shell socket
					// It does not use a control socket
					s.cancelFunc()
				}
			case "inspect_reply":
				status, ok := msg.Content["status"].(string)
				if !ok {
					log.Println("⚠️ Invalid status type in inspect_reply")
					continue
				}
				msgId, ok := msg.ParentHeader["msg_id"].(string)
				if !ok {
					log.Println("⚠️ Invalid message ID type in inspect_reply")
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
