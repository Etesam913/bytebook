import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import type { FitAddon } from "@xterm/addon-fit";
import type { Terminal } from "@xterm/xterm";
import { useAtomValue } from "jotai";
import { CLICK_COMMAND, COMMAND_PRIORITY_NORMAL } from "lexical";
import { useEffect, useRef, useState } from "react";
import type { CodeResponse } from "../../../bindings/github.com/etesam913/bytebook";
import { darkModeAtom } from "../../atoms";
import type { CodeBlockData } from "../../types";
import { onClickDecoratorNodeCommand } from "../../utils/commands";
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
	useTerminalResize(xtermRef, xtermFitAddonRef, nodeKey);
	useTerminalTheme(isDarkModeOn, xtermRef);
	useTerminalWrite(nodeKey, xtermRef, data, writeDataToNode);
	useTerminalCreateEventForBackend(nodeKey, startDirectory, shell);

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
				isInCodeSnippet && "border-0 rounded-none",
			)}
			ref={terminalContainerRef}
			onClick={(e) => {
				e.stopPropagation();
				setIsSelected(true);
				onClick?.();
			}}
		>
			{!isInCodeSnippet && (
				<TerminalHeader
					isFullscreen={isFullscreen}
					setIsFullscreen={setIsFullscreen}
					nodeKey={nodeKey}
					editor={editor}
					onFullscreenChange={() => {
						if (!xtermRef.current || !xtermFitAddonRef.current) return;
						handleResize(xtermRef.current, xtermFitAddonRef.current, nodeKey);
					}}
				/>
			)}
			{isInCodeSnippet && commandWrittenToNode && writeCommandToNode && (
				<RunCommand
					commandWrittenToNode={commandWrittenToNode}
					writeCommandToNode={writeCommandToNode}
					nodeKey={nodeKey}
				/>
			)}

			<div
				ref={terminalRef}
				className={cn(
					"h-80",
					isFullscreen && "h-screen",
					isInCodeSnippet && "h-[15.5rem]",
				)}
			/>
		</div>
	);
}
