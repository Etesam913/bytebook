import { AnimatePresence } from "framer-motion";
import type { LexicalEditor } from "lexical";
import { TriangleWarning } from "../../icons/triangle-warning";
import { cn } from "../../utils/string-formatting";
import { NoteComponentControls } from "../note-component-container/component-controls";

export function FileError({
	src,
	nodeKey,
	isSelected,
	editor,
}: {
	src: string;
	nodeKey: string;
	isSelected: boolean;
	editor: LexicalEditor;
}) {
	return (
		<div
			data-nodeKey={nodeKey}
			data-interactable="true"
			className={cn(
				"max-w-80 relative flex flex-col items-center gap-1 text-center dark:text-zinc-300 dark:bg-zinc-700 rounded-md px-2 py-1.5 outline outline-2 outline-zinc-650",
				isSelected && "  outline-blue-500",
			)}
		>
			<AnimatePresence>
				{isSelected && (
					<NoteComponentControls
						buttonOptions={{
							trash: {
								enabled: true,
							},
						}}
						nodeKey={nodeKey}
						editor={editor}
					/>
				)}
			</AnimatePresence>
			<TriangleWarning
				width={24}
				height={24}
				className="pointer-events-none mb-1"
			/>
			<h3 className="text-sm pointer-events-none">
				File errored out while loading
			</h3>
			<p className="text-xs pointer-events-none">{src}</p>
		</div>
	);
}
