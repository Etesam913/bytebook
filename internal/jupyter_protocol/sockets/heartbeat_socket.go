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
	"github.com/wailsapp/wails/v3/pkg/application"
)

type heartbeatSocket struct {
	socket         *zmq4.Socket
	heartbeatState *jupyter_protocol.KernelHeartbeatState
}

type heartbeatEvent struct {
	Language string `json:"language"`
	Status   string `json:"status"`
}

var HEARTBEAT_TICKER = 1 * time.Second

func CreateHeartbeatSocket(heartbeatState *jupyter_protocol.KernelHeartbeatState) *heartbeatSocket {
	socket, err := zmq4.NewSocket(zmq4.REQ)
	if err != nil {
		log.Print("Could not create ❤️beat socket:", err)
		return &heartbeatSocket{
			socket:         nil,
			heartbeatState: heartbeatState,
		}
	}
	return &heartbeatSocket{
		socket:         socket,
		heartbeatState: heartbeatState,
	}
}

func (h *heartbeatSocket) Get() *zmq4.Socket {
	return h.socket
}

func (h *heartbeatSocket) Listen(
	heartbeatSocketReq *zmq4.Socket,
	connectionInfo config.KernelConnectionInfo,
	ctx context.Context,
) {
	defer heartbeatSocketReq.Close()
	app := application.Get()

	heartbeatAddress := fmt.Sprintf("tcp://%s:%d", connectionInfo.IP, connectionInfo.HBPort)
	if err := heartbeatSocketReq.Connect(heartbeatAddress); err != nil {
		log.Fatal("Could not connect ❤️ socket sender to port:", err)
	}

	ticker := time.NewTicker(HEARTBEAT_TICKER)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			heartbeatSocketReq.Close()
			log.Println("🛑 heartbeat socket listener received context cancellation")
			return
		case <-ticker.C:
			ping := []byte("ping")
			_, err := heartbeatSocketReq.SendBytes(ping, 0)
			if err != nil {
				log.Printf("Could not send heartbeat ping: %v", err)
				h.heartbeatState.UpdateHeartbeatStatus(false)
				app.EmitEvent("code:kernel:heartbeat", heartbeatEvent{
					Language: connectionInfo.Language,
					Status:   "failure",
				})
				continue
			}

			heartbeatSocketReq.SetRcvtimeo(2 * time.Second)

			pingResponse, err := heartbeatSocketReq.RecvBytes(0)
			if err != nil {
				if strings.Contains(err.Error(), "resource temporarily unavailable") {
					log.Println("Heartbeat response timeout")
					h.heartbeatState.UpdateHeartbeatStatus(false)
					app.EmitEvent("code:kernel:heartbeat", heartbeatEvent{
						Language: connectionInfo.Language,
						Status:   "failure",
					})
					continue
				}
				log.Printf("Could not receive heartbeat response: %v", err)
				h.heartbeatState.UpdateHeartbeatStatus(false)
				app.EmitEvent("code:kernel:heartbeat", heartbeatEvent{
					Language: connectionInfo.Language,
					Status:   "failure",
				})
				continue
			}

			log.Printf("Received heartbeat response: %s\n", pingResponse)
			h.heartbeatState.UpdateHeartbeatStatus(true)
			app.EmitEvent("code:kernel:heartbeat", heartbeatEvent{
				Language: connectionInfo.Language,
				Status:   "success",
			})
		}
	}
}
