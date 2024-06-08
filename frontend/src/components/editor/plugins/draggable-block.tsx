import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { noteContainerRefAtom } from "../../../atoms";
import { VerticalDots } from "../../../icons/vertical-dots";

import { useDraggableBlock } from "../hooks";
import { setHandlePosition } from "../utils/draggable-block";

export function DraggableBlockPlugin() {
	const noteContainerRef = useAtomValue(noteContainerRefAtom);
	const [editor] = useLexicalComposerContext();
	const { draggableBlockElement } = useDraggableBlock(noteContainerRef, editor);
	const [isDragHandleShowing, setIsDragHandleShowing] = useState(false);
	const isDraggingBlockRef = useRef<boolean>(false);
	const handleRef = useRef<HTMLDivElement>(null);
	const yMotionValue = useMotionValue(0);
	const ySpringMotionValue = useSpring(yMotionValue, {
		damping: 12,
		stiffness: 120,
		mass: 0.05,
		restDelta: 0.5,
		restSpeed: 0.5,
	});
	useEffect(() => {
		if (handleRef.current && noteContainerRef?.current) {
			setHandlePosition(
				draggableBlockElement,
				handleRef.current,
				noteContainerRef.current,
				setIsDragHandleShowing,
				yMotionValue,
			);
		}
	}, [noteContainerRef, draggableBlockElement, handleRef]);

	if (!noteContainerRef?.current) return <></>;

	return createPortal(
		<motion.div
			animate={{
				opacity: isDragHandleShowing ? 1 : 0,
			}}
			style={{ x: -2, y: ySpringMotionValue }}
			className="draggable-block-menu text-zinc-500 dark:text-zinc-300"
			ref={handleRef}
		>
			<VerticalDots height="15px" width="15px" />
		</motion.div>,
		noteContainerRef.current,
	);
}
