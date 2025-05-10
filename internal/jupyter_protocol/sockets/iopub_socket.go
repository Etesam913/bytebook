package sockets

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/jupyter_protocol"
	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/pebbe/zmq4"
	"github.com/robert-nix/ansihtml"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type IOPubSocket struct {
	socket     *zmq4.Socket
	language   string
	cancelFunc context.CancelFunc
}

func CreateIOPubSocket(language string, cancelFunc context.CancelFunc) *IOPubSocket {
	iopubSocketSubscriber, err := zmq4.NewSocket(zmq4.SUB)
	if err != nil {
		log.Print("Could not create io 🍺 socket subscriber:", err)
		return &IOPubSocket{
			socket:     nil,
			language:   language,
			cancelFunc: cancelFunc,
		}
	}
	return &IOPubSocket{
		socket:     iopubSocketSubscriber,
		language:   language,
		cancelFunc: cancelFunc,
	}
}

func (i *IOPubSocket) Get() *zmq4.Socket {
	return i.socket
}

func (i *IOPubSocket) Listen(
	ioPubSocketSubscriber *zmq4.Socket,
	// language string,
	connectionInfo config.KernelConnectionInfo,
	ctx context.Context,
	// cancelFunc context.CancelFunc,
) {

	defer ioPubSocketSubscriber.Close()

	ioPubAddress := fmt.Sprintf("tcp://%s:%d", connectionInfo.IP, connectionInfo.IOPubPort)
	if err := ioPubSocketSubscriber.Connect(ioPubAddress); err != nil {
		log.Fatal("Could not connect io 🍺 socket subscriber to port:", err)
	}

	app := application.Get()
	if err := ioPubSocketSubscriber.SetSubscribe(""); err != nil {
		log.Fatal("Could not set subscribe:", err)
	}

	for {
		select {
		case <-ctx.Done():
			ioPubSocketSubscriber.Close()
			log.Println("🛑 IOPub socket listener received context cancellation")
			return
		default:
			envelope, err := ioPubSocketSubscriber.RecvMessageBytes(zmq4.DONTWAIT)
			if err != nil {
				if strings.Contains(err.Error(), "resource temporarily unavailable") {
					time.Sleep(50 * time.Millisecond)
					continue
				}
				log.Println("🍺 Error receiving message:", err)
				continue
			}

			identities, msg, signature, err := jupyter_protocol.ParseMultipartMessage(envelope)
			if err != nil {
				log.Println("🍺 Error parsing message:", err)
				continue
			}

			msgId, ok := msg.ParentHeader["msg_id"].(string)
			if !ok {
				log.Println("⚠️ Invalid message ID type")
				continue
			}

			log.Println("io 🍺 socket identities:", identities)
			log.Println("io 🍺 socket signature:", signature)
			log.Println("io 🍺 socket parent header:", msg.ParentHeader)
			log.Println("io 🍺 socket message type:", msg.Header.MsgType)
			log.Println("io 🍺 socket content:", msg.Content)

			switch msg.Header.MsgType {
			case "stream":
				name, isNameString := msg.Content["name"].(string)
				text, isTextString := msg.Content["text"].(string)
				if isNameString && isTextString {
					htmlStr := string(ansihtml.ConvertToHTML([]byte(text)))
					app.EmitEvent("code:code-block:stream", project_types.StreamEventType{
						MessageId: msgId,
						Name:      name,
						Text:      htmlStr,
					})
				}
			case "execute_result":
				log.Printf("✅ Execution result: %v\n", msg.Content["data"])
				dataMap, exists := msg.Content["data"].(map[string]any)

				if exists {
					// Create a structure to hold the execution result with different mime types
					executionResult := project_types.ExecuteResultEventType{
						MessageId: msgId,
						Data:      map[string]string{},
					}

					// Process different mime types
					for mimeType, content := range dataMap {
						if contentStr, ok := content.(string); ok {
							executionResult.Data[mimeType] = contentStr
							log.Printf("MIME type %s: %v\n", mimeType, contentStr)
						}
					}

					// Emit the event with all the data
					app.EmitEvent("code:code-block:execute_result", executionResult)
				}
			case "display_data":
				log.Printf("🖼️ Display data: %v\n", msg.Content["data"])
				dataMap, exists := msg.Content["data"].(map[string]any)

				if exists {
					// Create a structure to hold the display data with different mime types
					displayData := project_types.ExecuteResultEventType{
						MessageId: msgId,
						Data:      map[string]string{},
					}

					// Process different mime types
					for mimeType, content := range dataMap {
						if contentStr, ok := content.(string); ok {
							displayData.Data[mimeType] = contentStr
							log.Printf("MIME type %s: %v\n", mimeType, contentStr)
						}
					}

					// Emit the event with all the data
					app.EmitEvent("code:code-block:display_data", displayData)
				}
			case "status":
				status, isString := msg.Content["execution_state"].(string)
				if isString {
					statusEventData := project_types.KernelStatusEventType{
						Status:   status,
						Language: i.language,
					}

					app.EmitEvent("code:kernel:status", statusEventData)
					parentMessageType, ok := msg.ParentHeader["msg_type"].(string)
					if !ok {
						continue
					}
					if parentMessageType == "execute_request" {
						app.EmitEvent("code:code-block:status", project_types.CodeBlockStatusEventType{
							MessageId: msgId,
							Status:    status,
						})
					} else if parentMessageType == "shutdown_request" && status == "idle" {
						// After the shutdown_request, everything listen function should be exited from
						i.cancelFunc()
					}
				}
			case "error":
				log.Printf("❌ Execution error: %v\n", msg.Content["traceback"])
			}
			fmt.Println("---")
			time.Sleep(100 * time.Millisecond)
		}
	}
}
