package terminal_helpers

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	"github.com/creack/pty"
	"github.com/etesam913/bytebook/lib/io_helpers"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type TerminalSession struct {
	Ptmx   *os.File
	Cancel context.CancelFunc
	Cmd    *exec.Cmd
}

type terminalData struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

var Terminals sync.Map

// SetupTerminal initializes a new terminal session for a given node key.
// It sets up a pseudo-terminal (pty) running a bash shell, and configures event listeners
// for input, resizing, and output.
//
// Parameters:
// - app: The Wails application instance
// - projectPath: The path to the project directory
// - nodeKey: A unique identifier for this terminal session
// - startDirectory: The directory where the terminal should start
// - shell: The shell to start the terminal in
//
// The function does the following:
// 1. Checks if the start directory exists
// 2. Starts a new pty session with a bash shell
// 3. Stores the terminal session in a global map
// 4. Sets up event listeners for terminal input and resizing
// 5. Writes the initial directory change command to the terminal
// 6. Continuously reads from the pty and emits output events
//
// Returns an error if there's any issue setting up the terminal
func SetupTerminal(app *application.App, projectPath string, nodeKey string, startDirectory string, shell string) error {
	doesStartDirectoryExist, _ := io_helpers.FileOrFolderExists(startDirectory)
	// Start a new pty session with bash shell
	cmd := exec.Command(shell)
	ptmx, err := pty.Start(cmd)
	if err != nil {
		return err
	}
	_, cancel := context.WithCancel(context.Background())
	fmt.Println("PID: ", cmd.Process.Pid)
	session := &TerminalSession{
		Ptmx:   ptmx,
		Cancel: cancel,
		Cmd:    cmd,
	}

	Terminals.Store(nodeKey, session)
	ListActiveTerminals()

	if !doesStartDirectoryExist {
		startDirectory = projectPath
	}
	// Add a delay before writing the command to prevent output mangling with the exec.Command(shell)
	time.Sleep(200 * time.Millisecond)
	WriteCommand(ptmx, "cd \""+startDirectory+"\"\n")

	terminalInputEventName := fmt.Sprintf("terminal:input-%s", nodeKey)
	app.OnEvent(terminalInputEventName, func(e *application.CustomEvent) {
		ptmx.Write([]byte(e.Data.(string)))
	})

	handleTerminalResize(app, ptmx, nodeKey)
	// Make sure to close the pty at the end.
	defer func() {
		fmt.Println("closed")
		_ = ptmx.Close()

	}()

	buf := make([]byte, 1024)
	for {
		n, err := ptmx.Read(buf)
		if err != nil {
			log.Println("read error:", err)
			break
		}
		currentCommand := string(buf[:n])
		fmt.Println("current command: ", currentCommand)
		terminalOutputEventName := fmt.Sprintf("terminal:output-%s", nodeKey)
		app.EmitEvent(terminalOutputEventName, terminalData{
			Type:  "command",
			Value: currentCommand,
		})
	}
	return nil
}

// handleTerminalResize sets up an event listener for terminal resize events
// and adjusts the terminal size accordingly.
func handleTerminalResize(app *application.App, ptmx *os.File, nodeKey string) {
	// Create a unique event name for this terminal's resize events
	terminalResizeEventName := fmt.Sprintf("terminal:resize-%s", nodeKey)

	// Set up the event listener
	app.OnEvent(terminalResizeEventName, func(e *application.CustomEvent) {
		// Try to cast the event data to the expected type
		data, ok := e.Data.(map[string]interface{})
		if !ok {
			log.Println("Invalid data type for resize event")
			return
		}

		// Extract and validate the new column and row values
		cols, colsOk := data["cols"].(float64)
		rows, rowsOk := data["rows"].(float64)
		if !colsOk || !rowsOk {
			log.Println("Invalid cols or rows data")
			return
		}

		// Resize the terminal using the pty package
		pty.Setsize(ptmx, &pty.Winsize{
			Cols: uint16(cols),
			Rows: uint16(rows),
		})
	})
}

// WriteCommand simulates typing a command in the terminal. It adds a delay before writing
// and types each character individually to mimic human input.
func WriteCommand(ptmx *os.File, command string) error {
	commandString := command + "\n"
	commandBytes := []byte(commandString)

	// Write the command character by character as if typing it
	for _, char := range commandBytes {
		time.Sleep(2 * time.Millisecond)
		_, err := ptmx.Write([]byte{char})
		if err != nil {
			return err
		}
	}
	return nil
}

func ListActiveTerminals() {
	log.Println("Active Terminal Sessions:")
	Terminals.Range(func(key, value interface{}) bool {
		log.Println(" - Terminal NodeKey:", key)
		return true
	})
}

// Listens for terminal:create events
func ListenToTerminalCreateEvent(app *application.App, projectPath string) {
	app.OnEvent("terminal:create", func(e *application.CustomEvent) {
		data, ok := e.Data.(map[string]interface{})
		if ok {
			nodeKey, isNodeKeyOk := data["nodeKey"].(string)
			startDirectory, isStartDirectoryOk := data["startDirectory"].(string)
			shell, isShellOk := data["shell"].(string)

			if isNodeKeyOk && isStartDirectoryOk && isShellOk {
				go SetupTerminal(app, projectPath, nodeKey, startDirectory, shell)
			}
		}
	})
}

// writeCargoToml creates a standard Cargo.toml file in the specified directory.
func WriteCargoToml(dir string) error {
	// Define the content of the Cargo.toml file
	cargoTomlContent := `[package]
name = "temp_project"
version = "0.1.0"
authors = ["Your Name <your.email@example.com>"]
edition = "2021"

[dependencies]
`

	// Ensure the directory exists
	err := os.MkdirAll(dir, 0755)
	if err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	// Define the file path
	filePath := filepath.Join(dir, "Cargo.toml")

	// Create and open the file
	file, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	// Write the content to the file
	_, err = file.WriteString(cargoTomlContent)
	if err != nil {
		return fmt.Errorf("failed to write to file: %w", err)
	}

	return nil
}

func GetExtensionFromLanguage(language string) (bool, string) {
	languageToExtension := map[string]string{
		"python":     ".py",
		"javascript": ".js",
		"java":       ".java",
		"typescript": ".ts",
		"go":         ".go",
		"c":          ".c",
		"cpp":        ".cpp",
		"rust":       ".rs",
	}

	value, exists := languageToExtension[language]
	if exists {
		return true, value
	}
	return false, ""
}

func GenerateFoldersForLanguages(projectPath string) {
	languages := []string{"python", "javascript", "java", "go", "cpp", "rust"}

	for _, language := range languages {
		exists, fileExtension := GetExtensionFromLanguage(language)
		if !exists {
			continue
		}

		pathToLanguageFileDirectory := filepath.Join(projectPath, language, "src")
		err := os.MkdirAll(pathToLanguageFileDirectory, 0755)
		if err != nil {
			continue
		}
		pathToLanguageFile := filepath.Join(pathToLanguageFileDirectory, "main"+fileExtension)
		file, err := os.Create(pathToLanguageFile)
		if err != nil {
			continue
		}
		defer file.Close()
		if language == "rust" {
			err = WriteCargoToml(filepath.Join(projectPath, language))
			if err != nil {
				continue
			}
		}

	}
}
