import { Events } from "@wailsio/runtime";
import type { Terminal } from "@xterm/xterm";
import { type RefObject, useEffect } from "react";

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

export function useFocusOnSelect(
	isSelected: boolean,
	terminalRef: React.RefObject<HTMLDivElement | null>,
) {
	useEffect(() => {
		if (isSelected && terminalRef.current) {
			const xtermTextareaHelper = terminalRef.current.querySelector(
				".xterm-helper-textarea",
			) as HTMLElement;
			if (xtermTextareaHelper) {
				xtermTextareaHelper.focus();
			}
		}
	}, [isSelected, terminalRef]);
}

export function useTerminalTheme(
	isDarkModeOn: boolean,
	term: RefObject<Terminal>,
) {
	useEffect(() => {
		if (term.current) {
			term.current.options.theme = isDarkModeOn
				? darkTerminalTheme
				: lightTerminalTheme;
		}
	}, [isDarkModeOn]);
}

/**
 * Emits a terminal:create event to the backend
 * so that it knows to launch a pty
 */
export function useTerminalCreate(nodeKey: string) {
	useEffect(() => {
		Events.Emit({
			name: "terminal:create",
			data: nodeKey,
		});
	}, []);
}
