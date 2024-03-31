import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ChevronDown } from "../../icons/chevron-down";
import { useOnClickOutside } from "../../utils/hooks";
import { cn } from "../../utils/string-formatting";

type DropdownItem = {
	value: string;
	label: ReactNode;
};

export function Dropdown({
	items,
	className,
	buttonClassName,
	dropdownItemsClassName,
	variant = "md",
	controlledValueIndex,
	onChange,
	disabled,
}: {
	items: DropdownItem[];
	className?: string;
	buttonClassName?: string;
	dropdownItemsClassName?: string;
	variant?: string;
	controlledValueIndex?: number;
	onChange?: (v: DropdownItem) => void;
	disabled?: boolean;
}) {
	const dropdownContainerRef = useRef<HTMLDivElement>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [valueIndex, setValueIndex] = useState(0);
	useOnClickOutside(dropdownContainerRef, () => setIsOpen(false));

	useEffect(() => {
		if (controlledValueIndex && controlledValueIndex !== valueIndex)
			setValueIndex(controlledValueIndex > -1 ? controlledValueIndex : 0);
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
					"flex items-center rounded-md border-[1.25px] border-zinc-300 bg-zinc-50 px-2 py-[6px] text-left dark:border-zinc-600 dark:bg-zinc-700",
					variant === "sm" && "px-1.5 py-1",
					buttonClassName,
					disabled && "pointer-events-none opacity-50",
				)}
			>
				{items[valueIndex].label}
				<motion.span
					className="ml-auto"
					animate={{ rotateZ: isOpen ? 180 : 0 }}
				>
					<ChevronDown width="0.85rem" height="0.85rem" strokeWidth="2.8px" />
				</motion.span>
			</button>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						role="menu"
						className={cn(
							"absolute z-30 w-full translate-y-1 overflow-hidden rounded-md border-[1.25px] border-zinc-300 bg-zinc-50 shadow-xl dark:border-zinc-600 dark:bg-zinc-700",
							variant === "sm" && "translate-y-[3px]",
						)}
						exit={{
							borderColor: "transparent",
							transition: {
								borderColor: { delay: 0.25 },
							},
						}}
					>
						<motion.div
							initial={{ height: 0 }}
							animate={{
								height: "auto",
								transition: { type: "spring", damping: 16, stiffness: 220 },
							}}
							exit={{ height: 0 }}
						>
							<div
								className={cn(
									"flex max-h-[165px] flex-col overflow-y-auto px-[4.5px] py-[6px]",
									dropdownItemsClassName,
								)}
							>
								{items.map(({ value, label }, i) => (
									<button
										key={value}
										type="button"
										role="menuitem"
										onClick={() => {
											setIsOpen(false);
											setValueIndex(i);
											onChange?.(items[i]);
										}}
										className="rounded-md px-[7px] py-[3px] text-left outline-none transition-colors hover:bg-zinc-150 focus-visible:bg-zinc-150 dark:hover:bg-zinc-600 dark:focus-visible:bg-zinc-600"
									>
										{label}
									</button>
								))}
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
