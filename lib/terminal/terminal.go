package terminal

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"sync"

	"github.com/creack/pty"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type TerminalSession struct {
	Ptmx   *os.File
	Cancel context.CancelFunc
}

type terminalData struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

var Terminals sync.Map

func SetupTerminal(app *application.App, nodeKey string) error {
	// Start a new pty session with bash shell
	cmd := exec.Command("bash")
	ptmx, err := pty.Start(cmd)
	if err != nil {
		return err
	}
	_, cancel := context.WithCancel(context.Background())

	session := &TerminalSession{
		Ptmx:   ptmx,
		Cancel: cancel,
	}

	Terminals.Store(nodeKey, session)
	ListActiveTerminals()

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
	defer func() { _ = ptmx.Close() }()

	buf := make([]byte, 1024)
	for {
		n, err := ptmx.Read(buf)
		if err != nil {
			log.Println("read error:", err)
			break
		}
		currentCommand := string(buf[:n])
		terminalOutputEventName := fmt.Sprintf("terminal:output-%s", nodeKey)
		app.EmitEvent(terminalOutputEventName, terminalData{
			Type:  "command",
			Value: currentCommand,
		})
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
func ListenToTerminalCreateEvent(app *application.App) {
	app.OnEvent("terminal:create", func(e *application.CustomEvent) {
		nodeKey := e.Data.(string)
		go SetupTerminal(app, nodeKey)
	})
}
