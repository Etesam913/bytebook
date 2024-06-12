import type { MotionValue } from "framer-motion";
import { useState } from "react";
import { dragItem } from "../../utils/draggable";
import { cn } from "../../utils/string-formatting";
import { useSetAtom } from "jotai";
import { draggedElementAtom } from "../../atoms";

export function Spacer({
	width,
	leftWidth,
	spacerConstant = 8,
}: {
	width: MotionValue<number>;
	leftWidth?: MotionValue<number>;
	spacerConstant?: number;
}) {
	const setDraggedElement = useSetAtom(draggedElementAtom);
	const [isDragged, setIsDragged] = useState(false);

	return (
		<div
			onMouseDown={(e) => {
				setIsDragged(true);
				setDraggedElement(e.target as HTMLElement);
				dragItem(
					(e) => {
						width.set(
							Math.min(
								Math.max(
									190,
									e.clientX -
										(leftWidth ? leftWidth.get() + spacerConstant : 0),
								),
								325,
							),
						);
					},
					() => {
						setIsDragged(false);
						setDraggedElement(null);
					},
				);
			}}
			className={cn(
				"w-[6px] cursor-ew-resize border-l-[1px] transition-all duration-200 ease-in-out",
				isDragged
					? "border-l-blue-500 dark:border-l-blue-600 border-l-2"
					: "border-l-zinc-200 dark:border-l-zinc-700 hover:border-l-blue-500 hover:dark:border-l-blue-600",
			)}
		/>
	);
}
