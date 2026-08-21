package main

import "testing"

// TestEventRegistrations exists to force every package init in the app's
// import graph to run under `go test`. application.RegisterEvent panics on a
// duplicate registration or a system-event name collision, so importing the
// main package (and with it util, notes, kernel_manager, and
// jupyter_protocol/sockets) is itself the assertion: a bad registration fails
// this package's tests before it can crash the app at launch.
func TestEventRegistrations(t *testing.T) {}
