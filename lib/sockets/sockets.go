package sockets

import (
	"fmt"
	"log"
	"time"

	"github.com/etesam913/bytebook/lib/messaging"
	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/pebbe/zmq4"
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
		// log.Println("🐚 shell socket header", msg.Header)
		log.Println("🐚 shell socket message type:", msg.Header.MsgType)
		log.Println("🐚 shell socket content:", msg.Content)
		switch msg.Header.MsgType {
		case "execute_reply":
			log.Printf("🗨️ Execution reply: %v\n", msg.Content["status"])
			app.CurrentWindow().EmitEvent(
				"kernel:code-block:execute-reply",
				project_types.KernelCodeBlockExecuteReply{
					Status: msg.Content["status"].(string),
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

func ListenToIOPubSocket(language string, iopubSocketSubscriber *zmq4.Socket, connectionInfo ConnectionInfo) {
	defer iopubSocketSubscriber.Close()

	// Connect to the same IP and iopub port as your IOPub socket
	iopubAddress := fmt.Sprintf("tcp://%s:%d", connectionInfo.IP, connectionInfo.IOPubPort)
	if err := iopubSocketSubscriber.Connect(iopubAddress); err != nil {
		log.Fatal("Could not connect io 🍺 socket subscriber to port:", err)
	}

	// Listen to everything
	iopubSocketSubscriber.SetSubscribe("")
	app := application.Get()
	for {
		// Receive a multipart message
		envelope, err := iopubSocketSubscriber.RecvMessageBytes(0)
		if err != nil {
			log.Fatal(err)
		}

		// Parse the multipart message
		identities, msg, signature, err := messaging.ParseMultipartMessage(envelope)
		if err != nil {
			log.Println("Error parsing message:", err)
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
			// emit kernel:python:code-block-{msg.Header.MsgID}:stdout event here
		case "execute_result":
			log.Printf("✅ Execution result: %v\n", msg.Content["data"])
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
