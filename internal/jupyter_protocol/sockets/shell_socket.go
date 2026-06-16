package sockets

import (
	"bytes"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/etesam913/bytebook/internal/jupyter_protocol"
	"github.com/pebbe/zmq4"
	"github.com/robert-nix/ansihtml"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/yuin/goldmark"
)

type shellSocket struct {
	socket *zmq4.Socket
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

func createShellSocket(p CreateParams) *shellSocket {
	sock, err := zmq4.NewSocket(zmq4.Type(zmq4.DEALER))
	if err != nil {
		log.Print("Could not create 🐚 socket sender:", err)
		return nil
	}
	if err := sock.SetIdentity("current-session"); err != nil {
		log.Printf("could not set ZMQ IDENTITY: %v", err)
		_ = sock.Close()
		return nil
	}
	return &shellSocket{socket: sock}
}

func (s *shellSocket) Listen(p CreateParams) {
	if s.socket == nil {
		log.Println("🐚 Shell socket is nil, cannot listen")
		return
	}
	defer s.socket.Close()
	app := application.Get()

	shellAddress := fmt.Sprintf("tcp://%s:%d", p.ConnectionInfo.IP, p.ConnectionInfo.ShellPort)
	if err := s.socket.Connect(shellAddress); err != nil {
		log.Printf("Could not connect 🐚 socket: %v", err)
		return
	}

	for {
		select {
		case <-p.Ctx.Done():
			log.Println("🛑 Shell socket listener received context cancellation")
			return
		default:
			envelope, err := s.socket.RecvMessageBytes(zmq4.Flag(zmq4.DONTWAIT))
			if err != nil {
				if strings.Contains(err.Error(), "resource temporarily unavailable") {
					time.Sleep(50 * time.Millisecond)
					continue
				}
				log.Println("🐚 Error receiving message:", err)
				continue
			}

			_, msg, _, err := jupyter_protocol.ParseMultipartMessage(envelope)
			if err != nil {
				log.Println("🐚 Error parsing message:", err)
				continue
			}

			switch msg.Header.MsgType {
			case ShellSocket.ExecuteReply:
				status, ok := msg.Content["status"].(string)
				if !ok {
					continue
				}
				msgId, ok := msg.ParentHeader["msg_id"].(string)
				if !ok {
					continue
				}

				errorName := ""
				errorValue := ""
				errorTraceback := []string{}

				if status == "error" {
					if errorName, ok = msg.Content["ename"].(string); !ok {
						errorName = ""
					}
					if errorValue, ok = msg.Content["evalue"].(string); !ok {
						errorValue = ""
					}
					uncleanTraceback, ok := msg.Content["traceback"].([]any)
					if ok {
						for _, item := range uncleanTraceback {
							if ansiStr, ok := item.(string); ok {
								htmlStr := string(ansihtml.ConvertToHTML([]byte(ansiStr)))
								errorTraceback = append(errorTraceback, htmlStr)
							}
						}
					}
				}
				if app != nil {
					if currentWindow := app.Window.Current(); currentWindow != nil {
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
				}
				time.Sleep(100 * time.Millisecond)

			case ShellSocket.ShutdownReply:
				// gonb only sends shutdown_request to the shell socket — let the
				// instance's process-wait + cancel handle the rest. Nothing to do here.

			case ShellSocket.InspectReply:
				status, ok := msg.Content["status"].(string)
				if !ok {
					continue
				}
				msgId, ok := msg.ParentHeader["msg_id"].(string)
				if !ok {
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

				if app != nil {
					if currentWindow := app.Window.Current(); currentWindow != nil {
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
}
