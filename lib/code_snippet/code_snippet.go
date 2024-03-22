package code_snippet

import (
	"fmt"
	"os"
	"os/exec"

	"github.com/etesam913/bytebook/lib/project_types"
)

func GetExtensionFromLanguage(language string) (bool, string) {
	languageToExtension := map[string]string{
		"python":     ".py",
		"javascript": ".js",
		"java":       ".java",
		"typescript": ".ts",
		"go":         ".go",
		"c":          ".c",
		"c++":        ".cpp",
	}

	value, exists := languageToExtension[language]
	if exists {
		return true, value
	}
	return false, ""
}

func RunFile(path string, command string) (string, error) {
	cmd := exec.Command(command, path)
	out, err := cmd.CombinedOutput()

	if err != nil {
		return err.Error() + "\n" + string(out), err
	}

	return string(out), nil
}

func RunCode(language string, code string, command string, projectPath string) project_types.SuccessHandler {
	extensionExists, extension := GetExtensionFromLanguage(language)
	if !extensionExists {
		return project_types.SuccessHandler{
			Success:         false,
			Message:         "Your programming language is invalid",
			InternalMessage: "Failed in getting language extension",
		}
	}
	// Creates a temp file for the code
	filePath := fmt.Sprintf("%s/tmp%s", projectPath, extension)
	file, err := os.Create(filePath)
	if err != nil {
		return project_types.SuccessHandler{
			Success:         false,
			Message:         "Something went wrong when running your code. Please try again later",
			InternalMessage: "Failed in creating temp file for running code",
		}
	}

	defer file.Close()

	_, err = file.WriteString(code)

	if err != nil {
		return project_types.SuccessHandler{
			Success:         false,
			Message:         "Something went wrong when running your code. Please try again later",
			InternalMessage: "Failed in writing code to temp file",
		}
	}

	res, err := RunFile(filePath, command)

	if err != nil {
		return project_types.SuccessHandler{
			Success:         false,
			Message:         res,
			InternalMessage: res,
		}
	}

	os.Remove(filePath)

	return project_types.SuccessHandler{
		Success:         true,
		Message:         res,
		InternalMessage: "Successfully Ran File",
	}
}
