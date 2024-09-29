import { Events } from "@wailsio/runtime";
import type { FitAddon } from "@xterm/addon-fit";
import type { Terminal } from "@xterm/xterm";
import { WINDOW_ID } from "../../App";

export const darkTerminalTheme = {
	background: "rgb(21, 21, 21)",
	foreground: "#f4f4f5",
	cursor: "#f4f4f5",
};

export const lightTerminalTheme = {
	background: "rgb(255,255,255)",
	foreground: "rgb(21, 21, 21)",
	cursor: "rgb(21, 21, 21)",
};

// Handle terminal resize by resizing frontend terminal sending an event to resize backend pty
export function handleResize(
	term: Terminal,
	fitAddon: FitAddon,
	nodeKey: string,
) {
	fitAddon.fit();
	term.focus();
	Events.Emit({
		name: `terminal:resize-${nodeKey}-${WINDOW_ID}`,
		data: { rows: term.rows, cols: term.cols },
	});
}
