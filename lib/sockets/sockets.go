package sockets

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/etesam913/bytebook/lib/messaging"
	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/pebbe/zmq4"
	"github.com/robert-nix/ansihtml"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type ConnectionInfo struct {
	SignatureScheme string `json:"signature_scheme"`
	Transport       string `json:"transport"`
	StdinPort       int    `json:"stdin_port"`
	ControlPort     int    `json:"control_port"`
	IOPubPort       int    `json:"iopub_port"`
	HBPort          int    `json:"hb_port"`
	ShellPort       int    `json:"shell_port"`
	Key             string `json:"key"`
	IP              string `json:"ip"`
}

type Sockets struct {
	ShellSocket   *zmq4.Socket
	ControlSocket *zmq4.Socket
	StdinSocket   *zmq4.Socket
	IOPubSocket   *zmq4.Socket
	HBSocket      *zmq4.Socket
	Key           []byte
}

func CreateShellSocketDealer() *zmq4.Socket {
	shellSocketDealer, err := zmq4.NewSocket(zmq4.DEALER) // Could also use REQ
	if err != nil {
		log.Print("Could not create 🐚 socket sender:", err)
		return nil
	}
	return shellSocketDealer
}

func ListenToShellSocket(shellSocketDealer *zmq4.Socket, connectionInfo ConnectionInfo, ctx context.Context) {
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

				app.CurrentWindow().EmitEvent(
					"code:code-block:execute-reply",
					project_types.KernelCodeBlockExecuteReply{
						Status:         status,
						MessageId:      msgId,
						ErrorName:      errorName,
						ErrorValue:     errorValue,
						ErrorTraceback: errorTraceback,
					},
				)
				fmt.Println("---")
				time.Sleep(100 * time.Millisecond)
			}
		}
	}
}

func CreateIOPubSocketSubscriber() *zmq4.Socket {
	iopubSocketSubscriber, err := zmq4.NewSocket(zmq4.SUB)
	if err != nil {
		log.Printf("Could not create io 🍺 socket subscriber:", err)
		return nil
	}
	return iopubSocketSubscriber
}

func ListenToIOPubSocket(ioPubSocketSubscriber *zmq4.Socket, language string, connectionInfo ConnectionInfo, ctx context.Context) {
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

var HEARTBEAT_TICKER = 3 * time.Second

func ListenToHeartbeatSocket(heartbeatSocketReq *zmq4.Socket, language string, connectionInfo ConnectionInfo, ctx context.Context) {
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
					app.EmitEvent("code:kernel:heartbeat", HeartbeatEvent{
						Language: language,
						Status:   "failure",
					})
					continue
				}
				log.Printf("Could not receive heartbeat response: %v", err)
				app.EmitEvent("code:kernel:heartbeat", HeartbeatEvent{
					Language: language,
					Status:   "failure",
				})
				continue
			}

			// Successfully received response
			log.Printf("Received heartbeat response: %s\n", pingResponse)
			app.EmitEvent("code:kernel:heartbeat", HeartbeatEvent{
				Language: language,
				Status:   "success",
			})
		}
	}
}
