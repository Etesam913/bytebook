package kernel_helpers

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"sync"
	"time"

	"github.com/etesam913/bytebook/internal/util"
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

// isPortInUse tries to connect to the given TCP port on localhost.
// It returns true if a connection is established, meaning the port is in use.
func IsPortInUse(port int) bool {
	address := fmt.Sprintf("localhost:%d", port)
	timeout := 1 * time.Second
	conn, err := net.DialTimeout("tcp", address, timeout)
	if err != nil {
		// Connection failed, port is likely not in use.
		return false
	}
	conn.Close()
	return true
}

func isSupportedLanguage(language string) bool {
	return language == "python" || language == "golang"
}

func GetConnectionInfoFromLanguage(projectPath string, language string) (project_types.KernelConnectionInfo, error) {
	if !isSupportedLanguage(language) {
		return project_types.KernelConnectionInfo{}, errors.New("Unsupported language")
	}

	if language == "python" {
		pythonConnectionInfo, err := getPythonConnectionInfo(projectPath)
		if err != nil {
			return project_types.KernelConnectionInfo{}, err
		}
		if pythonConnectionInfo == (project_types.KernelConnectionInfo{}) {
			return project_types.KernelConnectionInfo{}, errors.New("Python connection info is empty")
		}
		return pythonConnectionInfo, nil
	}

	if language == "golang" {
		golangConnectionInfo, err := getGolangConnectionInfo(projectPath)
		if err != nil {
			return project_types.KernelConnectionInfo{}, err
		}
		if golangConnectionInfo == (project_types.KernelConnectionInfo{}) {
			return project_types.KernelConnectionInfo{}, errors.New("Golang connection info is empty")
		}
		return golangConnectionInfo, nil
	}
	return project_types.KernelConnectionInfo{}, errors.New("Unsupported language")
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

func getPythonConnectionInfo(projectPath string) (project_types.KernelConnectionInfo, error) {
	pythonConnectionInfo := project_types.KernelConnectionInfo{
		Language:        "python",
		ShellPort:       55321,
		IOPubPort:       55322,
		StdinPort:       55323,
		ControlPort:     55324,
		HBPort:          55325,
		IP:              "127.0.0.1",
		Key:             "abc123",
		Transport:       "tcp",
		SignatureScheme: "hmac-sha256",
	}

	pathToPythonConnectionFile := filepath.Join(projectPath, "code", "python-connection.json")
	validatedPythonConnectionInfo, err := util.ReadOrCreateJSON(pathToPythonConnectionFile, pythonConnectionInfo)
	if err != nil {
		return validatedPythonConnectionInfo, err
	}

	return validatedPythonConnectionInfo, nil
}

func getGolangConnectionInfo(projectPath string) (project_types.KernelConnectionInfo, error) {
	golangConnectionInfo := project_types.KernelConnectionInfo{
		Language:        "golang",
		ShellPort:       55326,
		IOPubPort:       55327,
		StdinPort:       55328,
		ControlPort:     55329,
		HBPort:          55330,
		IP:              "127.0.0.1",
		Key:             "abc123",
		Transport:       "tcp",
		SignatureScheme: "hmac-sha256",
	}

	pathToGolangConnectionFile := filepath.Join(projectPath, "code", "golang-connection.json")
	validatedGolangConnectionInfo, err := util.ReadOrCreateJSON(pathToGolangConnectionFile, golangConnectionInfo)
	if err != nil {
		return validatedGolangConnectionInfo, err
	}

	return validatedGolangConnectionInfo, nil
}

func GetAllConnectionInfo(projectPath string) (project_types.LanguageToKernelConnectionInfo, error) {
	validatedPythonConnectionInfo, err := getPythonConnectionInfo(projectPath)
	if err != nil {
		return project_types.LanguageToKernelConnectionInfo{
			Python: validatedPythonConnectionInfo,
		}, err
	}

	validatedGolangConnectionInfo, err := getGolangConnectionInfo(projectPath)
	if err != nil {
		return project_types.LanguageToKernelConnectionInfo{
			Python: validatedPythonConnectionInfo,
			Golang: validatedGolangConnectionInfo,
		}, err
	}

	return project_types.LanguageToKernelConnectionInfo{
		Python: validatedPythonConnectionInfo,
		Golang: validatedGolangConnectionInfo,
	}, nil
}

func getPythonKernel(projectPath string) (project_types.KernelJson, error) {
	pathToPythonKernel := filepath.Join(projectPath, "code", "python-kernel.json")

	pythonKernelValue, err := util.ReadOrCreateJSON(pathToPythonKernel, project_types.KernelJson{
		Argv: []string{
			"python3",
			"-m",
			"ipykernel_launcher",
			"-f",
			"{connection_file}",
		},
		DisplayName: "Python 3",
		Language:    "python",
	})

	return pythonKernelValue, err
}

func getGolangKernel(projectPath string) (project_types.KernelJson, error) {
	pathToGolangKernel := filepath.Join(projectPath, "code", "golang-kernel.json")

	gonbPath, err := exec.LookPath("gonb")
	if err != nil {
		gonbPath = "gonb" // Fallback to just the name if not found in PATH
	}

	golangKernelValue, err := util.ReadOrCreateJSON(pathToGolangKernel, project_types.KernelJson{
		Argv:        []string{gonbPath, "--kernel", "{connection_file}", "--logtostderr"},
		DisplayName: "Go (gonb)",
		Language:    "go",
	})

	return golangKernelValue, err
}

func GetAllKernels(projectPath string) (project_types.AllKernels, error) {
	allKernels := project_types.AllKernels{}

	pythonKernelValue, err := getPythonKernel(projectPath)
	if err != nil {
		return allKernels, err
	}

	golangKernelValue, err := getGolangKernel(projectPath)
	if err != nil {
		return allKernels, err
	}

	allKernels.Python = pythonKernelValue
	allKernels.Golang = golangKernelValue

	return allKernels, nil
}

// isVirtualEnv checks if a directory likely represents a Python virtual environment.
// It looks for a "pyvenv.cfg" file or a "bin/python3" executable.
// For Windows, you might also look for "Scripts/python.exe".
func IsVirtualEnv(dir string) bool {
	// Check for pyvenv.cfg file (present in most venvs)
	cfgPath := filepath.Join(dir, "pyvenv.cfg")
	if _, err := os.Stat(cfgPath); err == nil {
		return true
	}

	// Optional: Uncomment the following lines if you want to support Windows detection.
	/*
		winPythonPath := filepath.Join(dir, "Scripts", "python.exe")
		if info, err := os.Stat(winPythonPath); err == nil && !info.IsDir() {
			return true
		}
	*/

	return false
}

// GetPythonVirtualEnvironments returns a list of paths to Python virtual environments found in the project's
// code directory and any custom virtual environment paths specified in project settings. It scans the code
// directory for standard virtual environments and combines those with user-configured custom paths.
func GetPythonVirtualEnvironments(projectPath string, customPythonVenvPaths []string) ([]string, error) {
	pathToCodeFolder := filepath.Join(projectPath, "code")
	entries, err := os.ReadDir(pathToCodeFolder)
	if err != nil {
		return []string{}, errors.New(fmt.Sprintf("Couldn't read files in %s", pathToCodeFolder))
	}

	virtualEnvironmentPaths := util.Set[string]{}
	for _, entry := range entries {
		if entry.IsDir() {
			pathToEntry := filepath.Join(pathToCodeFolder, entry.Name())
			if IsVirtualEnv(pathToEntry) {
				virtualEnvironmentPaths.Add(pathToEntry)
			}
		}
	}

	for _, customVirtualEnvironmentPath := range customPythonVenvPaths {
		virtualEnvironmentPaths.Add(customVirtualEnvironmentPath)
	}

	paths := util.MapKeys(virtualEnvironmentPaths)
	sort.Strings(paths)
	return paths, nil
}
