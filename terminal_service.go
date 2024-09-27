package main

// #include <libproc.h>
import "C"
import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"

	"github.com/etesam913/bytebook/lib/terminal"
)

type TerminalService struct {
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

func (t *TerminalService) ShutoffTerminals(nodeKeys []string) []string {
	terminalDirectories := []string{}

	for _, nodeKey := range nodeKeys {
		// if the node key exists in the map and is typed as a TerminalSession
		if sessionUntyped, ok := terminal.Terminals.Load(nodeKey); ok {
			if session, ok := sessionUntyped.(*terminal.TerminalSession); ok {
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
				terminal.Terminals.Delete(nodeKey)
			}
		}
	}
	terminal.ListActiveTerminals()
	return terminalDirectories
}
