import { type MotionValue } from "framer-motion";
import { useState } from "react";
import { dragSpacer } from "../../utils/draggable";
import { cn } from "../../utils/string-formatting";

export function Spacer({
	width,
	leftWidth,
	spacerConstant = 8,
}: {
	width: MotionValue<number>;
	leftWidth?: MotionValue<number>;
	spacerConstant?: number;
}) {
	const [isDragged, setIsDragged] = useState(false);

	// const throttledMotionValueSet = useCallback(
	// 	throttle((e: MouseEvent) => {
	// 		console.log(
	// 			e.clientX - (leftWidth ? leftWidth.get() : 0),
	// 			Math.min(
	// 				Math.max(170, e.clientX - (leftWidth ? leftWidth.get() : 0)),
	// 				325,
	// 			),
	// 		);
	// 		sidebarWidth.set(
	// 			Math.min(
	// 				Math.max(170, e.clientX - (leftWidth ? leftWidth.get() : 0)),
	// 				325,
	// 			),
	// 		);
	// 	}, 100),
	// 	[],
	// );

	return (
		<div
			onMouseDown={() => {
				setIsDragged(true);
				dragSpacer(
					(e) =>
						width.set(
							Math.min(
								Math.max(
									170,
									e.clientX -
										(leftWidth ? leftWidth.get() + spacerConstant : 0),
								),
								325,
							),
						),
					() => {
						setIsDragged(false);
					},
				);
			}}
			className={cn(
				"w-[6px] cursor-ew-resize border-l-[1px]",
				isDragged
					? "border-l-blue-500 dark:border-l-blue-600"
					: "border-l-zinc-200 dark:border-l-zinc-700 hover:border-l-blue-500 hover:dark:border-l-blue-600",
			)}
		/>
	);
}
