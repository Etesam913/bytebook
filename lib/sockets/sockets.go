package sockets

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/etesam913/bytebook/lib/contracts"
	"github.com/etesam913/bytebook/lib/kernel_helpers"
	"github.com/etesam913/bytebook/lib/messaging"
	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/pebbe/zmq4"
	"github.com/robert-nix/ansihtml"
	"github.com/wailsapp/wails/v3/pkg/application"
)

func CreateShellSocketDealer() *zmq4.Socket {
	shellSocketDealer, err := zmq4.NewSocket(zmq4.DEALER) // Could also use REQ
	if err != nil {
		log.Print("Could not create 🐚 socket sender:", err)
		return nil
	}
	return shellSocketDealer
}

func ListenToShellSocket(
	shellSocketDealer *zmq4.Socket,
	connectionInfo project_types.KernelConnectionInfo,
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

			identities, msg, signature, err := messaging.ParseMultipartMessage(envelope)
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
						project_types.KernelCodeBlockExecuteReply{
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

func CreateIOPubSocketSubscriber() *zmq4.Socket {
	iopubSocketSubscriber, err := zmq4.NewSocket(zmq4.SUB)
	if err != nil {
		log.Print("Could not create io 🍺 socket subscriber:", err)
		return nil
	}
	return iopubSocketSubscriber
}

func ListenToIOPubSocket(
	ioPubSocketSubscriber *zmq4.Socket,
	language string,
	connectionInfo project_types.KernelConnectionInfo,
	ctx context.Context,
	cancelFunc context.CancelFunc,
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

			identities, msg, signature, err := messaging.ParseMultipartMessage(envelope)
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
					app.EmitEvent("code:code-block:stream", project_types.StreamEventType{
						MessageId: msgId,
						Name:      name,
						Text:      text,
					})
				}
			case "execute_result":
				log.Printf("✅ Execution result: %v\n", msg.Content["data"])
			case "status":
				status, isString := msg.Content["execution_state"].(string)
				if isString {
					statusEventData := struct {
						Status   string `json:"status"`
						Language string `json:"language"`
					}{
						Status:   status,
						Language: language,
					}
					app.EmitEvent("code:kernel:status", statusEventData)
					parentMessageType, ok := msg.ParentHeader["msg_type"].(string)
					if !ok {
						continue
					}
					// After the shutdown_request, everything listen function should be exited from
					if parentMessageType == "shutdown_request" && status == "idle" {
						cancelFunc()
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

func CreateHeartbeatSocketReq() *zmq4.Socket {
	heartbeatSocket, err := zmq4.NewSocket(zmq4.REQ)
	if err != nil {
		log.Print("Could not create ❤️beat socket:", err)
		return nil
	}
	return heartbeatSocket
}

type HeartbeatEvent struct {
	Language string `json:"language"`
	Status   string `json:"status"`
}

var HEARTBEAT_TICKER = 1 * time.Second

func ListenToHeartbeatSocket(
	heartbeatSocketReq *zmq4.Socket,
	language string,
	connectionInfo project_types.KernelConnectionInfo,
	ctx context.Context,
	heartbeatState *kernel_helpers.KernelHeartbeatState,
) {
	defer heartbeatSocketReq.Close()

	heartbeatAddress := fmt.Sprintf("tcp://%s:%d", connectionInfo.IP, connectionInfo.HBPort)

	if err := heartbeatSocketReq.Connect(heartbeatAddress); err != nil {
		log.Fatal("Could not connect ❤️ socket sender to port:", err)
	}

	ticker := time.NewTicker(HEARTBEAT_TICKER)
	defer ticker.Stop()
	app := application.Get()

	for {
		select {
		case <-ctx.Done():
			log.Println("🛑 heartbeat socket listener received context cancellation")
			return
		case <-ticker.C:
			// Send ping first
			ping := []byte("ping")
			_, err := heartbeatSocketReq.SendBytes(ping, 0)
			if err != nil {
				log.Printf("Could not send heartbeat ping: %v", err)
				heartbeatState.UpdateHeartbeatStatus(false)
				app.EmitEvent("code:kernel:heartbeat", HeartbeatEvent{
					Status: "failure",
				})
				continue
			}

			// Set a timeout for receiving the response
			heartbeatSocketReq.SetRcvtimeo(2 * time.Second) // Timeout after 2 seconds

			// Receive response
			pingResponse, err := heartbeatSocketReq.RecvBytes(0)
			if err != nil {
				if strings.Contains(err.Error(), "resource temporarily unavailable") {
					// Timeout occurred
					log.Println("Heartbeat response timeout")
					heartbeatState.UpdateHeartbeatStatus(false)
					app.EmitEvent("code:kernel:heartbeat", HeartbeatEvent{
						Language: language,
						Status:   "failure",
					})
					continue
				}
				log.Printf("Could not receive heartbeat response: %v", err)
				heartbeatState.UpdateHeartbeatStatus(false)
				app.EmitEvent("code:kernel:heartbeat", HeartbeatEvent{
					Language: language,
					Status:   "failure",
				})
				continue
			}

			// Successfully received response
			log.Printf("Received heartbeat response: %s\n", pingResponse)
			heartbeatState.UpdateHeartbeatStatus(true)
			app.EmitEvent("code:kernel:heartbeat", HeartbeatEvent{
				Language: language,
				Status:   "success",
			})
		}
	}
}

func CreateControlSocketDealer() *zmq4.Socket {
	controlSocketDealer, err := zmq4.NewSocket(zmq4.DEALER) // Could also use REQ
	if err != nil {
		log.Print("Could not create 🛂 socket sender:", err)
		return nil
	}
	return controlSocketDealer
}

func ListenToControlSocket(
	controlSocketDealer *zmq4.Socket,
	connectionInfo project_types.KernelConnectionInfo,
	ctx context.Context,
	codeServiceUpdater contracts.CodeServiceUpdater,
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
			log.Println("🛑 Control socket listener received context cancellation")
			app.EmitEvent("code:kernel:shutdown_reply", project_types.ShutdownReplyEventType{
				Status:   "success",
				Language: connectionInfo.Language,
			})
			codeServiceUpdater.ResetCodeServiceProperties()
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

			identities, msg, signature, err := messaging.ParseMultipartMessage(envelope)
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
				restart, ok := msg.Content["restart"].(bool)
				if !ok {
					log.Println("⚠️ Invalid restart type")
				}

				status, ok := msg.Content["status"].(string)
				if !ok {
					log.Println("⚠️ Invalid status type")
				}
				// TODO: Handle restart functionality later
				if status == "ok" && !restart {
				} else if status != "ok" {
					app.EmitEvent("code:kernel:shutdown_reply", project_types.ShutdownReplyEventType{
						Status:   "error",
						Language: connectionInfo.Language,
					})
				}
			}
		}
	}
}
