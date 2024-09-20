import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";

import type { FitAddon } from "@xterm/addon-fit";
import type { Terminal } from "@xterm/xterm";
import { useAtomValue } from "jotai";
import { CLICK_COMMAND, COMMAND_PRIORITY_NORMAL } from "lexical";
import { useEffect, useRef, useState } from "react";
import { darkModeAtom } from "../../atoms";
import { onClickDecoratorNodeCommand } from "../../utils/commands";
import { cn } from "../../utils/string-formatting";
import { TerminalHeader } from "./header";
import {
	useFocusOnSelect,
	useTerminalCreateEventForBackend,
	useTerminalCreateFrontend,
	useTerminalTheme,
	useTerminalWrite,
} from "./hooks";
import { handleResize } from "./utils";

export function TerminalComponent({ nodeKey }: { nodeKey: string }) {
	const terminalRef = useRef<HTMLDivElement | null>(null);
	const [editor] = useLexicalComposerContext();
	const xtermRef = useRef<Terminal | null>(null);
	const xtermFitAddonRef = useRef<FitAddon | null>(null);
	const terminalContainerRef = useRef<HTMLDivElement | null>(null);
	const isDarkModeOn = useAtomValue(darkModeAtom);
	const [isSelected, setIsSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const [isFullscreen, setIsFullscreen] = useState(false);

	useFocusOnSelect(isSelected, terminalRef);
	useTerminalCreateFrontend(
		xtermRef,
		xtermFitAddonRef,
		terminalRef,
		setIsSelected,
		isDarkModeOn,
		isSelected,
		nodeKey,
	);
	useTerminalTheme(isDarkModeOn, xtermRef);
	useTerminalWrite(nodeKey, xtermRef);
	useTerminalCreateEventForBackend(nodeKey);

	useEffect(() => {
		return mergeRegister(
			editor.registerCommand<MouseEvent>(
				CLICK_COMMAND,
				(e) => {
					e.stopPropagation();
					return onClickDecoratorNodeCommand(
						e,
						terminalContainerRef.current,
						setIsSelected,
						clearSelection,
					);
				},
				COMMAND_PRIORITY_NORMAL,
			),
		);
	}, []);

	return (
		<div
			className={cn(
				"w-full flex flex-col border-2 border-[rgb(229,231,235)] dark:border-[rgb(37,37,37)] rounded-md overflow-hidden bg-white dark:bg-zinc-900 font-code",
				isSelected && " border-blue-400 dark:border-blue-500",
				isFullscreen &&
					"fixed top-0 left-0 right-0 bottom-0 z-20 h-screen border-0",
			)}
			ref={terminalContainerRef}
			// onClick={(e) => e.stopPropagation()}
		>
			<TerminalHeader
				isFullscreen={isFullscreen}
				setIsFullscreen={setIsFullscreen}
				nodeKey={nodeKey}
				editor={editor}
				onFullscreenChange={() => {
					handleResize(xtermFitAddonRef, xtermRef, nodeKey);
				}}
			/>
			<div
				ref={terminalRef}
				className={cn("h-80", isFullscreen && "h-screen")}
			/>
		</div>
	);
}
