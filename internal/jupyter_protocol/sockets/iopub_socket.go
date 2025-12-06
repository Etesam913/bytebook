package sockets

import (
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
)

type ioPubSocket struct {
	socket     *zmq4.Socket
	language   string
	cancelFunc context.CancelFunc
}

type executeResultEvent struct {
	MessageId string            `json:"messageId"`
	Data      map[string]string `json:"data"`
}

type executeInputEvent struct {
	MessageId      string `json:"messageId"`
	Code           string `json:"code"`
	ExecutionCount int    `json:"executionCount"`
}

type kernelStatusEvent struct {
	Status   string `json:"status"`
	Language string `json:"language"`
}

type codeBlockStatusEvent struct {
	MessageId string `json:"messageId"`
	Status    string `json:"status"`
	Duration  string `json:"duration"`
}

type streamEvent struct {
	MessageId string `json:"messageId"`
	Name      string `json:"name"`
	Text      string `json:"text"`
}

type errorEvent struct {
	MessageId      string   `json:"messageId"`
	ErrorName      string   `json:"errorName"`
	ErrorValue     string   `json:"errorValue"`
	ErrorTraceback []string `json:"errorTraceback"`
}

func CreateIOPubSocket(language string, cancelFunc context.CancelFunc) *ioPubSocket {
	iopubSocketSubscriber, err := zmq4.NewSocket(zmq4.Type(zmq4.SUB))
	if err != nil {
		log.Print("Could not create io 🍺 socket subscriber:", err)
		return &ioPubSocket{
			socket:     nil,
			language:   language,
			cancelFunc: cancelFunc,
		}
	}
	return &ioPubSocket{
		socket:     iopubSocketSubscriber,
		language:   language,
		cancelFunc: cancelFunc,
	}
}

func (i *ioPubSocket) Get() *zmq4.Socket {
	return i.socket
}

func (i *ioPubSocket) Listen(
	ioPubSocketSubscriber *zmq4.Socket,
	connectionInfo config.KernelConnectionInfo,
	ctx context.Context,
) {
	if ioPubSocketSubscriber == nil {
		log.Println("🍺 IOPub socket is nil, cannot listen")
		return
	}

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
			envelope, err := ioPubSocketSubscriber.RecvMessageBytes(zmq4.Flag(zmq4.DONTWAIT))
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
				log.Printf("⚠️ Invalid message ID type: %v (type: %T)", msg.ParentHeader["msg_id"], msg.ParentHeader["msg_id"])
				continue
			}

			log.Println("io 🍺 socket identities:", identities)
			log.Println("io 🍺 socket signature:", signature)
			log.Println("io 🍺 socket parent header:", msg.ParentHeader)
			log.Println("io 🍺 socket message type:", msg.Header.MsgType)
			log.Println("io 🍺 socket content:", msg.Content)

			switch msg.Header.MsgType {
			case IOPubSocket.Stream:
				name, isNameString := msg.Content["name"].(string)
				text, isTextString := msg.Content["text"].(string)
				if isNameString && isTextString {
					htmlStr := string(ansihtml.ConvertToHTML([]byte(text)))
					app.Event.EmitEvent(&application.CustomEvent{
						Name: util.Events.CodeBlockStream,
						Data: streamEvent{
							MessageId: msgId,
							Name:      name,
							Text:      htmlStr,
						},
					})
				}
			case IOPubSocket.ExecuteResult:
				log.Printf("✅ Execution result: %v\n", msg.Content["data"])
				dataMap, exists := msg.Content["data"].(map[string]any)

				if exists {
					// Create a structure to hold the execution result with different mime types
					executionResult := executeResultEvent{
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
					app.Event.EmitEvent(&application.CustomEvent{
						Name: util.Events.CodeBlockExecuteResult,
						Data: executionResult,
					})
				}
			case IOPubSocket.DisplayData:
				log.Printf("🖼️ Display data: %v\n", msg.Content["data"])
				dataMap, exists := msg.Content["data"].(map[string]any)

				if exists {
					// Create a structure to hold the display data with different mime types
					displayData := executeResultEvent{
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
					app.Event.EmitEvent(&application.CustomEvent{
						Name: util.Events.CodeBlockDisplayData,
						Data: displayData,
					})
				}
			case IOPubSocket.ExecuteInput:
				log.Printf("🎯 Execute input: %v\n", msg.Content)
				code, isCodeString := msg.Content["code"].(string)
				executionCount, isExecutionCountFloat := msg.Content["execution_count"].(float64)

				if isCodeString && isExecutionCountFloat {
					executeInputData := executeInputEvent{
						MessageId:      msgId,
						Code:           code,
						ExecutionCount: int(executionCount),
					}
					app.Event.EmitEvent(&application.CustomEvent{
						Name: util.Events.CodeBlockExecuteInput,
						Data: executeInputData,
					})
				}
			case IOPubSocket.Status:
				status, isString := msg.Content["execution_state"].(string)
				if isString {
					statusEventData := kernelStatusEvent{
						Status:   status,
						Language: i.language,
					}

					app.Event.EmitEvent(&application.CustomEvent{
						Name: util.Events.KernelStatus,
						Data: statusEventData,
					})
					parentMessageType, ok := msg.ParentHeader["msg_type"].(string)
					if !ok {
						continue
					}
					if parentMessageType == "execute_request" {
						curTime := time.Now()
						msgParts := strings.Split(msgId, "|")
						// The msgId should be made up of {codeBlockId:executionId}|{startTime}
						if len(msgParts) < 3 {
							continue
						}
						requestTimeString := msgParts[2]
						requestTime, err := time.Parse(time.RFC3339, requestTimeString)
						if err != nil {
							log.Printf("⚠️ Error parsing request time: %v (requestTimeString: %s)", err, requestTimeString)
							continue
						}

						duration := ""

						if status == "idle" {
							duration = util.FormatExecutionDuration(requestTime, curTime)
						}
						app.Event.EmitEvent(&application.CustomEvent{
							Name: util.Events.CodeBlockStatus,
							Data: codeBlockStatusEvent{
								MessageId: msgId,
								Status:    status,
								Duration:  duration,
							},
						})
					} else if parentMessageType == "shutdown_request" && status == "idle" {
						// After the shutdown_request, everything listen function should be exited from
						i.cancelFunc()
					}
				}
			case IOPubSocket.Error:
				log.Printf("❌ Execution error: %v\n", msg.Content["traceback"])
				errorName := ""
				errorValue := ""
				uncleanTraceback, ok := msg.Content["traceback"].([]any)
				errorTraceback := []string{}

				if !ok {
					log.Printf("⚠️ Invalid traceback type: %v (type: %T)", msg.Content["traceback"], msg.Content["traceback"])
				} else {
					for _, item := range uncleanTraceback {
						if ansiStr, ok := item.(string); ok {
							htmlStr := string(ansihtml.ConvertToHTML([]byte(ansiStr)))
							errorTraceback = append(errorTraceback, htmlStr)
						}
					}
				}

				if errorName, ok = msg.Content["ename"].(string); !ok {
					log.Printf("⚠️ Invalid error name type: %v (type: %T)", msg.Content["ename"], msg.Content["ename"])
					errorName = ""
				}
				if errorValue, ok = msg.Content["evalue"].(string); !ok {
					log.Printf("⚠️ Invalid error value type: %v (type: %T)", msg.Content["evalue"], msg.Content["evalue"])
					errorValue = ""
				}
				app.Event.EmitEvent(&application.CustomEvent{
					Name: util.Events.CodeBlockIopubError,
					Data: errorEvent{
						MessageId:      msgId,
						ErrorName:      errorName,
						ErrorValue:     errorValue,
						ErrorTraceback: errorTraceback,
					},
				})
			}
			fmt.Println("---")
			time.Sleep(100 * time.Millisecond)
		}
	}
}
