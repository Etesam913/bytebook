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

// KernelConnectionInfo is the on-disk representation of a Jupyter kernel connection file.
// It is generated per-instance at runtime by the kernel_manager.
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

// getPythonKernel creates or reads a Python kernel configuration file.
func getPythonKernel(projectPath string) (KernelJson, error) {
	pathToPythonKernel := filepath.Join(projectPath, "code", "python-kernel.json")
	return util.ReadOrCreateJSON(pathToPythonKernel, KernelJson{
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
}

// getGolangKernel creates or reads a Golang kernel configuration file.
func getGolangKernel(projectPath string) (KernelJson, error) {
	pathToGoKernel := filepath.Join(projectPath, "code", "go-kernel.json")
	gonbPath, err := exec.LookPath("gonb")
	if err != nil {
		gonbPath = "gonb"
	}
	return util.ReadOrCreateJSON(pathToGoKernel, KernelJson{
		Argv: []string{
			gonbPath,
			"--kernel",
			"{connection_file}",
			"--logtostderr",
		},
		DisplayName: "Go (gonb)",
		Language:    "go",
	})
}

// getJavascriptKernel creates or reads a JavaScript (Deno) kernel configuration file.
func getJavascriptKernel(projectPath string) (KernelJson, error) {
	pathToJavascriptKernel := filepath.Join(projectPath, "code", "javascript-kernel.json")
	denoPath, err := exec.LookPath("deno")
	if err != nil {
		denoPath = "deno"
	}
	return util.ReadOrCreateJSON(pathToJavascriptKernel, KernelJson{
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
}

func getJavaKernel(projectPath string) (KernelJson, error) {
	pathToJavaKernel := filepath.Join(projectPath, "code", "java-kernel.json")
	pathToJavaResourceDir := filepath.Join(projectPath, "code", "java-resource")
	if _, err := os.Stat(pathToJavaResourceDir); os.IsNotExist(err) {
		if err := os.MkdirAll(pathToJavaResourceDir, 0755); err != nil {
			return KernelJson{}, fmt.Errorf("couldn't mkdir: %w", err)
		}
	}
	return util.ReadOrCreateJSON(pathToJavaKernel, KernelJson{
		Argv: []string{
			"java",
			"-jar",
			"{resource_dir}/jjava-launcher.jar",
			"{resource_dir}/jjava.jar",
			"{connection_file}",
		},
		DisplayName: "Java (jjava)",
		Language:    "java",
	})
}

type AllKernels struct {
	Python     KernelJson
	Go         KernelJson
	Javascript KernelJson
	Java       KernelJson
}

// GetAllKernels retrieves configurations for all supported kernel descriptors.
func GetAllKernels(projectPath string) (AllKernels, error) {
	all := AllKernels{}
	pythonKernelValue, err := getPythonKernel(projectPath)
	if err != nil {
		return all, err
	}
	golangKernelValue, err := getGolangKernel(projectPath)
	if err != nil {
		return all, err
	}
	javascriptKernelValue, err := getJavascriptKernel(projectPath)
	if err != nil {
		return all, err
	}
	javaKernelValue, err := getJavaKernel(projectPath)
	if err != nil {
		return all, err
	}
	all.Python = pythonKernelValue
	all.Go = golangKernelValue
	all.Javascript = javascriptKernelValue
	all.Java = javaKernelValue
	return all, nil
}

// GetPythonVirtualEnvironments scans the code directory for Python virtual environments
// and combines the results with any user-configured custom paths.
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
