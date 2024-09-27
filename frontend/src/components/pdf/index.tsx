import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { useAtomValue } from "jotai";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { AnimatePresence } from "framer-motion";
import { draggedElementAtom } from "../../atoms";
import { cn } from "../../utils/string-formatting";
import { NoteComponentControls } from "../note-component-container/component-controls";

export default function Pdf({
	src,
	alt,
	nodeKey,
}: {
	src: string;
	alt: string;
	nodeKey: string;
}) {
	const [editor] = useLexicalComposerContext();
	const draggedElement = useAtomValue(draggedElementAtom);
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);

	return (
		<div
			className="mr-2 inline-block relative pt-[100%] h-0 w-full"
			data-component="pdf"
		>
			<div
				className={cn(
					"px-1 w-full h-full absolute top-0 left-0 bg-zinc-100 dark:bg-zinc-700 rounded-md py-1 border-[3px] border-zinc-200 dark:border-zinc-600 text-xs text-zinc-500 dark:text-zinc-300 transition-colors",
					isSelected && "border-blue-400 dark:border-blue-500",
				)}
				onClick={(e) => {
					e.stopPropagation();
					if (!e.shiftKey) {
						clearSelection();
					}
					setSelected(true);
				}}
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
				<div className="px-1 pb-1">{alt}</div>
				<iframe
					title={alt}
					className={cn(
						"w-full h-[calc(100%-1.4rem)] rounded-md dark:invert",
						draggedElement && "pointer-events-none",
					)}
					src={src}
				/>
			</div>
		</div>
	);
}
