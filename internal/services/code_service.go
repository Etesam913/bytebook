package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/etesam913/bytebook/internal/config"
	"github.com/etesam913/bytebook/internal/kernel_manager"
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// CodeService is the RPC surface exposed to the frontend for kernel and code-block operations.
// All kernel state lives on the manager; the service is a thin adapter.
type CodeService struct {
	ProjectPath string
	Manager     *kernel_manager.KernelManager
}

// SendExecuteRequestResponse carries the resolved kernel instance id back to the
// frontend so subsequent control calls (interrupt, shutdown) can target it directly.
type SendExecuteRequestResponse struct {
	KernelInstanceID string `json:"kernelInstanceId"`
}

// SendExecuteRequest resolves (language, noteId) to a kernel instance (creating it if
// needed, evicting LRU idle if at the per-language cap), then sends the execute_request.
func (c *CodeService) SendExecuteRequest(noteID, codeBlockID, executionID, language, code string) config.BackendResponseWithData[SendExecuteRequestResponse] {
	projectSettings, err := config.GetProjectSettings(c.ProjectPath)
	if err != nil {
		return errResp[SendExecuteRequestResponse]("Failed to get project settings. Please check if the settings.json file exists.")
	}

	if language == "python" && !util.IsVirtualEnv(projectSettings.Code.PythonVenvPath) {
		return errResp[SendExecuteRequestResponse]("A virtual environment is not set. A virtual environment can be configured in the \"Code Block\" section of the settings.")
	}

	venvPath := projectSettings.Code.PythonVenvPath

	inst, err := c.Manager.GetOrCreate(context.Background(), language, noteID, venvPath)
	if err != nil {
		if errors.Is(err, kernel_manager.ErrNoIdleKernelToEvict) {
			return errResp[SendExecuteRequestResponse](fmt.Sprintf("Stop another %s kernel to start this one.", language))
		}
		return errResp[SendExecuteRequestResponse](err.Error())
	}

	if err := inst.SendExecute(codeBlockID, executionID, code); err != nil {
		return errResp[SendExecuteRequestResponse](fmt.Sprintf("Failed to send execute request: %v", err))
	}
	inst.MarkActivity()

	return config.BackendResponseWithData[SendExecuteRequestResponse]{
		Success: true,
		Message: "Execute request sent successfully",
		Data:    SendExecuteRequestResponse{KernelInstanceID: inst.ID()},
	}
}

// EnsureKernel launches a kernel for (language, noteId) without sending an execute_request.
// Used by the "Turn on kernel" button on code blocks.
func (c *CodeService) EnsureKernel(noteID, language string) config.BackendResponseWithData[SendExecuteRequestResponse] {
	projectSettings, err := config.GetProjectSettings(c.ProjectPath)
	if err != nil {
		return errResp[SendExecuteRequestResponse]("Failed to retrieve project settings.")
	}
	if language == "python" && !util.IsVirtualEnv(projectSettings.Code.PythonVenvPath) {
		return errResp[SendExecuteRequestResponse]("A virtual environment is not set. A virtual environment can be configured in the \"Code Block\" section of the settings.")
	}

	inst, err := c.Manager.GetOrCreate(context.Background(), language, noteID, projectSettings.Code.PythonVenvPath)
	if err != nil {
		if errors.Is(err, kernel_manager.ErrNoIdleKernelToEvict) {
			return errResp[SendExecuteRequestResponse](fmt.Sprintf("Stop another %s kernel to start this one.", language))
		}
		return errResp[SendExecuteRequestResponse](err.Error())
	}
	return config.BackendResponseWithData[SendExecuteRequestResponse]{
		Success: true,
		Message: "Kernel ready",
		Data:    SendExecuteRequestResponse{KernelInstanceID: inst.ID()},
	}
}

// ShutdownKernel shuts down a specific kernel instance.
func (c *CodeService) ShutdownKernel(kernelInstanceID string, restart bool) config.BackendResponseWithoutData {
	if err := c.Manager.Shutdown(kernelInstanceID, restart); err != nil {
		return config.BackendResponseWithoutData{Success: false, Message: err.Error()}
	}
	return config.BackendResponseWithoutData{Success: true, Message: "Kernel shutdown requested"}
}

// ShutdownKernelsByLanguage shuts down every kernel of the given language.
func (c *CodeService) ShutdownKernelsByLanguage(language string) config.BackendResponseWithoutData {
	c.Manager.ShutdownAllByLanguage(language)
	return config.BackendResponseWithoutData{Success: true, Message: fmt.Sprintf("All %s kernels shut down", language)}
}

// SendInterruptRequest sends an interrupt_request to the named instance.
func (c *CodeService) SendInterruptRequest(kernelInstanceID, codeBlockID, executionID string) config.BackendResponseWithoutData {
	inst := c.Manager.GetByID(kernelInstanceID)
	if inst == nil {
		return config.BackendResponseWithoutData{Success: false, Message: "Kernel instance not found"}
	}
	if !inst.IsHeartbeating() {
		return config.BackendResponseWithoutData{Success: false, Message: "Kernel is not running."}
	}
	if err := inst.SendInterrupt(codeBlockID, executionID); err != nil {
		return config.BackendResponseWithoutData{Success: false, Message: err.Error()}
	}
	return config.BackendResponseWithoutData{Success: true, Message: "Interrupt sent"}
}

// SendInputReply forwards a user-supplied input value to the kernel's stdin socket.
func (c *CodeService) SendInputReply(kernelInstanceID, codeBlockID, executionID, value string) config.BackendResponseWithoutData {
	inst := c.Manager.GetByID(kernelInstanceID)
	if inst == nil {
		return config.BackendResponseWithoutData{Success: false, Message: "Kernel instance not found"}
	}
	if !inst.IsHeartbeating() {
		return config.BackendResponseWithoutData{Success: false, Message: "Kernel is not running."}
	}
	if err := inst.SendInputReply(codeBlockID, executionID, value); err != nil {
		return config.BackendResponseWithoutData{Success: false, Message: err.Error()}
	}
	return config.BackendResponseWithoutData{Success: true, Message: "Input reply sent"}
}

type SendInspectRequestResponse struct {
	MessageId *string `json:"messageId"`
}

// SendInspectRequest sends an inspect_request to the named instance.
func (c *CodeService) SendInspectRequest(kernelInstanceID, codeBlockID, executionID, code string, cursorPos, detailLevel int) config.BackendResponseWithData[SendInspectRequestResponse] {
	inst := c.Manager.GetByID(kernelInstanceID)
	if inst == nil {
		return errResp[SendInspectRequestResponse]("Kernel instance not found")
	}
	if !inst.IsHeartbeating() {
		return errResp[SendInspectRequestResponse]("Kernel is not running.")
	}
	messageID, err := inst.SendInspect(codeBlockID, executionID, code, cursorPos, detailLevel)
	if err != nil {
		return errResp[SendInspectRequestResponse](err.Error())
	}
	return config.BackendResponseWithData[SendInspectRequestResponse]{
		Success: true,
		Message: "Inspection request sent",
		Data:    SendInspectRequestResponse{MessageId: &messageID},
	}
}

// ListKernels returns snapshots of every live kernel instance.
func (c *CodeService) ListKernels() config.BackendResponseWithData[[]kernel_manager.KernelInstanceSnapshot] {
	return config.BackendResponseWithData[[]kernel_manager.KernelInstanceSnapshot]{
		Success: true,
		Message: "Kernels listed",
		Data:    c.Manager.List(),
	}
}

// GetPythonVirtualEnvironments retrieves the paths to all Python virtual environments in the project code directory.
func (c *CodeService) GetPythonVirtualEnvironments() config.BackendResponseWithData[[]string] {
	projectSettings, err := config.GetProjectSettings(c.ProjectPath)
	if err != nil {
		return errResp[[]string]("Failed to retrieve project settings")
	}

	virtualEnvironmentPaths, err := config.GetPythonVirtualEnvironments(
		c.ProjectPath,
		projectSettings.Code.CustomPythonVenvPaths,
	)
	if err != nil {
		return errResp[[]string](err.Error())
	}
	return config.BackendResponseWithData[[]string]{
		Success: true,
		Message: "Successfully got virtual environment paths",
		Data:    virtualEnvironmentPaths,
	}
}

func (c *CodeService) IsPathAValidVirtualEnvironment(path string) config.BackendResponseWithoutData {
	if path == "" {
		return config.BackendResponseWithoutData{
			Success: false,
			Message: "The provided path is empty. Please provide a valid path to a virtual environment.",
		}
	}
	if util.IsVirtualEnv(path) {
		return config.BackendResponseWithoutData{
			Success: true,
			Message: fmt.Sprintf("%s is a valid virtual environment", path),
		}
	}
	return config.BackendResponseWithoutData{
		Success: false,
		Message: fmt.Sprintf("%s is not a valid virtual environment as a pyvenv.cfg could not be found", path),
	}
}

// ChooseCustomVirtualEnvironmentPath opens a file dialog for the user to select a custom Python virtual environment path.
func (c *CodeService) ChooseCustomVirtualEnvironmentPath() config.BackendResponseWithData[string] {
	app := application.Get()
	if app == nil || app.Dialog == nil {
		return errResp[string]("Application not initialized")
	}

	localFilePath, err := app.Dialog.OpenFile().
		CanChooseDirectories(true).
		CanChooseFiles(false).
		PromptForSingleSelection()

	if err != nil {
		return errResp[string]("Failed to open file dialog")
	}

	return config.BackendResponseWithData[string]{
		Success: true,
		Data:    localFilePath,
		Message: "Successfully selected virtual environment",
	}
}

// GetKernelDescriptor returns the static kernel.json descriptor for a language.
// The frontend uses this to display launch commands and other static info.
func (c *CodeService) GetKernelDescriptor(language string) config.BackendResponseWithData[*config.KernelJson] {
	all, err := config.GetAllKernels(c.ProjectPath)
	if err != nil {
		return errResp[*config.KernelJson](err.Error())
	}
	var k *config.KernelJson
	switch language {
	case "python":
		k = &all.Python
	case "go":
		k = &all.Go
	case "javascript":
		k = &all.Javascript
	case "java":
		k = &all.Java
	default:
		return errResp[*config.KernelJson]("Unsupported language")
	}
	return config.BackendResponseWithData[*config.KernelJson]{
		Success: true,
		Message: "Kernel descriptor retrieved",
		Data:    k,
	}
}

// errResp constructs a typed BackendResponseWithData error result with a zero-value Data.
func errResp[T any](msg string) config.BackendResponseWithData[T] {
	var zero T
	return config.BackendResponseWithData[T]{Success: false, Message: msg, Data: zero}
}
