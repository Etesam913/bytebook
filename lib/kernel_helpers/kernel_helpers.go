package kernel_helpers

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/etesam913/bytebook/lib/project_types"
	"github.com/etesam913/bytebook/lib/sockets"
)

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

// LaunchKernel runs the kernel inside the virtual environment.
func LaunchKernel(argv []string, pathToConnectionFile string, venvPath string) error {
	// Replace placeholder with the actual connection file path.
	for i, arg := range argv {
		if arg == "{connection_file}" {
			argv[i] = pathToConnectionFile
		}
	}

	// Ensure the Python interpreter from the virtual environment is used.
	pythonPath := filepath.Join(venvPath, "bin", "python3")
	if _, err := os.Stat(pythonPath); os.IsNotExist(err) {
		return fmt.Errorf("virtual environment Python not found at %s", pythonPath)
	}

	// Replace "python3" in argv with the virtual env Python.
	argv[0] = pythonPath

	// Create the command using the virtual environment's Python.
	cmd := exec.Command(argv[0], argv[1:]...)

	// Set environment variables to use the virtual environment.
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("VIRTUAL_ENV=%s", venvPath),
		fmt.Sprintf("PATH=%s/bin:%s", venvPath, os.Getenv("PATH")),
	)

	// Redirect stdout and stderr.
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	// Start the command (this spawns a separate process).
	if err := cmd.Start(); err != nil {
		return err
	}

	return nil
}

func GetConnectionInfo(projectPath string) (sockets.ConnectionInfo, error) {
	defaultConnectionInfo := sockets.ConnectionInfo{
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

	pathToConnectionFile := filepath.Join(projectPath, "code", "connection.json")

	return io_helpers.ReadOrCreateJSON(pathToConnectionFile, defaultConnectionInfo)
}

func GetAllKernels(projectPath string) (project_types.AllKernels, error) {
	allKernels := project_types.AllKernels{}
	pathToPythonKernel := filepath.Join(projectPath, "code", "python-kernel.json")
	pathToGolangKernel := filepath.Join(projectPath, "code", "golang-kernel.json")

	pythonKernelValue, err := io_helpers.ReadOrCreateJSON(pathToPythonKernel, project_types.KernelJson{
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

	if err != nil {
		return allKernels, err
	}

	allKernels.Python = pythonKernelValue

	gonbPath, err := exec.LookPath("gonb")
	if err != nil {
		gonbPath = "gonb" // Fallback to just the name if not found in PATH
	}

	golangKernelValue, err := io_helpers.ReadOrCreateJSON(pathToGolangKernel, project_types.KernelJson{
		Argv:        []string{gonbPath, "--kernel", "{connection_file}", "--logtostderr"},
		DisplayName: "Go (gonb)",
		Language:    "go",
	})

	if err != nil {
		return allKernels, err
	}

	allKernels.Golang = golangKernelValue

	return allKernels, nil
}
