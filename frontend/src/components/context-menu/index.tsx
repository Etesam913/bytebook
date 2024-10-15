import { useAtomValue } from "jotai/react";
import { useState } from "react";
import { contextMenuDataAtom } from "../../atoms";
import { DropdownItems } from "../dropdown/dropdown-items";

export function ContextMenu() {
	const { isShowing, items, x, y } = useAtomValue(contextMenuDataAtom);
	const [focusedIndex, setFocusedIndex] = useState(0);

	return (
		<div className="text-sm">
			<DropdownItems
				onChange={(e) => {
					console.log(e);
				}}
				style={{ transform: `translate(${x}px, ${y}px)` }}
				className="absolute w-fit"
				items={items}
				isOpen={isShowing}
				setIsOpen={() => {}}
				setFocusIndex={setFocusedIndex}
				focusIndex={focusedIndex}
			/>
		</div>
	);
}
