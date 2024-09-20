import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import { Events } from "@wailsio/runtime";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useAtomValue } from "jotai";
import { CLICK_COMMAND, COMMAND_PRIORITY_NORMAL } from "lexical";
import { useEffect, useRef, useState } from "react";
import { darkModeAtom } from "../../atoms";
import { onClickDecoratorNodeCommand } from "../../utils/commands";
import { useWailsEvent } from "../../utils/hooks";
import { cn } from "../../utils/string-formatting";
import { TerminalHeader } from "./header";
import { useFocusOnSelect } from "./hooks";

const darkTerminalTheme = {
	background: "rgb(21, 21, 21)",
	foreground: "#f4f4f5",
	cursor: "#f4f4f5",
};

const lightTerminalTheme = {
	background: "rgb(255,255,255)",
	foreground: "rgb(21, 21, 21)",
	cursor: "rgb(21, 21, 21)",
};

export function TerminalComponent({ nodeKey }: { nodeKey: string }) {
	const terminalRef = useRef<HTMLDivElement | null>(null);
	const [editor] = useLexicalComposerContext();
	const term = useRef<Terminal | null>(null);
	const fitAddon = useRef<FitAddon | null>(null);
	const isDarkModeOn = useAtomValue(darkModeAtom);
	const [isSelected, setIsSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const [isFullscreen, setIsFullscreen] = useState(false);
	useFocusOnSelect(isSelected, terminalRef);

	useWailsEvent(`terminal:output-${nodeKey}`, (body) => {
		const data = body.data as { type: string; value: string }[];
		if (term.current) {
			term.current.write(data[0].value);
		}
	});

	useEffect(() => {
		return mergeRegister(
			editor.registerCommand<MouseEvent>(
				CLICK_COMMAND,
				(e) => {
					e.stopPropagation();
					return onClickDecoratorNodeCommand(
						e,
						terminalRef.current,
						setIsSelected,
						clearSelection,
					);
				},
				COMMAND_PRIORITY_NORMAL,
			),
		);
	}, []);

	useEffect(() => {
		if (term.current) {
			term.current.options.theme = isDarkModeOn
				? darkTerminalTheme
				: lightTerminalTheme;
		}
	}, [isDarkModeOn]);

	useEffect(() => {
		Events.Emit({
			name: "terminal:create",
			data: nodeKey,
		});
	}, []);

	useEffect(() => {
		// Initialize the terminal
		term.current = new Terminal({
			cursorBlink: true,
			cols: 80,
			rows: 24,
			fontFamily: '"Jetbrains Mono", monospace',
			fontSize: 13,
			cursorStyle: "block",
			theme: isDarkModeOn ? darkTerminalTheme : lightTerminalTheme,
		});

		// Add the fit addon.
		fitAddon.current = new FitAddon();
		term.current.loadAddon(fitAddon.current);

		if (!terminalRef.current) {
			return;
		}
		// Open the terminal in the terminalRef div
		term.current.open(terminalRef.current);

		// Selects the terminal when it is firstly created using slash command
		if (isSelected) {
			term.current.focus();
		}
		// Fit the terminal to the container size
		fitAddon.current.fit();

		// Handle data from xterm and send it to backend
		term.current.onData((data) => {
			setIsSelected(true);
			Events.Emit({
				name: `terminal:input-${nodeKey}`,
				data,
			});
		});

		// Handle terminal resize
		function handleResize() {
			if (!fitAddon.current) return;
			fitAddon.current.fit();
		}

		window.addEventListener("resize", handleResize);

		// Cleanup on component unmount
		return () => {
			window.removeEventListener("resize", handleResize);
			if (fitAddon.current) fitAddon.current.dispose();
			if (term.current) term.current.dispose();
		};
	}, [terminalRef, setIsSelected]);

	return (
		<div
			className={cn(
				"w-full h-72 border-2 border-[rgb(229,231,235)] dark:border-[rgb(37,37,37)] rounded-md overflow-hidden bg-white dark:bg-zinc-900 font-code",
				isSelected && " border-blue-400 dark:border-blue-500",
				isFullscreen &&
					"fixed top-0 left-0 right-0 bottom-0 z-20 h-screen border-0",
			)}
			onClick={(e) => e.stopPropagation()}
			ref={terminalRef}
		>
			<TerminalHeader
				isFullscreen={isFullscreen}
				setIsFullscreen={setIsFullscreen}
				nodeKey={nodeKey}
				editor={editor}
			/>
		</div>
	);
}
