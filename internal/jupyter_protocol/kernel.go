package jupyter_protocol

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
	updatedArgv := replaceConnectionFilePlaceholder(argv, pathToConnectionFile)

	cmd, stderrBuf, err := createCommandForLanguage(updatedArgv, language, venvPath)
	if err != nil {
		return err
	}

	// Start the command (this spawns a separate process)
	if err := cmd.Start(); err != nil {
		return err
	}

	// Monitor command execution in a goroutine
	monitorCommandExecution(cmd, stderrBuf, language)

	return nil
}

// replaceConnectionFilePlaceholder replaces the {connection_file} placeholder with the actual path
func replaceConnectionFilePlaceholder(argv []string, pathToConnectionFile string) []string {
	result := make([]string, len(argv))
	copy(result, argv)

	for i, arg := range result {
		if arg == "{connection_file}" {
			result[i] = pathToConnectionFile
		}
	}
	return result
}

// createCommandForLanguage creates the appropriate command based on the language
func createCommandForLanguage(argv []string, language, venvPath string) (*exec.Cmd, bytes.Buffer, error) {
	var cmd *exec.Cmd
	var stderrBuf bytes.Buffer

	switch language {
	case "python":
		return createPythonCommand(argv, venvPath)
	// TODO: Handle other cases, python is the only language that works currently
	case "golang", "go":
		cmd = exec.Command(argv[0], argv[1:]...)
		cmd.Env = os.Environ()
	default:
		cmd = exec.Command(argv[0], argv[1:]...)
		cmd.Env = os.Environ()
	}

	// Redirect stdout and stderr for all languages
	cmd.Stdout = os.Stdout
	cmd.Stderr = io.MultiWriter(os.Stderr, &stderrBuf)

	return cmd, stderrBuf, nil
}

// createPythonCommand creates a command specifically for Python with virtual environment support
func createPythonCommand(argv []string, venvPath string) (*exec.Cmd, bytes.Buffer, error) {
	var stderrBuf bytes.Buffer

	// For Python, use the virtual environment
	pythonPath := filepath.Join(venvPath, "bin", "python3")
	if _, err := os.Stat(pythonPath); os.IsNotExist(err) {
		return nil, stderrBuf, fmt.Errorf("virtual environment Python not found at %s", pythonPath)
	}

	// Make a copy of argv to avoid modifying the original
	argvCopy := make([]string, len(argv))
	copy(argvCopy, argv)

	// Replace "python3" in argv with the virtual env Python
	if len(argvCopy) > 0 && (argvCopy[0] == "python" || argvCopy[0] == "python3") {
		argvCopy[0] = pythonPath
	}

	cmd := exec.Command(argvCopy[0], argvCopy[1:]...)

	// Set environment variables to use the virtual environment
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("VIRTUAL_ENV=%s", venvPath),
		fmt.Sprintf("PATH=%s/bin:%s", venvPath, os.Getenv("PATH")),
	)

	// Redirect stdout and stderr
	cmd.Stdout = os.Stdout
	cmd.Stderr = io.MultiWriter(os.Stderr, &stderrBuf)

	return cmd, stderrBuf, nil
}

// monitorCommandExecution monitors the command execution and handles errors
func monitorCommandExecution(cmd *exec.Cmd, stderrBuf bytes.Buffer, language string) {
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
}
