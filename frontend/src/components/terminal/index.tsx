import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import type { FitAddon } from "@xterm/addon-fit";
import type { Terminal } from "@xterm/xterm";
import { useAtomValue } from "jotai";
import { useRef, useState } from "react";
import type { CodeResponse } from "../../../bindings/github.com/etesam913/bytebook";
import { darkModeAtom } from "../../atoms";
import type { CodeBlockData } from "../../types";
import { cn } from "../../utils/string-formatting";
import { RunCommand } from "../code/run-command";
import { TerminalHeader } from "./header";
import {
	useFocusOnSelect,
	useTerminalCreateEventForBackend,
	useTerminalCreateFrontend,
	useTerminalResize,
	useTerminalTheme,
	useTerminalWrite,
} from "./hooks";
import { handleResize } from "./utils";
import { motion, useMotionValue } from "framer-motion";

export function TerminalComponent({
	nodeKey,
	data,
	startDirectory,
	writeDataToNode,
	shell,
	isInCodeSnippet,
	commandWrittenToNode,
	writeCommandToNode,
	onClick,
}: {
	nodeKey: string;
	data: CodeBlockData;
	startDirectory: string;
	writeDataToNode: (result: CodeResponse) => void;
	shell: string;
	isInCodeSnippet: boolean;
	commandWrittenToNode?: string;
	writeCommandToNode?: (language: string) => void;
	onClick?: () => void;
}) {
	const terminalRef = useRef<HTMLDivElement | null>(null);
	const [editor] = useLexicalComposerContext();
	const xtermRef = useRef<Terminal | null>(null);
	const xtermFitAddonRef = useRef<FitAddon | null>(null);
	const terminalContainerRef = useRef<HTMLDivElement | null>(null);
	const isDarkModeOn = useAtomValue(darkModeAtom);
	const [isSelected, setIsSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const terminalHeight = useMotionValue(168);

	useFocusOnSelect(isSelected, terminalRef, isInCodeSnippet);
	useTerminalCreateFrontend(
		xtermRef,
		xtermFitAddonRef,
		terminalRef,
		setIsSelected,
		isDarkModeOn,
		isSelected,
		nodeKey,
		data,
		isInCodeSnippet,
	);
	useTerminalResize(xtermRef, xtermFitAddonRef, nodeKey, isSelected);
	useTerminalTheme(isDarkModeOn, xtermRef);
	useTerminalWrite(nodeKey, xtermRef, data, writeDataToNode);
	useTerminalCreateEventForBackend(nodeKey, startDirectory, shell);

	return (
		<div
			className={cn(
				"w-full flex flex-col border-2 border-[rgb(229,231,235)] dark:border-[rgb(37,37,37)] overflow-hidden rounded-md bg-white dark:bg-zinc-900 font-code",
				isSelected && "border-blue-400 dark:border-blue-500",
				isFullscreen &&
					"fixed top-0 left-0 right-0 bottom-0 z-20 h-screen border-0",
				isInCodeSnippet && "rounded-none border border-t-0",
				isInCodeSnippet && isSelected && "!border-transparent",
			)}
			ref={terminalContainerRef}
			onClick={(e) => {
				e.stopPropagation();
				clearSelection();
				setIsSelected(true);
				onClick?.();
			}}
		>
			{isInCodeSnippet && commandWrittenToNode && writeCommandToNode && (
				<RunCommand
					terminalHeight={terminalHeight}
					commandWrittenToNode={commandWrittenToNode}
					writeCommandToNode={writeCommandToNode}
					nodeKey={nodeKey}
					xTermRef={xtermRef}
					xTermFitAddonRef={xtermFitAddonRef}
				/>
			)}

			<motion.div
				ref={terminalRef}
				style={{ height: terminalHeight }}
				className={cn(
					"h-80",
					isFullscreen && "h-screen",
					isInCodeSnippet && "min-h-[10.5rem] h-[10.5rem]",
				)}
			/>
		</div>
	);
}
