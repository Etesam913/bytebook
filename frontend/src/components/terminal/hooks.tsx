import { Events } from "@wailsio/runtime";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useAtomValue } from "jotai/react";
import { type MutableRefObject, type RefObject, useEffect } from "react";
import type { CodeResponse } from "../../../bindings/github.com/etesam913/bytebook";
import { noteContainerRefAtom } from "../../atoms";
import type { CodeBlockData } from "../../types";
import { useWailsEvent } from "../../utils/hooks";
import { darkTerminalTheme, handleResize, lightTerminalTheme } from "./utils";

/**
 *
   Whenever the underlying node is selected, it focuses on the terminal textarea.
	 This improves the UX. When the node is in a code snippet, it does not focus on the textarea
	 as we want the code snippet to be selected
 */
export function useFocusOnSelect(
	isSelected: boolean,
	terminalRef: React.RefObject<HTMLDivElement | null>,
	isInCodeSnippet: boolean,
) {
	useEffect(() => {
		if (isSelected && terminalRef.current && !isInCodeSnippet) {
			const xtermTextareaHelper = terminalRef.current.querySelector(
				".xterm-helper-textarea",
			) as HTMLElement;
			if (xtermTextareaHelper) {
				xtermTextareaHelper.focus();
			}
		}
	}, [isSelected, terminalRef, isInCodeSnippet]);
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
export function useTerminalCreateEventForBackend(
	nodeKey: string,
	startDirectory: string,
	shell: string,
) {
	useEffect(() => {
		Events.Emit({
			name: "terminal:create",
			data: { nodeKey, startDirectory, shell },
		});
	}, []);
}

/**
 * Custom hook to handle terminal resizing
 *
 * This hook sets up a ResizeObserver to watch for changes in the note container's size.
 * When a resize occurs, it triggers a resize of the terminal to fit the new dimensions.
 *
 * @param xtermRef - Reference to the xterm Terminal instance
 * @param xtermFitAddonRef - Reference to the FitAddon for xterm
 * @param nodeKey - Unique identifier for the terminal node
 */
export function useTerminalResize(
	xtermRef: RefObject<Terminal | null>,
	xtermFitAddonRef: RefObject<FitAddon | null>,
	nodeKey: string,
) {
	// Get the reference to the note container from the global state
	const noteContainerRef = useAtomValue(noteContainerRefAtom);

	useEffect(() => {
		// Early return if the note container reference is not available
		if (!noteContainerRef || !noteContainerRef.current) return;

		// Create a ResizeObserver to watch for size changes
		const resizeObserver = new ResizeObserver(() => {
			// Check if both xterm and its fit addon are available
			if (!xtermRef.current || !xtermFitAddonRef.current) return;
			// Trigger the resize handler
			handleResize(xtermRef.current, xtermFitAddonRef.current, nodeKey);
		});

		// Start observing the note container for size changes
		resizeObserver.observe(noteContainerRef.current);

		// Cleanup function to disconnect the observer when the component unmounts
		return () => {
			resizeObserver.disconnect();
		};
	}, [xtermRef, xtermFitAddonRef, nodeKey, noteContainerRef]);
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
	isInCodeSnippet: boolean,
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

		// Selects the terminal when it is firstly created using slash command. Also, don't select the terminal when it is in a code snippet as the code snippet will be selected automatically
		if (isSelected && !isInCodeSnippet) {
			xtermRef.current.focus();
		}
		// Fit the terminal to the container size
		xtermFitAddonRef.current.fit();

		// Handle data from xterm and send it to backend
		xtermRef.current.onData((data) => {
			setIsSelected(true);
			Events.Emit({
				name: `terminal:input-${nodeKey}`,
				data,
			});
		});

		// Cleanup on component unmount
		return () => {
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
	writeCodeBlockDataToNode: (result: CodeResponse) => void,
) {
	useWailsEvent(`terminal:output-${nodeKey}`, (body) => {
		const data = body.data as { type: string; value: string }[];
		if (term.current) {
			const newValue = data.at(0)?.value;
			if (!newValue) return;

			const valueToWrite = codeBlockData.result.message + newValue;
			writeCodeBlockDataToNode({
				success: true,
				message: valueToWrite,
				id: nodeKey,
			});
			term.current.write(newValue);
		}
	});
}
