package terminal

import (
	"fmt"
	"log"
	"os/exec"
	"runtime"

	"github.com/creack/pty"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type terminalData struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

func SetupTerminal(app *application.App, nodeKey string) error {
	// Start a new pty session with bash shell
	cmd := exec.Command("bash")
	ptmx, err := pty.Start(cmd)
	if err != nil {
		return err
	}
	fmt.Println("terminal key: ", nodeKey)
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
		currentCommand := string(buf[:n])
		if err != nil {
			log.Println("read error:", err)
			break
		}
		terminalOutputEventName := fmt.Sprintf("terminal:output-%s", nodeKey)
		app.EmitEvent(terminalOutputEventName, terminalData{
			Type:  "command",
			Value: currentCommand,
		})
	}
	return nil
}

// Listens for terminal:create events
func ListenToTerminalCreateEvent(app *application.App) {
	app.OnEvent("terminal:create", func(e *application.CustomEvent) {
		nodeKey := e.Data.(string)
		go SetupTerminal(app, nodeKey)
		fmt.Printf("Number of goroutines: %d\n", runtime.NumGoroutine())
	})
}
