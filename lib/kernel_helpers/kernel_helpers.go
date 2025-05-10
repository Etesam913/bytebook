package kernel_helpers

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sync"

	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type KernelHeartbeatState struct {
	Mutex  sync.RWMutex
	Status bool
}

func (k *KernelHeartbeatState) UpdateHeartbeatStatus(status bool) {
	k.Mutex.Lock()
	defer k.Mutex.Unlock()
	k.Status = status
}

func (k *KernelHeartbeatState) GetHeartbeatStatus() bool {
	k.Mutex.RLock()
	defer k.Mutex.RUnlock()
	return k.Status
}

// LaunchKernel runs the kernel for the specified language.
func LaunchKernel(argv []string, pathToConnectionFile, language, venvPath string) error {
	// Replace placeholder with the actual connection file path.
	for i, arg := range argv {
		if arg == "{connection_file}" {
			argv[i] = pathToConnectionFile
		}
	}

	var cmd *exec.Cmd
	var stderrBuf bytes.Buffer

	// Handle language-specific kernel launch configurations
	switch language {
	case "python":
		// For Python, use the virtual environment
		pythonPath := filepath.Join(venvPath, "bin", "python3")
		if _, err := os.Stat(pythonPath); os.IsNotExist(err) {
			return fmt.Errorf("virtual environment Python not found at %s", pythonPath)
		}

		// Replace "python3" in argv with the virtual env Python
		if len(argv) > 0 && (argv[0] == "python" || argv[0] == "python3") {
			argv[0] = pythonPath
		}

		cmd = exec.Command(argv[0], argv[1:]...)

		// Set environment variables to use the virtual environment
		cmd.Env = append(os.Environ(),
			fmt.Sprintf("VIRTUAL_ENV=%s", venvPath),
			fmt.Sprintf("PATH=%s/bin:%s", venvPath, os.Getenv("PATH")),
		)

	case "golang", "go":
		// For Go, use the standard command without virtual environment
		cmd = exec.Command(argv[0], argv[1:]...)
		cmd.Env = os.Environ()

	default:
		// For other languages, use a generic approach
		cmd = exec.Command(argv[0], argv[1:]...)
		cmd.Env = os.Environ()
	}

	// Redirect stdout and stderr for all languages
	cmd.Stdout = os.Stdout
	cmd.Stderr = io.MultiWriter(os.Stderr, &stderrBuf)

	// Start the command (this spawns a separate process)
	if err := cmd.Start(); err != nil {
		return err
	}

	go func() {
		if err := cmd.Wait(); err != nil {
			app := application.Get()
			if app == nil {
				return
			}
			msg := stderrBuf.String()
			app.EmitEvent("kernel:launch-error", project_types.KernelLaunchEventType{
				Language: language,
				Data:     msg,
			})
		}
	}()

	return nil
}
