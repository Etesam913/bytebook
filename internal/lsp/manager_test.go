package lsp

import (
	"errors"
	"testing"
)

// TestManagerAvailableWhenBinaryMissing forces a missing-binary state and
// asserts Available reports false. Achieves this by stubbing binaryPath to ""
// and using a fresh-enough lastLookup that the TTL doesn't re-resolve.
func TestManagerAvailableWhenBinaryMissing(t *testing.T) {
	m := newTestManager(t, "")
	m.lastLookupErr = errors.New("not found")

	if m.Available("python") {
		t.Fatal("Available(python) = true with empty binaryPath, want false")
	}
	if m.Available("go") {
		t.Fatal("Available(go) = true, want false (v1 supports python only)")
	}
}

func TestManagerAvailableLanguageGating(t *testing.T) {
	m := newTestManager(t, "/fake/pyright")

	if !m.Available("python") {
		t.Fatal("Available(python) = false, want true")
	}
	if m.Available("go") || m.Available("java") || m.Available("javascript") {
		t.Fatal("v1 should not advertise availability for non-python languages")
	}
}

func TestManagerGetOrCreateRejectsWhenUnavailable(t *testing.T) {
	m := newTestManager(t, "")

	_, err := m.GetOrCreate("note-x")
	if !errors.Is(err, ErrNotAvailable) {
		t.Fatalf("GetOrCreate err = %v, want ErrNotAvailable", err)
	}
}

func TestManagerGetOrCreateRejectsEmptyNoteID(t *testing.T) {
	m := newTestManager(t, "/fake/pyright")

	if _, err := m.GetOrCreate(""); err == nil {
		t.Fatal("GetOrCreate(\"\") returned nil err, want non-nil")
	}
}

func TestManagerShutdownAllSafeWhenEmpty(t *testing.T) {
	m := New()
	// Should not panic / block.
	m.ShutdownAll()
}

func TestManagerShutdownNoteUnknownIsNoop(t *testing.T) {
	m := New()
	t.Cleanup(m.ShutdownAll)

	if err := m.ShutdownNote("never-existed"); err != nil {
		t.Fatalf("ShutdownNote on unknown note returned err: %v", err)
	}
}
