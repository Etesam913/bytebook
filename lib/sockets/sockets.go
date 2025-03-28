package sockets

import (
	"fmt"
	"log"
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
		log.Fatal("Could not create 🐚 socket sender:", err)
	}
	return shellSocketDealer
}

func ListenToShellSocket(shellSocketDealer *zmq4.Socket, connectionInfo ConnectionInfo) {
	defer shellSocketDealer.Close()
	app := application.Get()
	// Connect to the same IP and shell port as your Shell socket
	shellAddress := fmt.Sprintf("tcp://%s:%d", connectionInfo.IP, connectionInfo.ShellPort)
	if err := shellSocketDealer.Connect(shellAddress); err != nil {
		log.Fatal("Could not connect 🐚 socket sender to port:", err)
	}

	for {
		envelope, err := shellSocketDealer.RecvMessageBytes(0)
		if err != nil {
			log.Fatal(err)
		}

		identities, msg, signature, err := messaging.ParseMultipartMessage(envelope)
		if err != nil {
			log.Println("Error parsing message:", err)
			continue
		}

		// Log the parsed message
		log.Println("🐚 shell socket identities:", identities)
		log.Println("🐚 shell socket signature:", signature)
		log.Println("🐚 shell socket parent header:", msg.ParentHeader)
		log.Println("🐚 shell socket message type:", msg.Header.MsgType)
		log.Println("🐚 shell socket content:", msg.Content)
		switch msg.Header.MsgType {
		case "execute_reply":
			log.Printf("🗨️ Execution reply: %v\n", msg.Content["status"])
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
			// emit kernel:python:code-block-{msg.Header.MsgID}:execute_result event here
			fmt.Println("---")
			time.Sleep(100 * time.Millisecond)
		}
	}
}

func CreateIOPubSocketSubscriber() *zmq4.Socket {
	iopubSocketSubscriber, err := zmq4.NewSocket(zmq4.SUB)
	if err != nil {
		log.Fatal("Could not create io 🍺 socket subscriber:", err)
	}
	return iopubSocketSubscriber
}

func ListenToIOPubSocket(language string, ioPubSocketSubscriber *zmq4.Socket, connectionInfo ConnectionInfo) {
	defer ioPubSocketSubscriber.Close()

	// Connect to the same IP and iopub port as your IOPub socket
	ioPubAddress := fmt.Sprintf("tcp://%s:%d", connectionInfo.IP, connectionInfo.IOPubPort)
	if err := ioPubSocketSubscriber.Connect(ioPubAddress); err != nil {
		log.Fatal("Could not connect io 🍺 socket subscriber to port:", err)
	}

	app := application.Get()
	if err := ioPubSocketSubscriber.SetSubscribe(""); err != nil {
		log.Fatal("Could not set subscribe:", err)
	}

	for {
		// Receive a multipart message
		envelope, err := ioPubSocketSubscriber.RecvMessageBytes(0)
		if err != nil {
			log.Fatal(err)
		}

		// Parse the multipart message
		identities, msg, signature, err := messaging.ParseMultipartMessage(envelope)
		if err != nil {
			log.Println("Error parsing message:", err)
			continue
		}

		msgId, ok := msg.ParentHeader["msg_id"].(string)
		if !ok {
			log.Println("⚠️ Invalid message ID type")
			continue
		}

		// Log the parsed message
		log.Println("io 🍺 socket identities:", identities)
		log.Println("io 🍺 socket signature:", signature)
		log.Println("io 🍺 socket parent header:", msg.ParentHeader)
		log.Println("io 🍺 socket message type:", msg.Header.MsgType)
		log.Println("io 🍺 socket content:", msg.Content)
		// Handle specific message types
		switch msg.Header.MsgType {
		case "stream":
			log.Printf("📢 Stdout: %s\n", msg.Content["text"])
			name, isNameString := msg.Content["name"].(string)
			text, isTextString := msg.Content["text"].(string)
			if isNameString && isTextString {
				app.EmitEvent("code:code-block:stream", project_types.StreamEventType{
					MessageId: msgId,
					Name:      name,
					Text:      text,
				})
			}
			// emit kernel:python:code-block-{msg.Header.MsgID}:stdout event here
		case "execute_result":
			log.Printf("✅ Execution result: %v\n", msg.Content["data"])
			// app.EmitEvent("code:code-block:execute_result", project_types.ExecuteResultEventType{
			// 	MessageId: msgId,
			// 	Data:      msg.Content["data"],
			// })
			// emit kernel:python:code-block-{msg.Header.MsgID}:execute_result event here
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
			log.Printf("🔄 Code Execution State: %s\n", msg.Content["execution_state"])
			// emit kernel:python:code-block-{msg.Header.MsgID}:status event here
		case "error":
			log.Printf("❌ Execution error: %v\n", msg.Content["traceback"])
			// emit kernel:python:code-block-{msg.Header.MsgID}:error event here
		}
		fmt.Println("---")

		time.Sleep(100 * time.Millisecond)
	}
}
