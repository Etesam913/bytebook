import { motion } from "framer-motion";
import type { LexicalEditor } from "lexical";
import type { Dispatch, SetStateAction } from "react";
import { getDefaultButtonVariants } from "../../animations";
import { ExitFullscreen } from "../../icons/arrows-reduce-diagonal";
import { Fullscreen } from "../../icons/fullscreen";
import { Trash } from "../../icons/trash";
import { removeDecoratorNode } from "../../utils/commands";
import { cn } from "../../utils/string-formatting";

export function TerminalHeader({
	isFullscreen,
	setIsFullscreen,
	nodeKey,
	editor,
	onFullscreenChange,
}: {
	isFullscreen: boolean;
	setIsFullscreen: Dispatch<SetStateAction<boolean>>;
	nodeKey: string;
	editor: LexicalEditor;
	onFullscreenChange: () => void;
}) {
	return (
		<header
			className={cn(
				"py-2.5 px-3 text-sm border-b border-zinc-200 dark:border-zinc-600 flex items-center justify-between",
				isFullscreen && "py-[1.1rem]",
			)}
		>
			<span
				className={cn(
					"text-blue-500 dark:text-blue-400 pointer-events-none",
					isFullscreen && "ml-20",
				)}
			>
				terminal
			</span>
			<span className="flex items-center gap-3">
				<motion.button
					{...getDefaultButtonVariants()}
					onClick={() =>
						editor.update(() => {
							removeDecoratorNode(nodeKey);
						})
					}
				>
					<Trash className="will-change-transform" />
				</motion.button>

				<motion.button
					{...getDefaultButtonVariants()}
					onClick={() => {
						setIsFullscreen((prev) => !prev);

						setTimeout(() => {
							onFullscreenChange();
						}, 100);
					}}
				>
					{isFullscreen ? (
						<ExitFullscreen className="will-change-transform" />
					) : (
						<Fullscreen className="will-change-transform" />
					)}
				</motion.button>
			</span>
		</header>
	);
}
