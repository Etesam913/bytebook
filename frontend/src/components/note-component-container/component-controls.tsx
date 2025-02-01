import { type Target, type TargetAndTransition, motion } from "framer-motion";
import type { LexicalEditor } from "lexical";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { getDefaultButtonVariants } from "../../animations";
import { Fullscreen } from "../../icons/fullscreen";
import { Trash } from "../../icons/trash";
import { removeDecoratorNode } from "../../utils/commands";

export function NoteComponentControls({
	buttonOptions,
	editor,
	nodeKey,
	children,
	initial = { opacity: 0, y: -20, x: "-50%" },
	animate = { opacity: 1, y: -30 },
	exit = { opacity: 0, y: -20 },
}: {
	buttonOptions?: {
		trash?: {
			enabled: boolean;
			callback?: () => void;
		};
		fullscreen?: {
			enabled: boolean;
			setIsExpanded: Dispatch<SetStateAction<boolean>>;
			callback?: () => void;
		};
	};
	nodeKey: string;
	editor: LexicalEditor;
	initial?: Target;
	animate?: TargetAndTransition;
	exit?: Target;
	children?: ReactNode;
}) {
	return (
		<motion.div
			className="absolute left-1/2 top-0 bg-zinc-50 dark:bg-zinc-700 p-2 rounded-md shadow-lg border-[1px] border-zinc-300 dark:border-zinc-600 flex items-center justify-center gap-3 z-20"
			initial={initial}
			animate={animate}
			exit={exit}
		>
			{buttonOptions?.trash?.enabled && (
				<motion.button
					{...getDefaultButtonVariants(false, 1.115, 0.95, 1.115)}
					type="button"
					onClick={() => {
						if (!nodeKey) {
							throw new Error("Node key is not provided for the trash button");
						}
						editor.update(() => {
							removeDecoratorNode(nodeKey);
						});
						buttonOptions.trash?.callback?.();
					}}
				>
					<Trash className="will-change-transform" />
				</motion.button>
			)}

			{buttonOptions?.fullscreen?.enabled && (
				<motion.button
					{...getDefaultButtonVariants(false, 1.115, 0.95, 1.115)}
					type="button"
					onClick={() => {
						buttonOptions.fullscreen?.setIsExpanded(true);
						buttonOptions.fullscreen?.callback?.();
					}}
				>
					<Fullscreen className="will-change-transform" />
				</motion.button>
			)}
			{children}
		</motion.div>
	);
}
