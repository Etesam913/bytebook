package main

import "github.com/etesam913/bytebook/lib/terminal"

type TerminalService struct {
}

func (t *TerminalService) ShutoffTerminals(nodeKeys []string) {
	for _, nodeKey := range nodeKeys {
		// if the node key exists in the map and is typed as a TerminalSession
		if sessionUntyped, ok := terminal.Terminals.Load(nodeKey); ok {
			if session, ok := sessionUntyped.(*terminal.TerminalSession); ok {
				session.Ptmx.Close()
				session.Cancel()
				terminal.Terminals.Delete(nodeKey)
			}
		}
	}
	terminal.ListActiveTerminals()
}
