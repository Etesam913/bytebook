import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useAtomValue } from "jotai";
import type { LexicalEditor } from "lexical";
import { type RefObject, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { easingFunctions } from "../../../animations";
import { noteContainerRefAtom } from "../../../atoms";
import { VerticalDots } from "../../../icons/vertical-dots";
import { throttle } from "../../../utils/draggable";
import { getBlockElement, setHandlePosition } from "../utils/draggable-block";

const DRAGGABLE_BLOCK_MENU_CLASSNAME = "draggable-block-menu";

function isOnMenu(element: HTMLElement): boolean {
	return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}

function useDraggableBlock(
	noteContainerRef: RefObject<HTMLElement | null> | null,
	editor: LexicalEditor,
) {
	const [draggableBlockElem, setDraggableBlockElem] =
		useState<HTMLElement | null>(null);

	useEffect(() => {
		const noteContainerValue = noteContainerRef?.current;
		// TODO: Throttle this function

		// Throttle the handleMouseMove function
		const throttledHandleMouseMove = throttle((e: MouseEvent) => {
			if (!noteContainerValue) {
				return;
			}
			const target = e.target;

			// Handling some basic edge cases
			if (!(target instanceof HTMLElement)) {
				return;
			}

			if (isOnMenu(target)) {
				return;
			}
			const _draggableBlockElem = getBlockElement(
				e,
				editor,
				noteContainerValue,
			);
			setDraggableBlockElem(_draggableBlockElem);
		}, 100); // Adjust the delay as needed (in milliseconds)

		function handleMouseLeave() {
			setDraggableBlockElem(null);
		}

		noteContainerRef?.current?.addEventListener(
			"mousemove",
			throttledHandleMouseMove,
		);
		noteContainerRef?.current?.addEventListener("mouseleave", handleMouseLeave);

		return () => {
			noteContainerRef?.current?.removeEventListener(
				"mousemove",
				throttledHandleMouseMove,
			);
			noteContainerRef?.current?.removeEventListener(
				"mouseleave",
				handleMouseLeave,
			);
		};
	}, [noteContainerRef]);

	return draggableBlockElem;
}

export function DraggableBlockPlugin() {
	const noteContainerRef = useAtomValue(noteContainerRefAtom);
	const [editor] = useLexicalComposerContext();
	const draggableBlockElem = useDraggableBlock(noteContainerRef, editor);
	const isDraggingBlockRef = useRef<boolean>(false);
	const handleRef = useRef<HTMLDivElement>(null);
	const [isHandleShowing, setIsHandleShowing] = useState(false);
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
				draggableBlockElem,
				handleRef.current,
				noteContainerRef.current,
				setIsHandleShowing,
				yMotionValue,
			);
		}
	}, [noteContainerRef, draggableBlockElem, handleRef]);

	if (!noteContainerRef?.current) return <></>;

	return createPortal(
		<motion.div
			animate={{
				opacity: isHandleShowing ? 1 : 0,
			}}
			style={{ x: -2, y: ySpringMotionValue }}
			className="draggable-block-menu text-zinc-300"
			ref={handleRef}
		>
			<VerticalDots height="15px" width="15px" />
		</motion.div>,
		noteContainerRef.current,
	);
}
