import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { type MotionValue, motion } from "framer-motion";
import type { MouseEvent } from "react";
import { getDefaultButtonVariants } from "../../animations";
import { XResize } from "../../icons/arrows-expand-x";
import type { ResizeState, ResizeWidth } from "../../types";
import { NoteComponentControls } from "../note-component-container/component-controls";

export function ResizeControls({
	nodeKey,
	motionValues,
	writeWidthToNode,
	resizeState,
}: {
	nodeKey: string;
	motionValues: {
		widthMotionValue: MotionValue<number | "100%">;
		resizeHeightMotionValue: MotionValue<number | "100%">;
		resizeWidthMotionValue: MotionValue<number | "100%">;
	};
	writeWidthToNode: (width: ResizeWidth) => void;
	resizeState: ResizeState;
}) {
	const [editor] = useLexicalComposerContext();

	const { widthMotionValue, resizeWidthMotionValue, resizeHeightMotionValue } =
		motionValues;

	const { setIsExpanded } = resizeState;

	return (
		<NoteComponentControls
			nodeKey={nodeKey}
			editor={editor}
			buttonOptions={{
				trash: {
					enabled: true,
				},
				fullscreen: {
					enabled: true,
					setIsExpanded,
				},
			}}
		>
			<motion.button
				{...getDefaultButtonVariants(false, 1.115, 0.95, 1.115)}
				type="button"
				onClick={(e: MouseEvent<HTMLButtonElement>) => {
					widthMotionValue.set("100%");
					resizeWidthMotionValue.set("100%");
					resizeHeightMotionValue.set("100%");
					writeWidthToNode("100%");
					e.stopPropagation();
				}}
			>
				<XResize className="will-change-transform" />
			</motion.button>
		</NoteComponentControls>
	);
}
