package jupyter_protocol

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/util"
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

type KernelLaunchEvent struct {
	Language string `json:"language"`
	Data     string `json:"data"`
}

// LaunchKernel runs the kernel for the specified language.
func LaunchKernel(argv []string, pathToConnectionFile, language, venvPath string) error {
	projectPath, err := config.GetProjectPath()
	if err != nil {
		return err
	}

	// Prepare placeholder replacements
	replacements := map[string]string{
		"{connection_file}": pathToConnectionFile,
	}
	// For Java, also replace {resource_dir} with the directory containing the connection file
	if language == "java" {
		pathToJJavaLauncher := filepath.Join(projectPath, "code", "java-resource", "jjava-launcher.jar")
		exists, err := util.FileOrFolderExists(pathToJJavaLauncher)
		if err != nil {
			return err
		}
		if !exists {
			return fmt.Errorf("jjava-launcher.jar not found at %s", pathToJJavaLauncher)
		}
		pathToJJavaJar := filepath.Join(projectPath, "code", "java-resource", "jjava.jar")
		exists, err = util.FileOrFolderExists(pathToJJavaJar)
		if err != nil {
			return err
		}
		if !exists {
			return fmt.Errorf("jjava.jar not found at %s", pathToJJavaJar)
		}
		replacements["{resource_dir}"] = filepath.Join(projectPath, "code", "java-resource")
	}

	updatedArgv := replaceArgPlaceholders(argv, replacements)
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

// replaceArgPlaceholders replaces placeholders in argv with their corresponding values from the replacements map.
// It performs a replaceAll for each replacement in each argument.
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

	// Capture stdout and stderr
	cmd.Stdout = os.Stdout
	cmd.Stderr = io.MultiWriter(os.Stderr, &stderrBuf)

	return cmd, &stderrBuf, nil
}

// createPythonCommand creates a command specifically for Python with virtual environment support
func createPythonCommand(argv []string, venvPath string) (*exec.Cmd, *bytes.Buffer, error) {
	var stderrBuf bytes.Buffer

	// For Python, use the virtual environment
	pythonPath := filepath.Join(venvPath, "bin", "python3")
	if _, err := os.Stat(pythonPath); os.IsNotExist(err) {
		return nil, &stderrBuf, fmt.Errorf("virtual environment Python not found at %s", pythonPath)
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

	return cmd, &stderrBuf, nil
}

// monitorCommandExecution monitors the command execution and handles errors
func monitorCommandExecution(cmd *exec.Cmd, stderrBuf *bytes.Buffer, language string) {
	go func() {
		if err := cmd.Wait(); err != nil {
			app := application.Get()
			if app == nil {
				return
			}

			stderrMsg := stderrBuf.String()

			var errorMsg string

			// Use stderr if available, otherwise fallback to exit error
			if stderrMsg != "" {
				errorMsg = stderrMsg
			} else {
				// Fallback to exit error information
				if exitError, ok := err.(*exec.ExitError); ok {
					errorMsg = fmt.Sprintf("Exit code: %d\nError: %s",
						exitError.ExitCode(), exitError.Error())
				} else {
					errorMsg = fmt.Sprintf("Error: %s", err.Error())
				}
			}

			log.Printf("Kernel launch failed for %s: %s", language, errorMsg)

			app.Event.EmitEvent(&application.CustomEvent{
				Name: util.Events.KernelLaunchError,
				Data: KernelLaunchEvent{
					Language: language,
					Data:     errorMsg,
				},
			})
		}
	}()
}
