package terminal

import (
	"fmt"
	"log"
	"os/exec"
	"runtime"

	"github.com/creack/pty"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type TerminalData struct {
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
	terminalInputEventName := fmt.Sprintf("terminal:input-%s", nodeKey)
	app.OnEvent(terminalInputEventName, func(e *application.CustomEvent) {
		ptmx.Write([]byte(e.Data.(string)))
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
		terminalOutputEventName := fmt.Sprintf("terminal:output-%s", nodeKey)
		app.EmitEvent(terminalOutputEventName, TerminalData{
			Type:  "command",
			Value: string(buf[:n]),
		})
		fmt.Println(string(buf[:n]))
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
