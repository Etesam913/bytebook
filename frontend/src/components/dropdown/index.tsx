import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "../../icons/chevron-down";
import type { DropdownItem } from "../../types";
import { useOnClickOutside } from "../../utils/hooks";
import { cn } from "../../utils/string-formatting";
import { DropdownItems } from "./dropdown-items";

export function Dropdown({
	items,
	maxHeight,
	className,
	buttonClassName,
	controlledValueIndex,
	onChange,
	disabled,
}: {
	items: DropdownItem[];
	maxHeight?: number;
	className?: string;
	buttonClassName?: string;
	controlledValueIndex?: number;
	onChange?: (v: DropdownItem) => void;
	disabled?: boolean;
}) {
	const dropdownContainerRef = useRef<HTMLDivElement>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [valueIndex, setValueIndex] = useState(0);
	const [focusIndex, setFocusIndex] = useState(0);

	useOnClickOutside(dropdownContainerRef, () => setIsOpen(false));

	useEffect(() => {
		if (
			controlledValueIndex !== undefined &&
			controlledValueIndex !== valueIndex
		) {
			setValueIndex(controlledValueIndex > -1 ? controlledValueIndex : 0);
		}
	}, [controlledValueIndex, valueIndex]);

	return (
		<div className={cn("relative w-fit", className)} ref={dropdownContainerRef}>
			<button
				disabled={disabled}
				onKeyDown={(e) => e.key === "Escape" && setIsOpen(false)}
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				aria-haspopup="true"
				aria-expanded={isOpen}
				className={cn(
					"flex items-center rounded-md gap-1.5 border-[1.25px] border-zinc-300 bg-zinc-50 px-2 py-0.5 text-left dark:border-zinc-600 dark:bg-zinc-700",
					buttonClassName,
					disabled && "pointer-events-none opacity-50",
				)}
			>
				{items[valueIndex].label}
				<motion.span
					className="ml-auto"
					animate={{ rotateZ: isOpen ? 180 : 0 }}
				>
					<ChevronDown strokeWidth="2.8px" />
				</motion.span>
			</button>

			<DropdownItems
				items={items}
				maxHeight={maxHeight}
				isOpen={isOpen}
				setIsOpen={setIsOpen}
				setValueIndex={setValueIndex}
				setFocusIndex={setFocusIndex}
				focusIndex={focusIndex}
				onChange={onChange}
			/>
		</div>
	);
}
