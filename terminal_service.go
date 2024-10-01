package main

// #include <libproc.h>
import "C"
import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"

	"github.com/etesam913/bytebook/lib/terminal_helpers"
)

type TerminalService struct {
}

type TerminalResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func getCWDFromPID(pid int) (string, error) {
	// Execute the `lsof` command to get the current working directory of the process
	cmd := exec.Command("lsof", "-p", fmt.Sprintf("%d", pid), "-Fn")
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		return "", fmt.Errorf("failed to execute lsof: %w", err)
	}

	// Parse the output to find the working directory (the first file descriptor 'cwd')
	lines := strings.Split(out.String(), "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "n") {
			return line[1:], nil
		}
	}

	return "", fmt.Errorf("failed to find working directory in lsof output")
}

func getTerminalSession(nodeKey string) (*terminal_helpers.TerminalSession, bool) {
	sessionUntyped, ok := terminal_helpers.Terminals.Load(nodeKey)
	if !ok {
		return nil, false
	}
	session, ok := sessionUntyped.(*terminal_helpers.TerminalSession)
	return session, ok
}

func (t *TerminalService) ShutoffTerminals(nodeKeys []string) []string {
	terminalDirectories := []string{}

	for _, nodeKey := range nodeKeys {
		if session, ok := getTerminalSession(nodeKey); ok {
			pid := session.Cmd.Process.Pid
			cwd, err := getCWDFromPID(pid)
			if err != nil {
				fmt.Printf("Error: %v\n", err)
				terminalDirectories = append(terminalDirectories, "")
			} else {
				fmt.Printf("Current directory of process %d: %s\n", pid, cwd)
				terminalDirectories = append(terminalDirectories, cwd)
			}
			session.Ptmx.Close()
			session.Cancel()
			terminal_helpers.Terminals.Delete(nodeKey)
		}
	}
	terminal_helpers.ListActiveTerminals()
	return terminalDirectories
}

func (t *TerminalService) RunCodeInTerminal(nodeKey string, command string) TerminalResponse {
	if session, ok := getTerminalSession(nodeKey); ok {
		err := terminal_helpers.WriteCommand(session.Ptmx, command)
		if err != nil {
			return TerminalResponse{
				Success: false,
				Message: err.Error(),
			}
		}
	}
	return TerminalResponse{
		Success: true,
		Message: "Successfully executed code",
	}
}
