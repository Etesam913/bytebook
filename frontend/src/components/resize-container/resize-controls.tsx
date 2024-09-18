import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { type MotionValue, motion } from "framer-motion";
import type { MutableRefObject, RefObject } from "react";
import { getDefaultButtonVariants } from "../../animations";
import { XResize } from "../../icons/arrows-expand-x";
import { Fullscreen } from "../../icons/fullscreen";
import { Trash } from "../../icons/trash";
import type { ResizeState, ResizeWidth } from "../../types";
import { removeDecoratorNode } from "../../utils/commands";

export function ResizeControls({
	nodeKey,
	motionValues,
	writeWidthToNode,
	resizeState,
	resizeContainerRef,
	resizeDimensionsRef,
	element,
}: {
	nodeKey: string;
	motionValues: {
		widthMotionValue: MotionValue<number | "100%">;
		resizeHeightMotionValue: MotionValue<number | "100%">;
		resizeWidthMotionValue: MotionValue<number | "100%">;
	};
	writeWidthToNode: (width: ResizeWidth) => void;
	resizeState: ResizeState;
	resizeContainerRef: RefObject<HTMLDivElement>;
	resizeDimensionsRef: MutableRefObject<{ height: number; width: number }>;
	element: HTMLElement | null;
}) {
	const [editor] = useLexicalComposerContext();

	const { widthMotionValue, resizeWidthMotionValue, resizeHeightMotionValue } =
		motionValues;

	const { setIsExpanded } = resizeState;

	return (
		<motion.div
			className="absolute left-[50%] bg-zinc-50 dark:bg-zinc-700 p-2 rounded-md shadow-lg border-[1px] border-zinc-300 dark:border-zinc-600 flex items-center justify-center gap-3 z-20"
			initial={{ opacity: 0, y: -20, x: "-50%" }}
			animate={{ opacity: 1, y: -30 }}
			exit={{ opacity: 0, y: -20 }}
		>
			<motion.button
				{...getDefaultButtonVariants(false, 1.115, 0.95, 1.115)}
				type="button"
				onClick={() =>
					editor.update(() => {
						removeDecoratorNode(nodeKey);
					})
				}
			>
				<Trash className="will-change-transform" />
			</motion.button>
			<motion.button
				{...getDefaultButtonVariants(false, 1.115, 0.95, 1.115)}
				type="button"
				onClick={() => {
					widthMotionValue.set("100%");
					resizeWidthMotionValue.set("100%");
					resizeHeightMotionValue.set("100%");
					writeWidthToNode("100%");
				}}
			>
				<XResize className="will-change-transform" />
			</motion.button>
			<motion.button
				{...getDefaultButtonVariants(false, 1.115, 0.95, 1.115)}
				type="button"
				onClick={() => {
					setIsExpanded(true);
					resizeContainerRef.current?.focus();
					resizeDimensionsRef.current = {
						height: element?.clientHeight ?? 0,
						width: element?.clientWidth ?? 0,
					};
				}}
			>
				<Fullscreen className="will-change-transform" />
			</motion.button>
		</motion.div>
	);
}
