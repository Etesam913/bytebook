package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetAllKernels(t *testing.T) {
	t.Run("Happy Path", func(t *testing.T) {
		// Create a temporary directory for testing
		tempDir := t.TempDir()
		projectPath := filepath.Join(tempDir, "project")
		codePath := filepath.Join(projectPath, "code")

		// Create the code directory
		err := os.MkdirAll(codePath, 0755)
		assert.NoError(t, err)

		// Call the function to test
		kernels, err := GetAllKernels(projectPath)
		assert.NoError(t, err)

		// Verify kernels are initialized correctly
		// Python kernel
		assert.Equal(t, "python", kernels.Python.Language)
		assert.Equal(t, "Python 3", kernels.Python.DisplayName)
		assert.Equal(t, []string{
			"python3",
			"-m",
			"ipykernel_launcher",
			"-f",
			"{connection_file}",
		}, kernels.Python.Argv)

		// Golang kernel
		assert.Equal(t, "go", kernels.Go.Language)
		assert.Equal(t, "Go (gonb)", kernels.Go.DisplayName)
		// We can't know exact gonbPath, but we can verify the rest
		assert.Contains(t, kernels.Go.Argv, "--kernel")
		assert.Contains(t, kernels.Go.Argv, "{connection_file}")
		assert.Contains(t, kernels.Go.Argv, "--logtostderr")

		// Javascript kernel
		assert.Equal(t, "javascript", kernels.Javascript.Language)
		assert.Equal(t, "Deno", kernels.Javascript.DisplayName)
		// We can't know exact denoPath, but we can verify the rest
		assert.Contains(t, kernels.Javascript.Argv, "jupyter")
		assert.Contains(t, kernels.Javascript.Argv, "--kernel")
		assert.Contains(t, kernels.Javascript.Argv, "--conn")
		assert.Contains(t, kernels.Javascript.Argv, "{connection_file}")

		// Java kernel
		assert.Equal(t, "java", kernels.Java.Language)
		assert.Equal(t, "Java (jjava)", kernels.Java.DisplayName)
		assert.Contains(t, kernels.Java.Argv, "java")
		assert.Contains(t, kernels.Java.Argv, "-jar")
		assert.Contains(t, kernels.Java.Argv, "{connection_file}")

		// Verify the kernel files were created
		pythonKernelFile := filepath.Join(codePath, "python-kernel.json")
		golangKernelFile := filepath.Join(codePath, "go-kernel.json")
		javascriptKernelFile := filepath.Join(codePath, "javascript-kernel.json")
		javaKernelFile := filepath.Join(codePath, "java-kernel.json")

		assert.FileExists(t, pythonKernelFile)
		assert.FileExists(t, golangKernelFile)
		assert.FileExists(t, javascriptKernelFile)
		assert.FileExists(t, javaKernelFile)
	})

	t.Run("Existing Valid Files", func(t *testing.T) {
		// Test that existing valid kernel files are read correctly
		tempDir := t.TempDir()
		projectPath := filepath.Join(tempDir, "project_existing")
		codePath := filepath.Join(projectPath, "code")

		// Create the code directory
		err := os.MkdirAll(codePath, 0755)
		assert.NoError(t, err)

		// Create valid kernel files
		pythonKernel := KernelJson{
			Argv:        []string{"custom-python", "-f", "{connection_file}"},
			DisplayName: "Custom Python",
			Language:    "python",
		}

		golangKernel := KernelJson{
			Argv:        []string{"/custom/gonb/path", "--kernel", "{connection_file}"},
			DisplayName: "Custom Go",
			Language:    "go",
		}

		javascriptKernel := KernelJson{
			Argv:        []string{"/custom/deno/path", "jupyter", "--kernel", "--conn", "{connection_file}"},
			DisplayName: "Custom Deno",
			Language:    "javascript",
		}

		javaKernel := KernelJson{
			Argv:        []string{"java", "-jar", "{resource_dir}/jjava-launcher.jar", "{resource_dir}/jjava.jar", "{connection_file}"},
			DisplayName: "Java (jjava)",
			Language:    "java",
		}

		// Write the kernel files
		pythonKernelJSON, err := json.Marshal(pythonKernel)
		assert.NoError(t, err)
		err = os.WriteFile(filepath.Join(codePath, "python-kernel.json"), pythonKernelJSON, 0644)
		assert.NoError(t, err)

		golangKernelJSON, err := json.Marshal(golangKernel)
		assert.NoError(t, err)
		err = os.WriteFile(filepath.Join(codePath, "go-kernel.json"), golangKernelJSON, 0644)
		assert.NoError(t, err)

		javascriptKernelJSON, err := json.Marshal(javascriptKernel)
		assert.NoError(t, err)
		err = os.WriteFile(filepath.Join(codePath, "javascript-kernel.json"), javascriptKernelJSON, 0644)
		assert.NoError(t, err)

		javaKernelJSON, err := json.Marshal(javaKernel)
		assert.NoError(t, err)
		err = os.WriteFile(filepath.Join(codePath, "java-kernel.json"), javaKernelJSON, 0644)
		assert.NoError(t, err)

		// Call GetAllKernels
		kernels, err := GetAllKernels(projectPath)
		assert.NoError(t, err)

		// Verify the existing values were read correctly
		assert.Equal(t, pythonKernel, kernels.Python)
		assert.Equal(t, golangKernel, kernels.Go)
		assert.Equal(t, javascriptKernel, kernels.Javascript)
		assert.Equal(t, javaKernel, kernels.Java)
	})
}
func TestGetPythonVirtualEnvironments(t *testing.T) {
	t.Run("Finds virtual environments in project", func(t *testing.T) {
		// Create temp project directory
		projectDir := t.TempDir()

		// Create code directory
		codeDir := filepath.Join(projectDir, "code")
		err := os.Mkdir(codeDir, 0755)
		assert.NoError(t, err)

		// Create two virtual environments and one regular directory
		venv1 := filepath.Join(codeDir, "venv1")
		venv2 := filepath.Join(codeDir, "venv2")
		regularDir := filepath.Join(codeDir, "regular")

		for _, dir := range []string{venv1, venv2, regularDir} {
			err := os.Mkdir(dir, 0755)
			assert.NoError(t, err)
		}

		// Add pyvenv.cfg to the virtual environments
		err = os.WriteFile(filepath.Join(venv1, "pyvenv.cfg"), []byte("home = /usr/bin"), 0644)
		assert.NoError(t, err)
		err = os.WriteFile(filepath.Join(venv2, "pyvenv.cfg"), []byte("home = /usr/bin"), 0644)
		assert.NoError(t, err)

		// Test GetPythonVirtualEnvironments
		venvs, err := GetPythonVirtualEnvironments(projectDir, []string{})
		assert.NoError(t, err)
		assert.Len(t, venvs, 2, "Should find exactly 2 virtual environments")
		assert.Contains(t, venvs, venv1, "Should include venv1")
		assert.Contains(t, venvs, venv2, "Should include venv2")
	})

	t.Run("Handles missing code directory", func(t *testing.T) {
		// Create temp project directory without code subdirectory
		projectDir := t.TempDir()

		// Test with no code directory
		venvs, err := GetPythonVirtualEnvironments(projectDir, []string{})
		assert.Error(t, err, "Should return error when code directory doesn't exist")
		assert.Empty(t, venvs, "Should return empty list when code directory doesn't exist")
	})

	t.Run("Returns empty list when no virtual environments", func(t *testing.T) {
		// Create temp project directory
		projectDir := t.TempDir()

		// Create code directory without virtual environments
		codeDir := filepath.Join(projectDir, "code")
		err := os.Mkdir(codeDir, 0755)
		assert.NoError(t, err)

		// Create a regular directory
		regularDir := filepath.Join(codeDir, "regular")
		err = os.Mkdir(regularDir, 0755)
		assert.NoError(t, err)

		// Test with no virtual environments
		venvs, err := GetPythonVirtualEnvironments(projectDir, []string{})
		assert.NoError(t, err)
		assert.Empty(t, venvs, "Should return empty list when no virtual environments exist")
	})
}
