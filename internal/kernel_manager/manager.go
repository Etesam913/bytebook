package kernel_manager

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os/exec"
	"sort"
	"sync"
	"time"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/jupyter_protocol"
	"github.com/etesam913/bytebook/internal/jupyter_protocol/sockets"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/google/uuid"
	"github.com/wailsapp/wails/v3/pkg/application"
)

const (
	maxKernelsPerLanguage = 3
	heartbeatLaunchWait   = 3 * time.Second
	javaLaunchWait        = 5 * time.Second
)

// Event name aliases used internally by the package; bound to util.Events at init time.
var (
	kernelInstanceCreatedEvent     = util.Events.KernelInstanceCreated
	kernelInstanceShutdownEvent    = util.Events.KernelInstanceShutdown
	kernelInstanceLaunchErrorEvent = util.Events.KernelInstanceLaunchError
	kernelInstanceExitedEvent      = util.Events.KernelInstanceExited
)

// ErrNoIdleKernelToEvict is returned by GetOrCreate when the per-language pool is full
// and no instance is idle (no in-flight execute_request and empty queue).
var ErrNoIdleKernelToEvict = errors.New("no idle kernel to evict")

// LanguageNotSupportedError indicates the requested language has no kernel descriptor.
type LanguageNotSupportedError struct{ Language string }

func (e LanguageNotSupportedError) Error() string {
	return fmt.Sprintf("unsupported kernel language: %s", e.Language)
}

type langNoteKey struct {
	language string
	noteID   string
}

// KernelManager owns all live KernelInstance objects.
type KernelManager struct {
	projectPath string
	allKernels  config.AllKernels
	mu         sync.Mutex
	instances  map[string]*KernelInstance
	byLangNote map[langNoteKey]*KernelInstance
}

// New constructs a KernelManager. The caller should also call SetupKernelsDir(projectPath)
// once at startup to create the .kernels directory and wipe stale connection files.
func New(projectPath string, allKernels config.AllKernels) *KernelManager {
	return &KernelManager{
		projectPath: projectPath,
		allKernels:  allKernels,
		instances:   map[string]*KernelInstance{},
		byLangNote:  map[langNoteKey]*KernelInstance{},
	}
}

// Get returns the existing instance for (language, noteID) or nil if none exists.
func (m *KernelManager) Get(language, noteID string) *KernelInstance {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.byLangNote[langNoteKey{language: language, noteID: noteID}]
}

// GetByID returns the instance with the given id or nil.
func (m *KernelManager) GetByID(id string) *KernelInstance {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.instances[id]
}

// List returns snapshots of all live instances.
func (m *KernelManager) List() []KernelInstanceSnapshot {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]KernelInstanceSnapshot, 0, len(m.instances))
	for _, inst := range m.instances {
		out = append(out, inst.Snapshot())
	}
	return out
}

// MarkActivity bumps lastActivityAt on the named instance.
func (m *KernelManager) MarkActivity(id string) {
	if inst := m.GetByID(id); inst != nil {
		inst.MarkActivity()
	}
}

// GetOrCreate returns an existing kernel for (language, noteID), or launches a new one.
// If launching would exceed the per-language cap, an idle kernel is evicted (LRU). If
// no idle kernel exists, ErrNoIdleKernelToEvict is returned.
func (m *KernelManager) GetOrCreate(ctx context.Context, language, noteID, venvPath string) (*KernelInstance, error) {
	if !util.IsSupportedLanguage(language) {
		return nil, LanguageNotSupportedError{Language: language}
	}

	m.mu.Lock()
	if inst, ok := m.byLangNote[langNoteKey{language: language, noteID: noteID}]; ok {
		m.mu.Unlock()
		return inst, nil
	}

	// Count instances for this language and find idle candidates if at cap.
	count := 0
	idleCandidates := []*KernelInstance{}
	for _, inst := range m.instances {
		if inst.language != language {
			continue
		}
		count++
		if inst.IsIdle() {
			idleCandidates = append(idleCandidates, inst)
		}
	}
	if count >= maxKernelsPerLanguage {
		if len(idleCandidates) == 0 {
			m.mu.Unlock()
			return nil, ErrNoIdleKernelToEvict
		}
		sort.Slice(idleCandidates, func(a, b int) bool {
			return idleCandidates[a].LastActivity().Before(idleCandidates[b].LastActivity())
		})
		victim := idleCandidates[0]
		// Re-check idle while holding manager lock; if victim became active, fall back to next.
		if !victim.IsIdle() && len(idleCandidates) > 1 {
			victim = idleCandidates[1]
		}
		m.removeFromMapsLocked(victim)
		m.mu.Unlock()
		if err := victim.shutdown("evicted", false); err != nil {
			log.Printf("kernel_manager: error during eviction shutdown: %v", err)
		}
		m.mu.Lock()
	}
	m.mu.Unlock()

	// Launch a new instance outside the manager lock.
	inst, err := m.launch(ctx, language, noteID, venvPath)
	if err != nil {
		return nil, err
	}

	m.mu.Lock()
	// Re-check that no concurrent goroutine raced ahead.
	if existing, ok := m.byLangNote[langNoteKey{language: language, noteID: noteID}]; ok {
		m.mu.Unlock()
		_ = inst.shutdown("evicted", false)
		return existing, nil
	}
	m.instances[inst.id] = inst
	m.byLangNote[langNoteKey{language: language, noteID: noteID}] = inst
	m.mu.Unlock()

	if app := application.Get(); app != nil {
		app.Event.EmitEvent(&application.CustomEvent{
			Name: kernelInstanceCreatedEvent,
			Data: inst.Snapshot(),
		})
	}
	return inst, nil
}

// Shutdown gracefully shuts down the named instance.
func (m *KernelManager) Shutdown(id string, restart bool) error {
	m.mu.Lock()
	inst, ok := m.instances[id]
	if !ok {
		m.mu.Unlock()
		return fmt.Errorf("kernel instance %s not found", id)
	}
	m.removeFromMapsLocked(inst)
	m.mu.Unlock()
	return inst.shutdown("user", restart)
}

// ShutdownAll shuts down every live instance. Used at app exit.
func (m *KernelManager) ShutdownAll() {
	m.mu.Lock()
	all := make([]*KernelInstance, 0, len(m.instances))
	for _, inst := range m.instances {
		all = append(all, inst)
	}
	m.instances = map[string]*KernelInstance{}
	m.byLangNote = map[langNoteKey]*KernelInstance{}
	m.mu.Unlock()

	wg := sync.WaitGroup{}
	for _, inst := range all {
		wg.Add(1)
		go func(inst *KernelInstance) {
			defer wg.Done()
			_ = inst.shutdown("user", false)
		}(inst)
	}
	wg.Wait()
}

// ShutdownAllByLanguage shuts down every live instance for the given language.
func (m *KernelManager) ShutdownAllByLanguage(language string) {
	m.mu.Lock()
	matches := []*KernelInstance{}
	for _, inst := range m.instances {
		if inst.language == language {
			matches = append(matches, inst)
		}
	}
	for _, inst := range matches {
		m.removeFromMapsLocked(inst)
	}
	m.mu.Unlock()

	wg := sync.WaitGroup{}
	for _, inst := range matches {
		wg.Add(1)
		go func(inst *KernelInstance) {
			defer wg.Done()
			_ = inst.shutdown("user", false)
		}(inst)
	}
	wg.Wait()
}

// removeFromMapsLocked must be called with m.mu held.
func (m *KernelManager) removeFromMapsLocked(inst *KernelInstance) {
	delete(m.instances, inst.id)
	delete(m.byLangNote, langNoteKey{language: inst.language, noteID: inst.scopeID})
}

// launch spawns a new kernel process and wires up sockets for it.
func (m *KernelManager) launch(_ context.Context, language, noteID, venvPath string) (*KernelInstance, error) {
	id := uuid.NewString()

	ports, err := allocatePorts(5)
	if err != nil {
		return nil, fmt.Errorf("port allocation failed: %w", err)
	}

	key, err := generateHMACKey()
	if err != nil {
		return nil, err
	}

	connInfo := config.KernelConnectionInfo{
		Language:        language,
		DisplayName:     language,
		ShellPort:       ports[0],
		IOPubPort:       ports[1],
		StdinPort:       ports[2],
		ControlPort:     ports[3],
		HBPort:          ports[4],
		IP:              "127.0.0.1",
		Key:             key,
		Transport:       "tcp",
		SignatureScheme: "hmac-sha256",
	}

	connFilePath, err := writeConnectionFile(m.projectPath, id, connInfo)
	if err != nil {
		return nil, err
	}

	argv, err := m.argvForLanguage(language)
	if err != nil {
		_ = removeConnectionFile(connFilePath)
		return nil, err
	}

	cmd, stderrBuf, err := jupyter_protocol.LaunchKernel(argv, connFilePath, language, venvPath)
	if err != nil {
		_ = removeConnectionFile(connFilePath)
		return nil, fmt.Errorf("kernel launch failed: %w", err)
	}

	instCtx, cancel := context.WithCancel(context.Background())
	heartbeat := &jupyter_protocol.KernelHeartbeatState{}

	inst := &KernelInstance{
		id:                 id,
		language:           language,
		scopeType:          "note",
		scopeID:            noteID,
		connectionFilePath: connFilePath,
		connectionInfo:     connInfo,
		processHandle:      cmd,
		processWait:        make(chan error, 1),
		stderrBuf:          stderrBuf,
		heartbeatState:     heartbeat,
		activeExecutions:   map[string]struct{}{},
		executionQueue:     []string{},
		lastActivityAt:     time.Now(),
		ctx:                instCtx,
		cancel:             cancel,
		manager:            m,
	}

	// Wait for process exit asynchronously and emit lifecycle events.
	go func() {
		err := cmd.Wait()
		inst.processWait <- err
		close(inst.processWait)

		exitCode := 0
		if err != nil {
			if ee, ok := err.(*exec.ExitError); ok {
				exitCode = ee.ExitCode()
			} else {
				exitCode = -1
			}
		}

		if app := application.Get(); app != nil {
			// If the kernel never came up, surface a launch error with stderr contents.
			if !inst.heartbeatState.GetHeartbeatStatus() && stderrBuf != nil {
				msg := stderrBuf.String()
				if msg == "" && err != nil {
					msg = err.Error()
				}
				app.Event.EmitEvent(&application.CustomEvent{
					Name: kernelInstanceLaunchErrorEvent,
					Data: launchErrorPayload{
						ID:           inst.id,
						Language:     inst.language,
						NoteID:       inst.scopeID,
						ErrorMessage: msg,
					},
				})
			}
			app.Event.EmitEvent(&application.CustomEvent{
				Name: kernelInstanceExitedEvent,
				Data: exitedPayload{ID: inst.id, ExitCode: exitCode},
			})
		}

		// If still registered (process died unexpectedly), remove from manager and emit shutdown.
		m.mu.Lock()
		if _, stillRegistered := m.instances[inst.id]; stillRegistered {
			m.removeFromMapsLocked(inst)
			m.mu.Unlock()
			if app := application.Get(); app != nil {
				app.Event.EmitEvent(&application.CustomEvent{
					Name: kernelInstanceShutdownEvent,
					Data: shutdownPayload{
						ID:       inst.id,
						Language: inst.language,
						NoteID:   inst.scopeID,
						Reason:   "exited",
					},
				})
			}
			_ = removeConnectionFile(inst.connectionFilePath)
		} else {
			m.mu.Unlock()
		}
	}()

	// Build sockets and start listener goroutines.
	socketSet, err := sockets.CreateSockets(sockets.CreateParams{
		ConnectionInfo: connInfo,
		Ctx:            instCtx,
		Cancel:         cancel,
		HeartbeatState: heartbeat,
		InstanceID:     id,
		NoteID:         noteID,
		OnExecuteStatus: func(status, parentMsgID string) {
			switch status {
			case "busy":
				inst.trackExecutionStart(parentMsgID)
			case "idle":
				inst.trackExecutionEnd(parentMsgID)
			}
		},
	})
	if err != nil {
		cancel()
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		_ = removeConnectionFile(connFilePath)
		return nil, fmt.Errorf("socket creation failed: %w", err)
	}
	inst.sockets = socketSet

	// Wait briefly for the heartbeat to come up, OR for the process to die.
	wait := heartbeatLaunchWait
	if language == "java" {
		wait = javaLaunchWait
	}
	deadline := time.NewTimer(wait)
	defer deadline.Stop()
	ticker := time.NewTicker(50 * time.Millisecond)
	defer ticker.Stop()

waitLoop:
	for {
		select {
		case <-deadline.C:
			break waitLoop
		case <-inst.processWait:
			// Process died during launch — bubble up.
			cancel()
			_ = removeConnectionFile(connFilePath)
			msg := ""
			if stderrBuf != nil {
				msg = stderrBuf.String()
			}
			return nil, fmt.Errorf("kernel process exited during launch: %s", msg)
		case <-ticker.C:
			if heartbeat.GetHeartbeatStatus() {
				break waitLoop
			}
		}
	}

	return inst, nil
}

func (m *KernelManager) argvForLanguage(language string) ([]string, error) {
	switch language {
	case "python":
		return m.allKernels.Python.Argv, nil
	case "go":
		return m.allKernels.Go.Argv, nil
	case "javascript":
		return m.allKernels.Javascript.Argv, nil
	case "java":
		return m.allKernels.Java.Argv, nil
	default:
		return nil, LanguageNotSupportedError{Language: language}
	}
}

// Event payloads emitted by the manager.
type shutdownPayload struct {
	ID       string `json:"id"`
	Language string `json:"language"`
	NoteID   string `json:"noteId"`
	Reason   string `json:"reason"`
}

type launchErrorPayload struct {
	ID           string `json:"id"`
	Language     string `json:"language"`
	NoteID       string `json:"noteId"`
	ErrorMessage string `json:"errorMessage"`
}

type exitedPayload struct {
	ID       string `json:"id"`
	ExitCode int    `json:"exitCode"`
}
