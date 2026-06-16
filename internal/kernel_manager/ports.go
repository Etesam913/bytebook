package kernel_manager

import (
	"fmt"
	"net"
)

// allocatePorts opens n TCP listeners on 127.0.0.1, records each ephemeral
// port the OS assigned, then closes the listeners and returns the recorded
// ports. There is a TOCTOU window between Close() and a kernel binding the
// port — callers should be prepared to retry the whole allocation if the
// kernel fails to launch.
func allocatePorts(n int) ([]int, error) {
	listeners := make([]net.Listener, 0, n)
	defer func() {
		for _, l := range listeners {
			_ = l.Close()
		}
	}()

	ports := make([]int, 0, n)
	seen := make(map[int]struct{}, n)
	for i := 0; i < n; i++ {
		l, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			return nil, fmt.Errorf("failed to allocate port %d/%d: %w", i+1, n, err)
		}
		listeners = append(listeners, l)
		port := l.Addr().(*net.TCPAddr).Port
		if _, ok := seen[port]; ok {
			return nil, fmt.Errorf("duplicate ephemeral port %d allocated", port)
		}
		seen[port] = struct{}{}
		ports = append(ports, port)
	}
	return ports, nil
}
