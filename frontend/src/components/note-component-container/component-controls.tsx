import { motion } from "framer-motion";
import type { LexicalEditor } from "lexical";
import type { Dispatch, SetStateAction } from "react";
import { getDefaultButtonVariants } from "../../animations";
import { Fullscreen } from "../../icons/fullscreen";
import { Trash } from "../../icons/trash";
import { removeDecoratorNode } from "../../utils/commands";

export function NoteComponentControls({
	buttonOptions,
	editor,
}: {
	buttonOptions: {
		trash?: {
			enabled: boolean;
			nodeKey: string;
		};
		fullscreen?: {
			enabled: boolean;
			setIsExpanded: Dispatch<SetStateAction<boolean>>;
		};
	};
	nodeKey: string;
	editor: LexicalEditor;
}) {
	return (
		<motion.div
			className="absolute left-[50%] bg-zinc-50 dark:bg-zinc-700 p-2 rounded-md shadow-lg border-[1px] border-zinc-300 dark:border-zinc-600 flex items-center justify-center gap-3 z-20"
			initial={{ opacity: 0, y: -20, x: "-50%" }}
			animate={{ opacity: 1, y: -30 }}
			exit={{ opacity: 0, y: -20 }}
		>
			{buttonOptions.trash?.enabled && (
				<motion.button
					{...getDefaultButtonVariants(false, 1.115, 0.95, 1.115)}
					type="button"
					className=""
					onClick={() => {
						const nodeKey = buttonOptions.trash?.nodeKey;
						if (!nodeKey) {
							throw new Error("Node key is not provided for the trash button");
						}
						editor.update(() => {
							removeDecoratorNode(nodeKey);
						});
					}}
				>
					<Trash />
				</motion.button>
			)}

			{buttonOptions.fullscreen?.enabled && (
				<motion.button
					{...getDefaultButtonVariants(false, 1.115, 0.95, 1.115)}
					type="button"
					onClick={() => {
						buttonOptions.fullscreen?.setIsExpanded(true);
					}}
				>
					<Fullscreen />
				</motion.button>
			)}
		</motion.div>
	);
}
