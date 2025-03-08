import { type MotionValue, motion } from "framer-motion";

import { getDefaultButtonVariants } from "../../animations";
import { Play } from "../../icons/circle-play";

import type { FitAddon } from "@xterm/addon-fit";
import type { Terminal } from "@xterm/xterm";
import type { RefObject } from "react";
import { RunCodeInTerminal } from "../../../bindings/github.com/etesam913/bytebook/services/terminalservice";
import { dragItem } from "../../utils/draggable";
import { Input } from "../input";
import { handleResize } from "../terminal/utils";

export function RunCommand({
	commandWrittenToNode,
	writeCommandToNode,
	nodeKey,
	terminalHeight,
	xTermRef,
	xTermFitAddonRef,
}: {
	commandWrittenToNode: string;
	writeCommandToNode: (language: string) => void;
	terminalHeight: MotionValue<number>;
	nodeKey: string;
	xTermRef: RefObject<Terminal | null>;
	xTermFitAddonRef: RefObject<FitAddon | null>;
}) {
	return (
		<form
			className="px-2 pb-2 font-code justify-between border-b border-[rgb(229,231,235)] dark:border-[rgb(37,37,37)] bg-white dark:bg-[rgb(21,21,21)] overflow-auto text-zinc-950 dark:text-zinc-100"
			onSubmit={(e) => {
				e.preventDefault();
				RunCodeInTerminal(nodeKey, commandWrittenToNode);
			}}
		>
			<div
				className="h-2 cursor-row-resize"
				onMouseDown={(mouseEvent) => {
					const initialHeight = terminalHeight.get();
					dragItem(
						(dragEvent) => {
							const changeInHeight = mouseEvent.clientY - dragEvent.clientY;
							terminalHeight.set(
								Math.max(Math.min(initialHeight + changeInHeight, 352), 168),
							);
						},
						() => {
							if (xTermRef.current && xTermFitAddonRef.current) {
								handleResize(
									xTermRef.current,
									xTermFitAddonRef.current,
									nodeKey,
								);
							}
						},
					);
				}}
			/>

			<div className="flex gap-2 justify-start items-end">
				<div className="flex gap-1 flex-wrap items-center flex-1">
					<Input
						label="Run Command:"
						labelProps={{
							className: "text-xs cursor-pointer pb-0",
							htmlFor: `${nodeKey}-run-command`,
						}}
						inputProps={{
							spellCheck: false,
							className:
								"py-1 px-2 rounded-md bg-zinc-50 dark:bg-zinc-800 outline-zinc-200 dark:outline-zinc-750 flex-1",
							id: `${nodeKey}-run-command`,
							defaultValue: commandWrittenToNode,
							onChange: (e) => {
								const input = e.target as HTMLInputElement;
								writeCommandToNode(input.value);
							},
							onKeyDown: (e) => {
								e.stopPropagation();
							},
						}}
					/>
				</div>
				<motion.button
					className="border-2 border-zinc-200 dark:border-zinc-750 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 p-[0.185rem] rounded-md"
					{...getDefaultButtonVariants()}
					// disabled={isCodeRunning}
					title="Run Code"
					type="submit"
				>
					<Play title="Run Code" height="1.05rem" width="1.05rem" />
				</motion.button>
			</div>
		</form>
	);
}
