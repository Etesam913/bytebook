package jupyter_protocol

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/util"
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

// LaunchKernel starts the kernel process for the specified language and returns
// the running *exec.Cmd along with a buffer that accumulates stderr. The caller
// is responsible for invoking cmd.Wait(), reading stderrBuf on failure, and
// killing the process during shutdown.
func LaunchKernel(argv []string, pathToConnectionFile, language, venvPath string) (*exec.Cmd, *bytes.Buffer, error) {
	projectPath, err := config.GetProjectPath()
	if err != nil {
		return nil, nil, err
	}

	replacements := map[string]string{
		"{connection_file}": pathToConnectionFile,
	}
	if language == "java" {
		pathToJJavaLauncher := filepath.Join(projectPath, "code", "java-resource", "jjava-launcher.jar")
		exists, err := util.FileOrFolderExists(pathToJJavaLauncher)
		if err != nil {
			return nil, nil, err
		}
		if !exists {
			return nil, nil, fmt.Errorf("jjava-launcher.jar not found at %s", pathToJJavaLauncher)
		}
		pathToJJavaJar := filepath.Join(projectPath, "code", "java-resource", "jjava.jar")
		exists, err = util.FileOrFolderExists(pathToJJavaJar)
		if err != nil {
			return nil, nil, err
		}
		if !exists {
			return nil, nil, fmt.Errorf("jjava.jar not found at %s", pathToJJavaJar)
		}
		replacements["{resource_dir}"] = filepath.Join(projectPath, "code", "java-resource")
	}

	updatedArgv := replaceArgPlaceholders(argv, replacements)
	cmd, stderrBuf, err := createCommandForLanguage(updatedArgv, language, venvPath)
	if err != nil {
		return nil, nil, err
	}

	if err := cmd.Start(); err != nil {
		return nil, stderrBuf, err
	}

	return cmd, stderrBuf, nil
}

// replaceArgPlaceholders replaces placeholders in argv with their corresponding values from the replacements map.
func replaceArgPlaceholders(argv []string, replacements map[string]string) []string {
	result := make([]string, len(argv))
	copy(result, argv)

	for i, arg := range result {
		for placeholder, val := range replacements {
			arg = strings.ReplaceAll(arg, placeholder, val)
		}
		result[i] = arg
	}
	return result
}

// createCommandForLanguage creates the appropriate command based on the language
func createCommandForLanguage(argv []string, language, venvPath string) (*exec.Cmd, *bytes.Buffer, error) {
	var cmd *exec.Cmd
	var stderrBuf bytes.Buffer

	switch language {
	case "python":
		return createPythonCommand(argv, venvPath)
	default:
		cmd = exec.Command(argv[0], argv[1:]...)
		cmd.Env = os.Environ()
	}

	cmd.Stdout = os.Stdout
	cmd.Stderr = io.MultiWriter(os.Stderr, &stderrBuf)

	return cmd, &stderrBuf, nil
}

// createPythonCommand creates a command specifically for Python with virtual environment support
func createPythonCommand(argv []string, venvPath string) (*exec.Cmd, *bytes.Buffer, error) {
	var stderrBuf bytes.Buffer

	pythonPath := filepath.Join(venvPath, "bin", "python3")
	if _, err := os.Stat(pythonPath); os.IsNotExist(err) {
		return nil, &stderrBuf, fmt.Errorf("virtual environment Python not found at %s", pythonPath)
	}

	argvCopy := make([]string, len(argv))
	copy(argvCopy, argv)

	if len(argvCopy) > 0 && (argvCopy[0] == "python" || argvCopy[0] == "python3") {
		argvCopy[0] = pythonPath
	}

	cmd := exec.Command(argvCopy[0], argvCopy[1:]...)

	cmd.Env = append(os.Environ(),
		fmt.Sprintf("VIRTUAL_ENV=%s", venvPath),
		fmt.Sprintf("PATH=%s/bin:%s", venvPath, os.Getenv("PATH")),
	)

	cmd.Stdout = os.Stdout
	cmd.Stderr = io.MultiWriter(os.Stderr, &stderrBuf)

	return cmd, &stderrBuf, nil
}

// KernelLaunchEvent retained for backwards-compatible event payload shape if needed.
type KernelLaunchEvent struct {
	Language string `json:"language"`
	Data     string `json:"data"`
}
