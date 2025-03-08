import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { AnimatePresence } from "framer-motion";
import { Paperclip } from "../../icons/paperclip-2";
import { TriangleWarning } from "../../icons/triangle-warning";
import { cn } from "../../utils/string-formatting";
import { NoteComponentControls } from "../note-component-container/component-controls";

export function FileError({
	src,
	nodeKey,
	type,
}: {
	src: string;
	nodeKey: string;
	type: "loading-fail" | "unknown-attachment";
}) {
	const [editor] = useLexicalComposerContext();
	const [isSelected] = useLexicalNodeSelection(nodeKey);

	return (
		<div
			data-node-key={nodeKey}
			data-interactable="true"
			className={cn(
				"max-w-80 relative inline-flex flex-col items-start gap-1 text-center bg-zinc-50 text-zinc-600 dark:text-zinc-300 dark:bg-zinc-700 rounded-md px-2.5 py-1.5 mx-1.5 outline outline-2 outline-zinc-200 dark:outline-zinc-650",
				isSelected && "outline-(--accent-color)!",
			)}
		>
			<AnimatePresence>
				{isSelected && (
					<NoteComponentControls
						buttonOptions={{
							trash: {
								enabled: true,
							},
							link: {
								enabled: true,
								src: src,
							},
						}}
						nodeKey={nodeKey}
						editor={editor}
					/>
				)}
			</AnimatePresence>
			{type === "loading-fail" && (
				<div className="flex items-center gap-1 pointer-events-none">
					<TriangleWarning
						width={20}
						height={20}
						className="pointer-events-none"
					/>
					<h3 className="text-sm pointer-events-none">
						File errored out while loading
					</h3>
				</div>
			)}
			{type === "unknown-attachment" && (
				<div className="flex items-center gap-1">
					<Paperclip width={20} height={20} className="pointer-events-none" />
					<h3 className="text-sm pointer-events-none">Unknown attachment</h3>
				</div>
			)}
			<p className="text-xs pointer-events-none">src: {src}</p>
		</div>
	);
}
