import { AnimatePresence, motion } from "framer-motion";
import type { Dispatch, SetStateAction, SyntheticEvent } from "react";
import { CancelCode } from "../../../bindings/github.com/etesam913/bytebook/nodeservice";
import { getDefaultButtonVariants } from "../../animations";
import { Play } from "../../icons/circle-play";
import { Loader } from "../../icons/loader";
import { Input } from "../input";

export function RunCommand({
	commandWrittenToNode,
	writeCommandToNode,
	nodeKey,
	handleRunCode,
	isCodeRunning,
	setIsCodeRunning,
}: {
	commandWrittenToNode: string;
	writeCommandToNode: (language: string) => void;
	nodeKey: string;
	handleRunCode: (e?: SyntheticEvent) => void;
	isCodeRunning: boolean;
	setIsCodeRunning: Dispatch<SetStateAction<boolean>>;
}) {
	return (
		<>
			<AnimatePresence>
				{isCodeRunning && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1, transition: { delay: 0.75 } }}
						exit={{ opacity: 0 }}
						className="absolute bg-gray-50 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-60 w-full h-full z-10 flex gap-2 justify-center items-center"
					>
						<Loader height="1.15rem" width="1.15rem" />
						<button
							onClick={async () => {
								try {
									const isCancelled = await CancelCode(nodeKey);
									if (isCancelled) {
										setIsCodeRunning(false);
									}
								} catch {
									setIsCodeRunning(false);
								}
							}}
							type="button"
						>
							Cancel
						</button>
					</motion.div>
				)}
			</AnimatePresence>
			<form
				className="p-2 font-code justify-between border-[1px] border-t-0  border-[rgb(229,231,235)] dark:border-[rgb(37,37,37)] bg-white dark:bg-[rgb(21,21,21)] overflow-auto"
				onSubmit={(e) => e.preventDefault()}
			>
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
						{...getDefaultButtonVariants(isCodeRunning)}
						onClick={handleRunCode}
						disabled={isCodeRunning}
						title="Run Code"
					>
						<Play title="Run Code" height="1.05rem" width="1.05rem" />
					</motion.button>
				</div>
			</form>
		</>
	);
}
