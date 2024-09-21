import { Events } from "@wailsio/runtime";
import type { FitAddon } from "@xterm/addon-fit";
import type { Terminal } from "@xterm/xterm";
import type { RefObject } from "react";

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

// Handle terminal resize
export function handleResize(
	fitAddon: RefObject<FitAddon>,
	term: RefObject<Terminal>,
	nodeKey: string,
) {
	if (!fitAddon.current) return;
	fitAddon.current.fit();
	if (term.current) {
		term.current.focus();
		const [rows, cols] = [term.current.rows, term.current.cols];
		Events.Emit({
			name: `terminal:resize-${nodeKey}`,
			data: { rows, cols },
		});
	}
}
