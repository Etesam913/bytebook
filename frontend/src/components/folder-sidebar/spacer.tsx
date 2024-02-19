import { type MotionValue } from "framer-motion";
import { useCallback, useState } from "react";
import { dragSpacer, throttle } from "../../utils/draggable";
import { cn } from "../../utils/tailwind";

export function Spacer({
	sidebarWidth,
	leftWidth = 0,
}: {
	sidebarWidth: MotionValue<number>;
	leftWidth?: number;
}) {
	const [isDragged, setIsDragged] = useState(false);

	const throttledMotionValueSet = useCallback(
		throttle((e: MouseEvent) => {
			sidebarWidth.set(Math.min(Math.max(170, e.clientX - leftWidth), 325));
		}, 100),
		[leftWidth],
	);

	return (
		<div
			onMouseDown={() => {
				setIsDragged(true);
				dragSpacer(
					(e) => throttledMotionValueSet(e),
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
