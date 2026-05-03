package kernel_manager

import (
	"errors"
	"fmt"
	"testing"
)

func TestAllocatePorts(t *testing.T) {
	t.Run("returns the requested number of unique ports", func(t *testing.T) {
		ports, err := allocatePorts(5)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(ports) != 5 {
			t.Fatalf("expected 5 ports, got %d", len(ports))
		}
		seen := map[int]struct{}{}
		for _, p := range ports {
			if p <= 0 || p > 65535 {
				t.Errorf("port out of range: %d", p)
			}
			if _, dup := seen[p]; dup {
				t.Errorf("duplicate port: %d", p)
			}
			seen[p] = struct{}{}
		}
	})

	t.Run("returns no ports when n is 0", func(t *testing.T) {
		ports, err := allocatePorts(0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(ports) != 0 {
			t.Fatalf("expected 0 ports, got %d", len(ports))
		}
	})
}

func TestIsPortBindRaceMessage(t *testing.T) {
	cases := []struct {
		name   string
		stderr string
		want   bool
	}{
		{
			name: "python ipykernel zmq bind failure",
			stderr: `Traceback (most recent call last):
  File "ipykernel_launcher.py", line 18, in <module>
zmq.error.ZMQError: Address already in use (addr='tcp://127.0.0.1:55321')
`,
			want: true,
		},
		{
			name:   "go kernel bind failure",
			stderr: "bind: Address already in use\n",
			want:   true,
		},
		{
			name:   "unrelated import error",
			stderr: "ModuleNotFoundError: No module named 'ipykernel'\n",
			want:   false,
		},
		{
			name:   "empty stderr",
			stderr: "",
			want:   false,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := isPortBindRaceMessage(tc.stderr); got != tc.want {
				t.Errorf("isPortBindRaceMessage(%q) = %v, want %v", tc.stderr, got, tc.want)
			}
		})
	}
}

func TestPortBindRaceErrIsRetriable(t *testing.T) {
	wrapped := fmt.Errorf("%w: bind failed", portBindRaceErr)
	if !errors.Is(wrapped, portBindRaceErr) {
		t.Fatalf("wrapped error should match portBindRaceErr via errors.Is")
	}
}
