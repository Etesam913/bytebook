package sockets

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/etesam913/bytebook/internal/jupyter_protocol"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/pebbe/zmq4"
	"github.com/robert-nix/ansihtml"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type ioPubSocket struct {
	socket *zmq4.Socket
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
	ID     string `json:"id"`
	Status string `json:"status"`
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

func createIOPubSocket(p CreateParams) *ioPubSocket {
	sock, err := zmq4.NewSocket(zmq4.Type(zmq4.SUB))
	if err != nil {
		log.Print("Could not create io 🍺 socket subscriber:", err)
		return nil
	}
	return &ioPubSocket{socket: sock}
}

func (i *ioPubSocket) Listen(p CreateParams) {
	if i.socket == nil {
		log.Println("🍺 IOPub socket is nil, cannot listen")
		return
	}
	defer i.socket.Close()

	ioPubAddress := fmt.Sprintf("tcp://%s:%d", p.ConnectionInfo.IP, p.ConnectionInfo.IOPubPort)
	if err := i.socket.Connect(ioPubAddress); err != nil {
		log.Printf("Could not connect io 🍺 socket: %v", err)
		return
	}

	app := application.Get()
	if err := i.socket.SetSubscribe(""); err != nil {
		log.Printf("Could not set subscribe: %v", err)
		return
	}

	for {
		select {
		case <-p.Ctx.Done():
			log.Println("🛑 IOPub socket listener received context cancellation")
			return
		default:
			envelope, err := i.socket.RecvMessageBytes(zmq4.Flag(zmq4.DONTWAIT))
			if err != nil {
				if strings.Contains(err.Error(), "resource temporarily unavailable") {
					time.Sleep(50 * time.Millisecond)
					continue
				}
				log.Println("🍺 Error receiving message:", err)
				continue
			}

			_, msg, _, err := jupyter_protocol.ParseMultipartMessage(envelope)
			if err != nil {
				log.Println("🍺 Error parsing message:", err)
				continue
			}

			msgId, ok := msg.ParentHeader["msg_id"].(string)
			if !ok {
				continue
			}

			switch msg.Header.MsgType {
			case IOPubSocket.Stream:
				name, isNameString := msg.Content["name"].(string)
				text, isTextString := msg.Content["text"].(string)
				if isNameString && isTextString && app != nil {
					htmlStr := string(ansihtml.ConvertToHTML([]byte(text)))
					app.Event.EmitEvent(&application.CustomEvent{
						Name: util.Events.CodeBlockStream,
						Data: streamEvent{MessageId: msgId, Name: name, Text: htmlStr},
					})
				}
			case IOPubSocket.ExecuteResult:
				dataMap, exists := msg.Content["data"].(map[string]any)
				if exists && app != nil {
					executionResult := executeResultEvent{MessageId: msgId, Data: map[string]string{}}
					for mimeType, content := range dataMap {
						if contentStr, ok := content.(string); ok {
							executionResult.Data[mimeType] = contentStr
						}
					}
					app.Event.EmitEvent(&application.CustomEvent{
						Name: util.Events.CodeBlockExecuteResult,
						Data: executionResult,
					})
				}
			case IOPubSocket.DisplayData:
				dataMap, exists := msg.Content["data"].(map[string]any)
				if exists && app != nil {
					displayData := executeResultEvent{MessageId: msgId, Data: map[string]string{}}
					for mimeType, content := range dataMap {
						if contentStr, ok := content.(string); ok {
							displayData.Data[mimeType] = contentStr
						}
					}
					app.Event.EmitEvent(&application.CustomEvent{
						Name: util.Events.CodeBlockDisplayData,
						Data: displayData,
					})
				}
			case IOPubSocket.ExecuteInput:
				code, isCodeString := msg.Content["code"].(string)
				executionCount, isExecutionCountFloat := msg.Content["execution_count"].(float64)
				if isCodeString && isExecutionCountFloat && app != nil {
					app.Event.EmitEvent(&application.CustomEvent{
						Name: util.Events.CodeBlockExecuteInput,
						Data: executeInputEvent{
							MessageId:      msgId,
							Code:           code,
							ExecutionCount: int(executionCount),
						},
					})
				}
			case IOPubSocket.Status:
				status, isString := msg.Content["execution_state"].(string)
				if !isString {
					continue
				}
				if app != nil {
					app.Event.EmitEvent(&application.CustomEvent{
						Name: util.Events.KernelInstanceStatus,
						Data: kernelStatusEvent{ID: p.InstanceID, Status: status},
					})
				}
				parentMessageType, ok := msg.ParentHeader["msg_type"].(string)
				if !ok {
					continue
				}
				if parentMessageType == "execute_request" {
					if p.OnExecuteStatus != nil {
						p.OnExecuteStatus(status, msgId)
					}
					curTime := time.Now()
					msgParts := strings.Split(msgId, "|")
					// messageId format: {codeBlockId}|{executionId}|{startTime}
					if len(msgParts) < 3 {
						continue
					}
					requestTime, err := time.Parse(time.RFC3339, msgParts[2])
					if err != nil {
						continue
					}
					duration := ""
					if status == "idle" {
						duration = util.FormatExecutionDuration(requestTime, curTime)
					}
					if app != nil {
						app.Event.EmitEvent(&application.CustomEvent{
							Name: util.Events.CodeBlockStatus,
							Data: codeBlockStatusEvent{MessageId: msgId, Status: status, Duration: duration},
						})
					}
				} else if parentMessageType == "shutdown_request" && status == "idle" {
					p.Cancel()
				}
			case IOPubSocket.Error:
				errorName := ""
				errorValue := ""
				errorTraceback := []string{}
				if uncleanTraceback, ok := msg.Content["traceback"].([]any); ok {
					for _, item := range uncleanTraceback {
						if ansiStr, ok := item.(string); ok {
							htmlStr := string(ansihtml.ConvertToHTML([]byte(ansiStr)))
							errorTraceback = append(errorTraceback, htmlStr)
						}
					}
				}
				if v, ok := msg.Content["ename"].(string); ok {
					errorName = v
				}
				if v, ok := msg.Content["evalue"].(string); ok {
					errorValue = v
				}
				if app != nil {
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
			}
			time.Sleep(100 * time.Millisecond)
		}
	}
}
