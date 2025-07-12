package config

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"

	"github.com/etesam913/bytebook/internal/util"
)

type KernelJson struct {
	Argv        []string `json:"argv"`
	DisplayName string   `json:"display_name"`
	Language    string   `json:"language"`
}

type LanguageToKernelConnectionInfo struct {
	Python     KernelConnectionInfo `json:"python"`
	Go         KernelConnectionInfo `json:"go"`
	Javascript KernelConnectionInfo `json:"javascript"`
}

type KernelConnectionInfo struct {
	Language        string `json:"language"`
	DisplayName     string `json:"display_name"`
	SignatureScheme string `json:"signature_scheme"`
	Transport       string `json:"transport"`
	StdinPort       int    `json:"stdin_port"`
	ControlPort     int    `json:"control_port"`
	IOPubPort       int    `json:"iopub_port"`
	HBPort          int    `json:"hb_port"`
	ShellPort       int    `json:"shell_port"`
	Key             string `json:"key"`
	IP              string `json:"ip"`
}

// getPythonKernel creates or reads a Python kernel configuration file in the project's code directory.
// It returns a kernelJson struct containing the Python kernel configuration.
// The configuration includes the command to launch the Python kernel and its display name.
func getPythonKernel(projectPath string) (KernelJson, error) {
	pathToPythonKernel := filepath.Join(projectPath, "code", "python-kernel.json")

	pythonKernelValue, err := util.ReadOrCreateJSON(pathToPythonKernel, KernelJson{
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

// getGolangKernel creates or reads a Golang kernel configuration file in the project's code directory.
// It returns a kernelJson struct containing the Golang kernel configuration.
// The function attempts to locate the gonb executable in the system PATH, falling back to just "gonb" if not found.
func getGolangKernel(projectPath string) (KernelJson, error) {
	pathToGoKernel := filepath.Join(projectPath, "code", "go-kernel.json")

	gonbPath, err := exec.LookPath("gonb")
	if err != nil {
		gonbPath = "gonb" // Fallback to just the name if not found in PATH
	}

	goKernelValue, err := util.ReadOrCreateJSON(pathToGoKernel, KernelJson{
		Argv: []string{
			gonbPath,
			"--kernel",
			"{connection_file}",
			"--logtostderr",
		},
		DisplayName: "Go (gonb)",
		Language:    "go",
	})

	return goKernelValue, err
}

// getJavascriptKernel creates or reads a JavaScript (Deno) kernel configuration file in the project's code directory.
// It returns a KernelJson struct containing the JavaScript kernel configuration.
// The function attempts to locate the deno executable in the system PATH, falling back to just "deno" if not found.
func getJavascriptKernel(projectPath string) (KernelJson, error) {
	pathToJavascriptKernel := filepath.Join(projectPath, "code", "javascript-kernel.json")

	denoPath, err := exec.LookPath("deno")
	if err != nil {
		denoPath = "deno" // Fallback to just the name if not found in PATH
	}

	javascriptKernelValue, err := util.ReadOrCreateJSON(pathToJavascriptKernel, KernelJson{
		Argv: []string{
			denoPath,
			"jupyter",
			"--kernel",
			"--conn",
			"{connection_file}",
		},
		DisplayName: "Deno",
		Language:    "javascript",
	})

	return javascriptKernelValue, err
}

type AllKernels struct {
	Python     KernelJson
	Go         KernelJson
	Javascript KernelJson
}

// GetAllKernels retrieves configurations for all supported kernels (Python and Golang).
// It returns an AllKernels struct containing the kernel configurations for each language.
// If an error occurs while retrieving any kernel configuration, it returns the error.
func GetAllKernels(projectPath string) (AllKernels, error) {
	allKernels := AllKernels{}

	pythonKernelValue, err := getPythonKernel(projectPath)
	if err != nil {
		return allKernels, err
	}

	golangKernelValue, err := getGolangKernel(projectPath)
	if err != nil {
		return allKernels, err
	}

	javascriptKernelValue, err := getJavascriptKernel(projectPath)
	if err != nil {
		return allKernels, err
	}

	allKernels.Python = pythonKernelValue
	allKernels.Go = golangKernelValue
	allKernels.Javascript = javascriptKernelValue

	return allKernels, nil
}

// getKernelConnectionInfo creates or reads a kernel connection configuration file for the specified language.
// It sets up connection ports starting from the provided basePort and returns a KernelConnectionInfo struct.
// The connection information includes ports for shell, IOPub, stdin, control, and heartbeat channels.
func getKernelConnectionInfo(projectPath, language string, basePort int) (KernelConnectionInfo, error) {
	connectionInfo := KernelConnectionInfo{
		Language:        language,
		DisplayName:     language,
		ShellPort:       basePort,
		IOPubPort:       basePort + 1,
		StdinPort:       basePort + 2,
		ControlPort:     basePort + 3,
		HBPort:          basePort + 4,
		IP:              "127.0.0.1",
		Key:             "abc123",
		Transport:       "tcp",
		SignatureScheme: "hmac-sha256",
	}

	filename := fmt.Sprintf("%s-connection.json", language)
	pathToConnectionFile := filepath.Join(projectPath, "code", filename)
	validatedConnectionInfo, err := util.ReadOrCreateJSON(pathToConnectionFile, connectionInfo)
	if err != nil {
		return validatedConnectionInfo, err
	}

	return validatedConnectionInfo, nil
}

// getPythonConnectionInfo retrieves connection information for the Python kernel.
// It uses a base port of 55321 for the Python kernel connections.
func getPythonConnectionInfo(projectPath string) (KernelConnectionInfo, error) {
	return getKernelConnectionInfo(projectPath, "python", 55321)
}

// getGolangConnectionInfo retrieves connection information for the Golang kernel.
// It uses a base port of 55326 for the Golang kernel connections.
func getGolangConnectionInfo(projectPath string) (KernelConnectionInfo, error) {
	return getKernelConnectionInfo(projectPath, "go", 55326)
}

func getJavascriptConnectionInfo(projectPath string) (KernelConnectionInfo, error) {
	return getKernelConnectionInfo(projectPath, "javascript", 55331)
}

// GetAllConnectionInfo retrieves connection information for all supported kernels.
// It returns a LanguageToKernelConnectionInfo struct containing connection information for Python and Golang kernels.
// If an error occurs while retrieving connection information for any kernel, it returns the error.
func GetAllConnectionInfo(projectPath string) (LanguageToKernelConnectionInfo, error) {
	validatedPythonConnectionInfo, err := getPythonConnectionInfo(projectPath)
	if err != nil {
		return LanguageToKernelConnectionInfo{}, err
	}

	validatedGolangConnectionInfo, err := getGolangConnectionInfo(projectPath)
	if err != nil {
		return LanguageToKernelConnectionInfo{}, err
	}

	validatedJavascriptConnectionInfo, err := getJavascriptConnectionInfo(projectPath)
	if err != nil {
		return LanguageToKernelConnectionInfo{}, err
	}

	return LanguageToKernelConnectionInfo{
		Python:     validatedPythonConnectionInfo,
		Go:         validatedGolangConnectionInfo,
		Javascript: validatedJavascriptConnectionInfo,
	}, nil
}

// GetConnectionInfoFromLanguage retrieves connection information for a specific language kernel.
// It validates that the language is supported and returns the appropriate KernelConnectionInfo.
// If the language is not supported or the connection information is empty, it returns an error.
func GetConnectionInfoFromLanguage(projectPath string, language string) (KernelConnectionInfo, error) {
	if !util.IsSupportedLanguage(language) {
		return KernelConnectionInfo{}, fmt.Errorf("unsupported language: %s", language)
	}

	switch language {
	case "python":
		pythonConnectionInfo, err := getPythonConnectionInfo(projectPath)
		if err != nil {
			return KernelConnectionInfo{}, err
		}
		if pythonConnectionInfo == (KernelConnectionInfo{}) {
			return KernelConnectionInfo{}, fmt.Errorf("python connection info is empty")
		}
		return pythonConnectionInfo, nil
	case "go":
		golangConnectionInfo, err := getGolangConnectionInfo(projectPath)
		if err != nil {
			return KernelConnectionInfo{}, err
		}
		if golangConnectionInfo == (KernelConnectionInfo{}) {
			return KernelConnectionInfo{}, fmt.Errorf("golang connection info is empty")
		}
		return golangConnectionInfo, nil
	case "javascript":
		javascriptConnectionInfo, err := getJavascriptConnectionInfo(projectPath)
		if err != nil {
			return KernelConnectionInfo{}, err
		}
		if javascriptConnectionInfo == (KernelConnectionInfo{}) {
			return KernelConnectionInfo{}, fmt.Errorf("javascript connection info is empty")
		}
		return javascriptConnectionInfo, nil
	default:
		return KernelConnectionInfo{}, fmt.Errorf("unsupported language: %s", language)
	}
}

//	GetPythonVirtualEnvironments returns a list of paths to Python virtual environments found in the project's
//
// code directory and any custom virtual environment paths specified in project settings. It scans the code
// directory for standard virtual environments and combines those with user-configured custom paths.
func GetPythonVirtualEnvironments(projectPath string, customPythonVenvPaths []string) ([]string, error) {
	pathToCodeFolder := filepath.Join(projectPath, "code")
	entries, err := os.ReadDir(pathToCodeFolder)
	if err != nil {
		return []string{}, fmt.Errorf("couldn't read files in %s", pathToCodeFolder)
	}

	virtualEnvironmentPaths := util.Set[string]{}
	for _, entry := range entries {
		if entry.IsDir() {
			pathToEntry := filepath.Join(pathToCodeFolder, entry.Name())
			if util.IsVirtualEnv(pathToEntry) {
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
