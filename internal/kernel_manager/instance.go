package kernel_manager

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os/exec"
	"sync"
	"time"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/jupyter_protocol"
	"github.com/etesam913/bytebook/internal/jupyter_protocol/sockets"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// KernelInstance represents a single kernel process and its sockets. Each instance
// is bound to a single (language, noteID) pair.
type KernelInstance struct {
	id                 string
	language           string
	scopeType          string
	scopeID            string
	connectionFilePath string
	connectionInfo     config.KernelConnectionInfo
	processHandle      *exec.Cmd
	processWait        chan error
	stderrBuf          stderrReader
	sockets        *sockets.LanguageSockets
	heartbeatState *jupyter_protocol.KernelHeartbeatState
	mu               sync.RWMutex
	activeExecutions map[string]struct{}
	executionQueue   []string
	lastActivityAt   time.Time
	ctx    context.Context
	cancel context.CancelFunc
	manager *KernelManager
}

// stderrReader is the minimal interface kernel.go's *bytes.Buffer satisfies.
type stderrReader interface {
	String() string
}

// ID returns the unique identifier for this kernel instance.
func (i *KernelInstance) ID() string { return i.id }

// Language returns the programming language this kernel runs.
func (i *KernelInstance) Language() string { return i.language }

// NoteID returns the note this kernel is bound to.
func (i *KernelInstance) NoteID() string { return i.scopeID }

// ScopeType returns the kernel's scope type (currently always "note").
func (i *KernelInstance) ScopeType() string { return i.scopeType }

// IsIdle reports whether the kernel has no in-flight executions and an empty queue.
// The heartbeat must also be alive — a dead kernel is not "idle" for eviction purposes.
func (i *KernelInstance) IsIdle() bool {
	i.mu.RLock()
	defer i.mu.RUnlock()
	if !i.heartbeatState.GetHeartbeatStatus() {
		return false
	}
	return len(i.activeExecutions) == 0 && len(i.executionQueue) == 0
}

// LastActivity returns the timestamp of the most recent execution send / status change.
func (i *KernelInstance) LastActivity() time.Time {
	i.mu.RLock()
	defer i.mu.RUnlock()
	return i.lastActivityAt
}

// MarkActivity bumps the last-activity timestamp.
func (i *KernelInstance) MarkActivity() {
	i.mu.Lock()
	defer i.mu.Unlock()
	i.lastActivityAt = time.Now()
}

// trackExecutionStart records that an execution is in flight.
func (i *KernelInstance) trackExecutionStart(messageID string) {
	i.mu.Lock()
	defer i.mu.Unlock()
	if i.activeExecutions == nil {
		i.activeExecutions = map[string]struct{}{}
	}
	i.activeExecutions[messageID] = struct{}{}
	i.lastActivityAt = time.Now()
}

// trackExecutionEnd clears an in-flight execution.
func (i *KernelInstance) trackExecutionEnd(messageID string) {
	i.mu.Lock()
	defer i.mu.Unlock()
	delete(i.activeExecutions, messageID)
	i.lastActivityAt = time.Now()
}

// Snapshot returns a JSON-serializable view of this instance for the frontend.
func (i *KernelInstance) Snapshot() KernelInstanceSnapshot {
	i.mu.RLock()
	defer i.mu.RUnlock()
	return KernelInstanceSnapshot{
		ID:               i.id,
		Language:         i.language,
		NoteID:           i.scopeID,
		ScopeType:        i.scopeType,
		Heartbeat:        boolToHeartbeatStatus(i.heartbeatState.GetHeartbeatStatus()),
		LastActivityAt:   i.lastActivityAt.UnixMilli(),
		ActiveExecutions: len(i.activeExecutions),
	}
}

// KernelInstanceSnapshot is a JSON-marshalable view used in events and List() results.
type KernelInstanceSnapshot struct {
	ID               string `json:"id"`
	Language         string `json:"language"`
	NoteID           string `json:"noteId"`
	ScopeType        string `json:"scopeType"`
	Heartbeat        string `json:"heartbeat"`
	LastActivityAt   int64  `json:"lastActivityAt"`
	ActiveExecutions int    `json:"activeExecutions"`
}

func boolToHeartbeatStatus(ok bool) string {
	if ok {
		return "success"
	}
	return "idle"
}

// generateHMACKey returns a 32-byte hex-encoded random key for per-instance signing.
func generateHMACKey() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("failed to generate hmac key: %w", err)
	}
	return hex.EncodeToString(buf), nil
}

// SendExecute sends an execute_request on this instance's shell socket. The
// activeExecutions map is updated by the iopub goroutine via OnExecuteStatus,
// keyed by the full Jupyter parent_msg_id (which includes the timestamp suffix).
func (i *KernelInstance) SendExecute(codeBlockID, executionID, code string) error {
	if i.sockets == nil || i.sockets.ShellSocketDealer == nil {
		return fmt.Errorf("shell socket not initialized")
	}
	messageID := fmt.Sprintf("%s|%s", codeBlockID, executionID)
	if err := jupyter_protocol.SendExecuteRequest(
		i.sockets.ShellSocketDealer,
		jupyter_protocol.ExecuteMessageParams{
			MessageParams: jupyter_protocol.MessageParams{
				MessageID: messageID,
				SessionID: "current-session",
				Key:       i.connectionInfo.Key,
			},
			Code: code,
		},
	); err != nil {
		return err
	}
	i.MarkActivity()
	return nil
}

// SendInterrupt sends an interrupt_request on the control socket.
func (i *KernelInstance) SendInterrupt(codeBlockID, executionID string) error {
	if i.sockets == nil || i.sockets.ControlSocketDealer == nil {
		return fmt.Errorf("control socket not initialized")
	}
	return jupyter_protocol.SendInterruptMessage(
		i.sockets.ControlSocketDealer,
		jupyter_protocol.MessageParams{
			MessageID: fmt.Sprintf("%s|%s", codeBlockID, executionID),
			SessionID: "current-session",
			Key:       i.connectionInfo.Key,
		},
	)
}

// SendInputReply sends an input_reply on the stdin socket.
func (i *KernelInstance) SendInputReply(codeBlockID, executionID, value string) error {
	if i.sockets == nil || i.sockets.StdinSocketDealer == nil {
		return fmt.Errorf("stdin socket not initialized")
	}
	return jupyter_protocol.SendInputReplyMessage(
		i.sockets.StdinSocketDealer,
		jupyter_protocol.InputReplyMessageParams{
			MessageParams: jupyter_protocol.MessageParams{
				MessageID: fmt.Sprintf("%s|%s", codeBlockID, executionID),
				SessionID: "current-session",
				Key:       i.connectionInfo.Key,
			},
			Value: value,
		},
	)
}

// SendInspect sends an inspect_request on the shell socket and returns the generated message id.
func (i *KernelInstance) SendInspect(codeBlockID, executionID, code string, cursorPos, detailLevel int) (string, error) {
	if i.sockets == nil || i.sockets.ShellSocketDealer == nil {
		return "", fmt.Errorf("shell socket not initialized")
	}
	messageID := fmt.Sprintf("%s|%s|inspect_%d", codeBlockID, executionID, time.Now().UnixNano())
	err := jupyter_protocol.SendInspectRequest(
		i.sockets.ShellSocketDealer,
		jupyter_protocol.InspectRequestParams{
			MessageParams: jupyter_protocol.MessageParams{
				MessageID: messageID,
				SessionID: "current-session",
				Key:       i.connectionInfo.Key,
			},
			Code:        code,
			CursorPos:   cursorPos,
			DetailLevel: detailLevel,
		},
	)
	if err != nil {
		return "", err
	}
	return messageID, nil
}

// IsHeartbeating reports whether the heartbeat goroutine has confirmed the kernel is alive.
func (i *KernelInstance) IsHeartbeating() bool {
	if i.heartbeatState == nil {
		return false
	}
	return i.heartbeatState.GetHeartbeatStatus()
}

// shutdown attempts a graceful shutdown_request followed by a Kill timeout.
// Then cancels the context (which closes all socket goroutines), removes the
// connection file, and emits the shutdown event.
func (i *KernelInstance) shutdown(reason string, restart bool) error {
	graceful := 3 * time.Second
	if i.language == "java" {
		graceful = 5 * time.Second
	}

	if i.sockets != nil && i.heartbeatState != nil && i.heartbeatState.GetHeartbeatStatus() {
		// gonb only honors shutdown_request on the shell socket
		var sock = i.sockets.ControlSocketDealer
		if i.language == "go" && i.sockets.ShellSocketDealer != nil {
			sock = i.sockets.ShellSocketDealer
		}
		if sock != nil {
			_ = jupyter_protocol.SendShutdownMessage(sock, jupyter_protocol.ShutdownMessageParams{
				MessageParams: jupyter_protocol.MessageParams{
					MessageID: fmt.Sprintf("shutdown-%d", time.Now().UnixNano()),
					SessionID: "current-session",
					Key:       i.connectionInfo.Key,
				},
				Restart: restart,
			})
		}
	}

	if i.processHandle != nil && i.processHandle.Process != nil {
		select {
		case <-i.processWait:
			// already exited
		case <-time.After(graceful):
			_ = i.processHandle.Process.Kill()
			<-i.processWait
		}
	}

	if i.cancel != nil {
		i.cancel()
	}

	if err := removeConnectionFile(i.connectionFilePath); err != nil {
		return fmt.Errorf("failed to remove connection file: %w", err)
	}

	if app := application.Get(); app != nil {
		app.Event.EmitEvent(&application.CustomEvent{
			Name: kernelInstanceShutdownEvent,
			Data: shutdownPayload{
				ID:       i.id,
				Language: i.language,
				NoteID:   i.scopeID,
				Reason:   reason,
			},
		})
	}
	return nil
}
