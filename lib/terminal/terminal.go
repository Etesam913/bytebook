package terminal

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
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

func SetupTerminal(app *application.App, projectPath string, nodeKey string, startDirectory string) error {
	doesStartDirectoryExist, _ := io_helpers.FileOrFolderExists(startDirectory)
	startCommand := "bash"
	// Start a new pty session with bash shell
	cmd := exec.Command(startCommand)
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

	writeStartDirectory(ptmx, startDirectory)

	terminalInputEventName := fmt.Sprintf("terminal:input-%s", nodeKey)
	app.OnEvent(terminalInputEventName, func(e *application.CustomEvent) {
		ptmx.Write([]byte(e.Data.(string)))
	})
	terminalResizeEventName := fmt.Sprintf("terminal:resize-%s", nodeKey)
	app.OnEvent(terminalResizeEventName, func(e *application.CustomEvent) {
		data, ok := e.Data.(map[string]interface{})
		if !ok {
			log.Println("Invalid data type for resize event")
			return
		}
		cols, colsOk := data["cols"].(float64)
		rows, rowsOk := data["rows"].(float64)
		if !colsOk || !rowsOk {
			log.Println("Invalid cols or rows data")
			return
		}
		pty.Setsize(ptmx, &pty.Winsize{
			Cols: uint16(cols),
			Rows: uint16(rows),
		})
	})

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

// writeStartDirectory simulates typing the 'cd' command to change to the specified
// start directory in the terminal. It adds a delay before writing and types each
// character individually to mimic human input.
func writeStartDirectory(ptmx *os.File, startDirectory string) {
	// Add a delay so the write happens after the initial bash~ write
	time.Sleep(200 * time.Millisecond)
	startDirectoryString := "cd \"" + startDirectory + "\"\n"
	startDirectoryStringAsBytes := []byte(startDirectoryString)
	// Write the start directory each character by each character as if I was writing it
	for i := 0; i < len(startDirectoryStringAsBytes); i++ {
		time.Sleep(2 * time.Millisecond)
		ptmx.Write([]byte{startDirectoryStringAsBytes[i]})
	}
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

			if isNodeKeyOk && isStartDirectoryOk {
				go SetupTerminal(app, projectPath, nodeKey, startDirectory)
			}
		}
	})
}
