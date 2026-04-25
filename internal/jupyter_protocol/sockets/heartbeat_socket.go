package sockets

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/etesam913/bytebook/internal/jupyter_protocol"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/pebbe/zmq4"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type heartbeatSocket struct {
	socket                 *zmq4.Socket
	heartbeatState         *jupyter_protocol.KernelHeartbeatState
	cancelFunc             context.CancelFunc
	consecutiveFailures    int
	maxConsecutiveFailures int
}

type heartbeatEvent struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

var HEARTBEAT_TICKER = 1 * time.Second

func createHeartbeatSocket(p CreateParams) *heartbeatSocket {
	socket, err := zmq4.NewSocket(zmq4.Type(zmq4.REQ))
	if err != nil {
		log.Print("Could not create ❤️beat socket:", err)
		return nil
	}
	return &heartbeatSocket{
		socket:                 socket,
		heartbeatState:         p.HeartbeatState,
		cancelFunc:             p.Cancel,
		consecutiveFailures:    0,
		maxConsecutiveFailures: 5,
	}
}

func (h *heartbeatSocket) Listen(p CreateParams) {
	if h.socket == nil {
		log.Println("❤️ Heartbeat socket is nil, cannot listen")
		return
	}
	defer h.socket.Close()
	app := application.Get()

	heartbeatAddress := fmt.Sprintf("tcp://%s:%d", p.ConnectionInfo.IP, p.ConnectionInfo.HBPort)
	if err := h.socket.Connect(heartbeatAddress); err != nil {
		log.Printf("Could not connect ❤️ socket: %v", err)
		return
	}

	ticker := time.NewTicker(HEARTBEAT_TICKER)
	defer ticker.Stop()

	for {
		select {
		case <-p.Ctx.Done():
			log.Println("🛑 heartbeat socket listener received context cancellation")
			return
		case <-ticker.C:
			ping := []byte("ping")
			_, err := h.socket.SendBytes(ping, 0)
			if err != nil {
				log.Printf("Could not send heartbeat ping: %v", err)
				h.consecutiveFailures++
				h.handleFailure(p.InstanceID, app)
				if h.consecutiveFailures >= h.maxConsecutiveFailures {
					log.Printf("❌ Heartbeat failed %d consecutive times, kernel appears dead", h.consecutiveFailures)
					h.cancelFunc()
					return
				}
				continue
			}

			h.socket.SetRcvtimeo(2 * time.Second)
			pingResponse, err := h.socket.RecvBytes(0)
			if err != nil {
				if !strings.Contains(err.Error(), "resource temporarily unavailable") {
					log.Printf("Could not receive heartbeat response: %v", err)
				}
				h.consecutiveFailures++
				h.handleFailure(p.InstanceID, app)
				if h.consecutiveFailures >= h.maxConsecutiveFailures {
					log.Printf("❌ Heartbeat failed %d consecutive times, kernel appears dead", h.consecutiveFailures)
					h.cancelFunc()
					return
				}
				continue
			}

			log.Printf("Received heartbeat response: %s\n", pingResponse)
			h.consecutiveFailures = 0
			h.heartbeatState.UpdateHeartbeatStatus(true)
			if app != nil {
				app.Event.EmitEvent(&application.CustomEvent{
					Name: util.Events.KernelInstanceHeartbeat,
					Data: heartbeatEvent{ID: p.InstanceID, Status: "success"},
				})
			}
		}
	}
}

func (h *heartbeatSocket) handleFailure(instanceID string, app *application.App) {
	h.heartbeatState.UpdateHeartbeatStatus(false)
	if app != nil {
		app.Event.EmitEvent(&application.CustomEvent{
			Name: util.Events.KernelInstanceHeartbeat,
			Data: heartbeatEvent{ID: instanceID, Status: "failure"},
		})
	}
}
