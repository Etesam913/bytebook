package lsp

import (
	"errors"
	"testing"
	"time"
)

// TestManagerAvailableWhenBinaryMissing forces a missing-binary state and
// asserts Available reports false. Achieves this by stubbing binaryPath to ""
// and using a fresh-enough lastLookup that the TTL doesn't re-resolve.
func TestManagerAvailableWhenBinaryMissing(t *testing.T) {
	m := New(nil)
	t.Cleanup(m.ShutdownAll)

	m.mu.Lock()
	m.binaryPath = ""
	m.lastLookup = time.Now() // recent — TTL skip
	m.lastLookupErr = errors.New("not found")
	m.mu.Unlock()

	if m.Available("python") {
		t.Fatal("Available(python) = true with empty binaryPath, want false")
	}
	if m.Available("go") {
		t.Fatal("Available(go) = true, want false (v1 supports python only)")
	}
}

func TestManagerAvailableLanguageGating(t *testing.T) {
	m := New(nil)
	t.Cleanup(m.ShutdownAll)

	// Force binary present so Available depends only on language.
	m.mu.Lock()
	m.binaryPath = "/fake/pyright"
	m.lastLookup = time.Now()
	m.lastLookupErr = nil
	m.mu.Unlock()

	if !m.Available("python") {
		t.Fatal("Available(python) = false, want true")
	}
	if m.Available("go") || m.Available("java") || m.Available("javascript") {
		t.Fatal("v1 should not advertise availability for non-python languages")
	}
}

func TestManagerGetOrCreateRejectsWhenUnavailable(t *testing.T) {
	m := New(nil)
	t.Cleanup(m.ShutdownAll)

	m.mu.Lock()
	m.binaryPath = ""
	m.lastLookup = time.Now()
	m.mu.Unlock()

	_, err := m.GetOrCreate("note-x")
	if !errors.Is(err, ErrNotAvailable) {
		t.Fatalf("GetOrCreate err = %v, want ErrNotAvailable", err)
	}
}

func TestManagerGetOrCreateRejectsEmptyNoteID(t *testing.T) {
	m := New(nil)
	t.Cleanup(m.ShutdownAll)

	// Even with binary "available", empty noteID must fail.
	m.mu.Lock()
	m.binaryPath = "/fake/pyright"
	m.lastLookup = time.Now()
	m.mu.Unlock()

	if _, err := m.GetOrCreate(""); err == nil {
		t.Fatal("GetOrCreate(\"\") returned nil err, want non-nil")
	}
}

func TestManagerShutdownAllSafeWhenEmpty(t *testing.T) {
	m := New(nil)
	// Should not panic / block.
	m.ShutdownAll()
}

func TestManagerShutdownNoteUnknownIsNoop(t *testing.T) {
	m := New(nil)
	t.Cleanup(m.ShutdownAll)

	if err := m.ShutdownNote("never-existed"); err != nil {
		t.Fatalf("ShutdownNote on unknown note returned err: %v", err)
	}
}
