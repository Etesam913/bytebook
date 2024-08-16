import { Excalidraw, MainMenu, THEME } from "@excalidraw/excalidraw";
import type {
	ExcalidrawElement,
	NonDeletedExcalidrawElement,
} from "@excalidraw/excalidraw/types/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { CLICK_COMMAND, COMMAND_PRIORITY_NORMAL } from "lexical";
import { type MutableRefObject, useEffect, useRef, useState } from "react";
import { getDefaultButtonVariants } from "../../animations";
import { darkModeAtom } from "../../atoms";
import { XMark } from "../../icons/circle-xmark";
import { onClickDecoratorNodeCommand } from "../../utils/commands";
import { debounce } from "../../utils/draggable";
import { cn } from "../../utils/string-formatting";
import { NoteComponentControls } from "../note-component-container/component-controls";
import { useFocusOnSelect } from "./hooks";

function writeElementsToNodeWrapper(
	excalidrawAPIRef: MutableRefObject<ExcalidrawImperativeAPI | null>,
	writeElementsToNode: (elements: NonDeletedExcalidrawElement[]) => void,
) {
	return debounce(() => {
		if (excalidrawAPIRef.current) {
			const elements = excalidrawAPIRef.current.getSceneElements();
			writeElementsToNode(elements as NonDeletedExcalidrawElement[]);
		}
	}, 300);
}

export function ExcalidrawComponent({
	nodeKey,
	defaultElements,
	writeElementsToNode,
}: {
	nodeKey: string;
	defaultElements: ExcalidrawElement[];
	writeElementsToNode: (elements: NonDeletedExcalidrawElement[]) => void;
}) {
	const [editor] = useLexicalComposerContext();
	const excalidrawRef = useRef<HTMLDivElement>(null);
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const isDarkModeOn = useAtomValue(darkModeAtom);
	useFocusOnSelect(isSelected, excalidrawRef.current);
	const [isExpanded, setIsExpanded] = useState(false);
	const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

	useEffect(() => {
		return mergeRegister(
			editor.registerCommand<MouseEvent>(
				CLICK_COMMAND,
				(e) => {
					e.stopPropagation();
					return onClickDecoratorNodeCommand(
						e,
						excalidrawRef.current,
						setSelected,
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
				"relative w-full border-[4px] border-zinc-100 dark:border-zinc-900 transition-colors",
				isSelected && !isExpanded && "border-blue-400 dark:border-blue-500",
				isExpanded &&
					"max-h-screen fixed top-0 left-0 right-0 bottom-0 z-30 m-auto justify-start overflow-auto",
			)}
			ref={excalidrawRef}
			onMouseDown={(e) => {
				e.stopPropagation();
			}}
			onKeyDown={(e) => e.stopPropagation()}
		>
			{isExpanded && (
				<motion.button
					{...getDefaultButtonVariants()}
					onClick={() => setIsExpanded(false)}
					className="absolute z-50 right-5 top-4 bg-[rgba(0,0,0,0.55)] text-white p-1 rounded-full"
					type="submit"
				>
					<XMark width="1.5rem" height="1.5rem" />
				</motion.button>
			)}

			<AnimatePresence>
				{isSelected && !isExpanded && (
					<NoteComponentControls
						buttonOptions={{
							trash: {
								enabled: true,
								nodeKey,
							},
							fullscreen: {
								enabled: true,
								setIsExpanded,
							},
						}}
						nodeKey={nodeKey}
						editor={editor}
					/>
				)}
			</AnimatePresence>
			<div
				onMouseUp={() =>
					writeElementsToNodeWrapper(excalidrawAPIRef, writeElementsToNode)()
				}
				onKeyUp={() =>
					writeElementsToNodeWrapper(excalidrawAPIRef, writeElementsToNode)()
				}
			>
				<Excalidraw
					initialData={{ elements: defaultElements }}
					theme={isDarkModeOn ? THEME.DARK : THEME.LIGHT}
					excalidrawAPI={(api) => {
						excalidrawAPIRef.current = api;
					}}
				>
					<MainMenu />
				</Excalidraw>
			</div>
		</div>
	);
}
