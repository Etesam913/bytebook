package lsp

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os/exec"
	"sync"
	"time"
)

// pyrightBinaryName is the executable the user is expected to have on PATH
// after running `npm install -g pyright`.
const pyrightBinaryName = "pyright-langserver"

// lookPathTTL caps how often we re-resolve pyright on PATH when the previous
// lookup failed. Without this the manager would shell out on every call.
const lookPathTTL = 30 * time.Second

// ErrNotAvailable is returned by GetOrCreate when pyright is not installed.
var ErrNotAvailable = errors.New("lsp server not available")

// LspManager owns one Instance per note. v1 supports python only.
//
// Each instance is a Pyright child process, so callers should close note
// instances when editors unmount. The expected steady state is "open notes
// with Python code blocks", not every note in the project.
type LspManager struct {
	log *slog.Logger

	// mu protects both the instance map and the cached LookPath result. LookPath
	// itself is not the reason for the lock; sharing these fields across Wails
	// RPC goroutines is.
	mu        sync.Mutex
	instances map[string]*Instance

	// binaryPath caches the result of exec.LookPath. Empty when unresolved.
	binaryPath    string
	lastLookup    time.Time
	lastLookupErr error

	ctx    context.Context
	cancel context.CancelFunc
}

// New constructs an LspManager. The provided logger may be nil.
func New(log *slog.Logger) *LspManager {
	if log == nil {
		log = slog.Default()
	}
	ctx, cancel := context.WithCancel(context.Background())
	m := &LspManager{
		log:       log,
		instances: map[string]*Instance{},
		ctx:       ctx,
		cancel:    cancel,
	}
	m.resolveBinary()
	return m
}

// resolveBinary runs exec.LookPath. Caller must hold m.mu (or call from New
// before any other goroutine can observe the manager).
func (m *LspManager) resolveBinary() {
	path, err := exec.LookPath(pyrightBinaryName)
	m.binaryPath = path
	m.lastLookup = time.Now()
	m.lastLookupErr = err
}

// Available reports whether the given language has a working LSP backend.
// v1 only knows about python. The PATH lookup is rechecked on a 30s TTL when
// the previous resolution failed, so installing pyright mid-session
// eventually starts working.
func (m *LspManager) Available(language string) bool {
	if language != "python" {
		return false
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.binaryPath != "" {
		return true
	}
	if time.Since(m.lastLookup) > lookPathTTL {
		m.resolveBinary()
	}
	return m.binaryPath != ""
}

// GetOrCreate returns the instance for noteID, spawning pyright if necessary.
// Returns ErrNotAvailable if pyright is not installed.
func (m *LspManager) GetOrCreate(noteID string) (*Instance, error) {
	if noteID == "" {
		return nil, fmt.Errorf("empty noteID")
	}
	if !m.Available("python") {
		return nil, ErrNotAvailable
	}

	m.mu.Lock()
	if instance, ok := m.instances[noteID]; ok {
		// Done is a channel so liveness can be checked without racing a bool
		// guarded by another lock, and reapWhenDone can wait on the same signal.
		select {
		case <-instance.Done():
			delete(m.instances, noteID)
		default:
			m.mu.Unlock()
			return instance, nil
		}
	}
	binaryPath := m.binaryPath
	m.mu.Unlock()

	instance, err := spawnInstance(m.ctx, noteID, binaryPath, m.log)
	if err != nil {
		return nil, fmt.Errorf("spawn pyright for note %s: %w", noteID, err)
	}

	m.mu.Lock()
	// The lock is released while spawning Pyright so other note operations are
	// not blocked on process startup. That means another goroutine may have
	// installed an instance for this note while we were spawning; keep the first
	// live one and shut down the duplicate.
	if existing, ok := m.instances[noteID]; ok {
		select {
		case <-existing.Done():
			delete(m.instances, noteID)
		default:
			m.mu.Unlock()
			_ = instance.Shutdown()
			return existing, nil
		}
	}
	m.instances[noteID] = instance
	m.mu.Unlock()

	go m.reapWhenDone(instance)
	return instance, nil
}

// reapWhenDone removes an instance from the map once its connection ends. The
// next GetOrCreate for the same noteID will spawn a fresh instance.
func (m *LspManager) reapWhenDone(lspInstance *Instance) {
	<-lspInstance.Done()
	m.mu.Lock()
	defer m.mu.Unlock()
	if current, ok := m.instances[lspInstance.NoteID()]; ok && current == lspInstance {
		delete(m.instances, lspInstance.NoteID())
	}
}

// ShutdownNote shuts down the LSP instance for a note, if one exists.
func (m *LspManager) ShutdownNote(noteID string) error {
	m.mu.Lock()
	instance, ok := m.instances[noteID]
	if ok {
		delete(m.instances, noteID)
	}
	m.mu.Unlock()
	if !ok {
		return nil
	}
	return instance.Shutdown()
}

// ShutdownAll terminates every running instance. Called at app exit.
func (m *LspManager) ShutdownAll() {
	m.mu.Lock()
	insts := make([]*Instance, 0, len(m.instances))
	for _, lspInstance := range m.instances {
		insts = append(insts, lspInstance)
	}
	m.instances = map[string]*Instance{}
	m.mu.Unlock()

	for _, lspInstance := range insts {
		_ = lspInstance.Shutdown()
	}
	m.cancel()
}
