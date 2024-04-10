import type { SetStateAction } from "jotai/ts3.8/esm/vanilla";
import { type Dispatch, useEffect, useRef } from "react";
import type { DropdownItem } from "../../types";
import { cn } from "../../utils/string-formatting";

export function DropdownItems({
	dropdownItemsClassName,
	items,
	setIsOpen,
	setValueIndex,
	onChange,
}: {
	dropdownItemsClassName?: string;
	items: DropdownItem[];
	setIsOpen: Dispatch<SetStateAction<boolean>>;
	setValueIndex: Dispatch<SetStateAction<number>>;
	onChange?: (item: DropdownItem) => void;
}) {
	const dropdownItemsRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (dropdownItemsRef.current) {
			const children = Array.from(dropdownItemsRef.current.children);
			const firstChild = children.at(0) as HTMLElement;
			firstChild.focus();
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
				<button
					key={value}
					type="button"
					role="menuitem"
					onKeyDown={(e) => {
						if (e.key === "ArrowDown") {
							e.preventDefault();
							const nextSibling = e.currentTarget
								.nextElementSibling as HTMLElement;
							if (nextSibling) {
								nextSibling.focus();
							}
						} else if (e.key === "ArrowUp") {
							e.preventDefault();
							const previousSibling = e.currentTarget
								.previousElementSibling as HTMLElement;
							if (previousSibling) {
								previousSibling.focus();
							}
						} else if (e.key === "Escape") {
							setIsOpen(false);
						}
					}}
					onClick={() => {
						setIsOpen(false);
						setValueIndex(i);
						onChange?.(items[i]);
					}}
					className="rounded-md px-[7px] py-[3px] text-left outline-none transition-colors hover:bg-zinc-150 focus:bg-zinc-150 dark:hover:bg-zinc-600 dark:focus:bg-zinc-600"
				>
					{label}
				</button>
			))}
		</div>
	);
}
