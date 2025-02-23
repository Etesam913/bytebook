import { motion } from "framer-motion";
import { useAtom, useSetAtom } from "jotai/react";
import { type RefObject, useEffect, useRef, useState } from "react";
import {
	contextMenuDataAtom,
	contextMenuRefAtom,
	selectionRangeAtom,
} from "../../atoms";
import { DropdownItems } from "../dropdown/dropdown-items";

function adjustedPosition(
	x: number,
	y: number,
	contextMenuRefLocal: RefObject<HTMLDivElement>,
) {
	if (!contextMenuRefLocal.current) return { x, y };

	const menuRect = contextMenuRefLocal.current.getBoundingClientRect();
	const windowHeight = window.innerHeight;
	const windowWidth = window.innerWidth;
	let adjustedY = y;
	let adjustedX = x;
	const heightBuffer = 14;
	const widthBuffer = 8;
	// menu height has to be hardcoded because the dropdown items animate the height property
	const menuHeight = 114;
	if (y + menuHeight + heightBuffer > windowHeight) {
		adjustedY = windowHeight - menuHeight - heightBuffer;
	}

	if (x + menuRect.width + widthBuffer > windowWidth) {
		adjustedX = windowWidth - menuRect.width;
	}

	return { x: adjustedX, y: adjustedY };
}
export function ContextMenu() {
	const [{ isShowing, items, x, y }, setContextMenuData] =
		useAtom(contextMenuDataAtom);

	const [focusedIndex, setFocusedIndex] = useState(0);
	const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
	const setContextMenuRef = useSetAtom(contextMenuRefAtom);
	const contextMenuRefLocal = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setContextMenuRef(contextMenuRefLocal);
	}, [contextMenuRefLocal]);

	const { x: adjustedX, y: adjustedY } = adjustedPosition(
		x,
		y,
		contextMenuRefLocal,
	);

	return (
		<>
			{isShowing && (
				<div
					className="absolute z-50"
					style={{ transform: `translate(${adjustedX}px, ${adjustedY}px)` }}
				>
					{selectionRange.size > 0 && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1, transition: { delay: 0.075 } }}
							className="absolute rounded-full font-bold w-5 h-5 text-xs pointer-events-none text-white flex justify-center items-center p-0.5 -left-2 bg-red-500 z-[60]"
						>
							{selectionRange.size}
						</motion.div>
					)}
					<DropdownItems
						onChange={async (item) => {
							if (item.onChange) {
								item.onChange();
							}
							setSelectionRange(new Set());
						}}
						ref={contextMenuRefLocal}
						className="w-fit text-sm overflow-y-hidden"
						items={items}
						isOpen={isShowing}
						setIsOpen={(value: boolean) =>
							setContextMenuData((prev) => ({ ...prev, isShowing: value }))
						}
						setFocusIndex={setFocusedIndex}
						focusIndex={focusedIndex}
					/>
				</div>
			)}
		</>
	);
}
