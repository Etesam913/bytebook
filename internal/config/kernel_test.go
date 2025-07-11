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

		// Verify the kernel files were created
		pythonKernelFile := filepath.Join(codePath, "python-kernel.json")
		golangKernelFile := filepath.Join(codePath, "go-kernel.json")

		assert.FileExists(t, pythonKernelFile)
		assert.FileExists(t, golangKernelFile)
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

		// Write the kernel files
		pythonKernelJSON, err := json.Marshal(pythonKernel)
		assert.NoError(t, err)
		err = os.WriteFile(filepath.Join(codePath, "python-kernel.json"), pythonKernelJSON, 0644)
		assert.NoError(t, err)

		golangKernelJSON, err := json.Marshal(golangKernel)
		assert.NoError(t, err)
		err = os.WriteFile(filepath.Join(codePath, "go-kernel.json"), golangKernelJSON, 0644)
		assert.NoError(t, err)

		// Call GetAllKernels
		kernels, err := GetAllKernels(projectPath)
		assert.NoError(t, err)

		// Verify the existing values were read correctly
		assert.Equal(t, pythonKernel, kernels.Python)
		assert.Equal(t, golangKernel, kernels.Go)
	})
}
func TestGetAllConnectionInfo(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "all_connection_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create the code directory
	codeDir := filepath.Join(tempDir, "code")
	err = os.MkdirAll(codeDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create code dir: %v", err)
	}

	// Test getting all connection info
	allInfo, err := GetAllConnectionInfo(tempDir)
	assert.NoError(t, err)

	// Check Python connection info
	assert.Equal(t, "python", allInfo.Python.Language)
	assert.Equal(t, 55321, allInfo.Python.ShellPort)
	assert.Equal(t, 55322, allInfo.Python.IOPubPort)
	assert.Equal(t, 55323, allInfo.Python.StdinPort)
	assert.Equal(t, 55324, allInfo.Python.ControlPort)
	assert.Equal(t, 55325, allInfo.Python.HBPort)

	// Check Golang connection info
	assert.Equal(t, "go", allInfo.Go.Language)
	assert.Equal(t, 55326, allInfo.Go.ShellPort)
	assert.Equal(t, 55327, allInfo.Go.IOPubPort)
	assert.Equal(t, 55328, allInfo.Go.StdinPort)
	assert.Equal(t, 55329, allInfo.Go.ControlPort)
	assert.Equal(t, 55330, allInfo.Go.HBPort)

	// Check if the files were created
	pythonConnectionFile := filepath.Join(codeDir, "python-connection.json")
	_, err = os.Stat(pythonConnectionFile)
	assert.NoError(t, err)

	golangConnectionFile := filepath.Join(codeDir, "go-connection.json")
	_, err = os.Stat(golangConnectionFile)
	assert.NoError(t, err)
}

func TestGetConnectionInfoFromLanguage(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "connection_info_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create the code directory
	codeDir := filepath.Join(tempDir, "code")
	err = os.MkdirAll(codeDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create code dir: %v", err)
	}

	// Test with unsupported language
	t.Run("Unsupported language", func(t *testing.T) {
		_, err := GetConnectionInfoFromLanguage(tempDir, "ruby")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unsupported language: ruby")
	})

	// Test with Python language
	t.Run("Python language", func(t *testing.T) {
		info, err := GetConnectionInfoFromLanguage(tempDir, "python")
		assert.NoError(t, err)
		assert.Equal(t, "python", info.Language)
		assert.Equal(t, 55321, info.ShellPort)
		assert.Equal(t, 55322, info.IOPubPort)
		assert.Equal(t, 55323, info.StdinPort)
		assert.Equal(t, 55324, info.ControlPort)
		assert.Equal(t, 55325, info.HBPort)
		assert.Equal(t, "127.0.0.1", info.IP)
		assert.Equal(t, "abc123", info.Key)
		assert.Equal(t, "tcp", info.Transport)
		assert.Equal(t, "hmac-sha256", info.SignatureScheme)

		// Check if the file was created
		pythonConnectionFile := filepath.Join(codeDir, "python-connection.json")
		_, err = os.Stat(pythonConnectionFile)
		assert.NoError(t, err)
	})

	// Test with Golang language
	t.Run("Golang language", func(t *testing.T) {
		info, err := GetConnectionInfoFromLanguage(tempDir, "go")
		assert.NoError(t, err)
		assert.Equal(t, "go", info.Language)
		assert.Equal(t, 55326, info.ShellPort)
		assert.Equal(t, 55327, info.IOPubPort)
		assert.Equal(t, 55328, info.StdinPort)
		assert.Equal(t, 55329, info.ControlPort)
		assert.Equal(t, 55330, info.HBPort)
		assert.Equal(t, "127.0.0.1", info.IP)
		assert.Equal(t, "abc123", info.Key)
		assert.Equal(t, "tcp", info.Transport)
		assert.Equal(t, "hmac-sha256", info.SignatureScheme)

		// Check if the file was created
		golangConnectionFile := filepath.Join(codeDir, "go-connection.json")
		_, err = os.Stat(golangConnectionFile)
		assert.NoError(t, err)
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
