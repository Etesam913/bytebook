import { motion } from "framer-motion";
import type { SetStateAction } from "jotai/ts3.8/esm/vanilla";
import { type Dispatch, useEffect, useRef } from "react";
import { easingFunctions } from "../../animations";
import type { DropdownItem } from "../../types";
import { cn } from "../../utils/string-formatting";

export function DropdownItems({
	dropdownItemsClassName,
	items,
	setIsOpen,
	setValueIndex,
	onChange,
	setFocusIndex,
	focusIndex,
}: {
	dropdownItemsClassName?: string;
	items: DropdownItem[];
	setIsOpen: Dispatch<SetStateAction<boolean>>;
	setValueIndex: Dispatch<SetStateAction<number>>;
	onChange?: (item: DropdownItem) => void;
	setFocusIndex: Dispatch<SetStateAction<number>>;
	focusIndex: number | null;
}) {
	const dropdownItemsRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setFocusIndex(0);
		if (dropdownItemsRef.current) {
			const children = Array.from(dropdownItemsRef.current.children);
			const firstChild = children.at(0) as HTMLElement;
			const firstButton = firstChild.lastChild as HTMLElement;
			firstButton.focus();
		}
	}, []);

	return (
		<div
			ref={dropdownItemsRef}
			className={cn(
				"flex max-h-[165px] flex-col overflow-y-auto px-[4.5px] py-[6px] gap-0.5",
				dropdownItemsClassName,
			)}
		>
			{items.map(({ value, label }, i) => (
				<div className="w-full inline relative" key={value}>
					{focusIndex === i && (
						<motion.div
							transition={{ ease: easingFunctions["ease-out-expo"] }}
							layoutId={"dropdown-highlight"}
							className="absolute z-30 inset-0 rounded-md w-full px-1.5 py-0.5 bg-zinc-150 dark:bg-zinc-600"
						/>
					)}
					<button
						className="relative z-40 rounded-md w-full px-1.5 py-0.5 text-left"
						type="button"
						role="menuitem"
						onKeyDown={(e) => {
							if (e.key === "ArrowDown") {
								e.preventDefault();
								const nextButton = e.currentTarget.parentElement?.nextSibling
									?.lastChild as HTMLElement;

								if (nextButton) {
									nextButton.focus();
									setFocusIndex(i + 1);
								}
							} else if (e.key === "ArrowUp") {
								e.preventDefault();
								const previousButton = e.currentTarget.parentElement
									?.previousSibling?.lastChild as HTMLElement;
								if (previousButton) {
									previousButton.focus();
									setFocusIndex(i - 1);
								}
							} else if (e.key === "Escape") {
								setIsOpen(false);
							}
						}}
						onMouseEnter={(e) => {
							(e.target as HTMLElement).focus();
							setFocusIndex(i);
						}}
						onClick={() => {
							setIsOpen(false);
							setValueIndex(i);
							onChange?.(items[i]);
						}}
					>
						{label}
					</button>
				</div>
			))}
		</div>
	);
}
