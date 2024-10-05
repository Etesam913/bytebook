import { type MotionValue, motion } from "framer-motion";
import { useAtomValue, useSetAtom } from "jotai";
import type { Dispatch, MouseEvent, SetStateAction } from "react";
import { draggedElementAtom, noteContainerRefAtom } from "../../atoms";
import type { ResizeWidth } from "../../types";
import { dragItem } from "../../utils/draggable";

const RIGHT_BOUNDARY = 45;

interface ResizeHandleProps {
	element: HTMLElement | null;
	resizeWidthMotionValue: MotionValue<number | "100%">;
	resizeHeightMotionValue: MotionValue<number | "100%">;
	widthMotionValue: MotionValue<number | "100%">;
	writeWidthToNode: (width: ResizeWidth) => void;
	setIsResizing: Dispatch<SetStateAction<boolean>>;
	setSelected: (arg0: boolean) => void;
}

export function ResizeHandle({
	element,
	resizeWidthMotionValue,
	resizeHeightMotionValue,
	widthMotionValue,
	writeWidthToNode,
	setIsResizing,
	setSelected,
}: ResizeHandleProps) {
	const noteContainerRef = useAtomValue(noteContainerRefAtom);
	const setDraggedElement = useSetAtom(draggedElementAtom);
	// The component has no background-color as there is a copy of this in the parent component that follows the resize outline
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0, transition: { duration: 0.25 } }}
			className={
				"w-7 h-7 bg-blue-transparent bottom-[-7px] right-[-6px] absolute cursor-nwse-resize rounded-sm z-10"
			}
			// onMouseUp={(e: MouseEvent<HTMLDivElement>) => {
			// 	e.stopPropagation();
			// 	setSelected(true);
			// }}
			// onClick={(e: MouseEvent<HTMLDivElement>) => {
			// 	e.stopPropagation();
			// 	setSelected(true);
			// }}
			onMouseDown={(mouseDownEvent: MouseEvent<HTMLDivElement>) => {
				setIsResizing(true);
				mouseDownEvent.stopPropagation();
				setDraggedElement(mouseDownEvent.target as HTMLElement);
				dragItem(
					(dragEvent) => {
						const mouseDownBox = mouseDownEvent.target as HTMLDivElement;
						const mouseDownBoxRect = mouseDownBox.getBoundingClientRect();
						const widthDiff = mouseDownBoxRect.right - dragEvent.clientX;
						const heightDiff = mouseDownBoxRect.bottom - dragEvent.clientY;

						// Early exit if element is not defined
						if (!element) {
							return;
						}

						document.body.style.cursor = "nwse-resize";

						const isWidthSmaller = widthDiff < heightDiff;

						let newWidth = 0;
						let newHeight = 0;
						const noteContainerWidth =
							(noteContainerRef?.current?.clientWidth ?? 0) - RIGHT_BOUNDARY;

						if (isWidthSmaller) {
							// Calculate new width based on width difference
							newWidth = Math.min(
								Math.max(160, Math.round(element.clientWidth - widthDiff)),
								noteContainerWidth,
							);
							newHeight = Math.round(
								newWidth * (element.clientHeight / element.clientWidth),
							);
						} else {
							// Calculate new height and adjust width to maintain aspect ratio
							newHeight = element.clientHeight - heightDiff;
							newWidth = Math.min(
								Math.max(
									160,
									Math.round(
										newHeight * (element.clientWidth / element.clientHeight),
									),
								),
								noteContainerWidth,
							);
							// Recalculate newHeight as the width could have changed to 160
							newHeight = Math.round(
								newWidth * (element.clientHeight / element.clientWidth),
							);
						}
						// Update the width through the motion value
						resizeWidthMotionValue.set(newWidth);
						resizeHeightMotionValue.set(newHeight);
					},

					() => {
						document.body.style.cursor = "";
						widthMotionValue.set(resizeWidthMotionValue.get());
						setTimeout(() => {
							writeWidthToNode(widthMotionValue.get());
						}, 100);
						// setIsResizing(false);
						setDraggedElement(null);
					},
				);
			}}
		/>
	);
}
