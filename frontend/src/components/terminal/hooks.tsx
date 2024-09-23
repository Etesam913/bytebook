import type { SandpackFiles } from "@codesandbox/sandpack-react";
import { Events } from "@wailsio/runtime";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { type MutableRefObject, type RefObject, useEffect } from "react";
import type { CodeResponse } from "../../../bindings/github.com/etesam913/bytebook";
import type { CodeBlockData } from "../../types";
import { useWailsEvent } from "../../utils/hooks";
import { darkTerminalTheme, handleResize, lightTerminalTheme } from "./utils";
import { WINDOW_ID } from "../../App";

/**
 * 
   Whenever the underlying node is selected, it focuses on the terminal textarea.
	 This improves the UX
 */
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

/**
 * Updates the terminal theme based on the dark mode setting.
 * This hook applies the appropriate theme (dark or light) to the terminal
 * whenever the dark mode setting changes.
 */
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
export function useTerminalCreateEventForBackend(nodeKey: string) {
	useEffect(() => {
		Events.Emit({
			name: "terminal:create",
			data: `${nodeKey}-${WINDOW_ID}`,
		});
	}, []);
}

/**
 * Initializes the xterm.js frontend terminal
 */
export function useTerminalCreateFrontend(
	xtermRef: MutableRefObject<Terminal | null>,
	xtermFitAddonRef: MutableRefObject<FitAddon | null>,
	terminalRef: MutableRefObject<HTMLDivElement | null>,
	setIsSelected: (selected: boolean) => void,
	isDarkModeOn: boolean,
	isSelected: boolean,
	nodeKey: string,
	data: CodeBlockData,
) {
	useEffect(() => {
		xtermRef.current = new Terminal({
			cursorBlink: true,
			cols: 80,
			rows: 24,
			fontFamily: '"Jetbrains Mono", monospace',
			fontSize: 13,
			cursorStyle: "block",
			theme: isDarkModeOn ? darkTerminalTheme : lightTerminalTheme,
		});

		// Add the fit addon.
		xtermFitAddonRef.current = new FitAddon();
		xtermRef.current.loadAddon(xtermFitAddonRef.current);

		if (!terminalRef.current) {
			return;
		}
		// Open the terminal in the terminalRef div
		xtermRef.current.open(terminalRef.current);

		xtermRef.current.write(`${data.result.message}\r\n`);
		// Selects the terminal when it is firstly created using slash command
		if (isSelected) {
			xtermRef.current.focus();
		}
		// Fit the terminal to the container size
		xtermFitAddonRef.current.fit();

		// Handle data from xterm and send it to backend
		xtermRef.current.onData((data) => {
			setIsSelected(true);
			Events.Emit({
				name: `terminal:input-${nodeKey}-${WINDOW_ID}`,
				data,
			});
		});

		function handleResizeWrapper() {
			handleResize(xtermFitAddonRef, xtermRef, nodeKey);
		}

		window.addEventListener("resize", handleResizeWrapper);

		// Cleanup on component unmount
		return () => {
			window.removeEventListener("resize", handleResizeWrapper);
			if (xtermFitAddonRef.current) xtermFitAddonRef.current.dispose();
			if (xtermRef.current) xtermRef.current.dispose();
		};
	}, [terminalRef, setIsSelected, nodeKey]);
}

/**
 * Writes whatever is received in the backend pty terminal to the frontend terminal
 */
export function useTerminalWrite(
	nodeKey: string,
	term: RefObject<Terminal>,
	codeBlockData: CodeBlockData,
	writeCodeBlockDataToNode: (
		files: SandpackFiles,
		result: CodeResponse,
	) => void,
) {
	useWailsEvent(`terminal:output-${nodeKey}-${WINDOW_ID}`, (body) => {
		const data = body.data as { type: string; value: string }[];
		if (term.current) {
			const newValue = data.at(0)?.value;
			if (!newValue) return;
			const valueToWrite = codeBlockData.result.message + newValue;
			writeCodeBlockDataToNode(
				{ main: valueToWrite },
				{ success: true, message: valueToWrite, id: nodeKey },
			);
			term.current.write(newValue);
		}
	});
}
