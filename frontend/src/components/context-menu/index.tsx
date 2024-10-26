import { useAtom, useSetAtom } from "jotai/react";
import { useEffect, useRef, useState } from "react";
import {
	contextMenuDataAtom,
	contextMenuRefAtom,
	selectionRangeAtom,
} from "../../atoms";
import { DropdownItems } from "../dropdown/dropdown-items";

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

	return (
		<div className="text-sm" ref={contextMenuRefLocal}>
			<DropdownItems
				onChange={async (item) => {
					if (item.onChange) {
						item.onChange();
					}
					setSelectionRange(new Set());
				}}
				style={{ transform: `translate(${x}px, ${y}px)` }}
				className="absolute w-fit"
				items={items}
				isOpen={isShowing}
				setIsOpen={(value: boolean) =>
					setContextMenuData((prev) => ({ ...prev, isShowing: value }))
				}
				setFocusIndex={setFocusedIndex}
				focusIndex={focusedIndex}
			/>
		</div>
	);
}
