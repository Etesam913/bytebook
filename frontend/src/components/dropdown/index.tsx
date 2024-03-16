import { type ReactNode, useRef, useState, useEffect } from "react";
import { ChevronDown } from "../../icons/chevron-down";
import { cn } from "../../utils/string-formatting";
import { AnimatePresence, motion } from "framer-motion";
import { useOnClickOutside } from "../../utils/hooks";

type DropdownItem = {
	value: string;
	label: ReactNode;
};

export function Dropdown({
	items,
	className,
	buttonClassName,
	variant = "md",
	controlledValueIndex,
	onChange,
	disabled,
}: {
	items: DropdownItem[];
	className?: string;
	buttonClassName?: string;
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
					"bg-zinc-50 dark:bg-zinc-700 rounded-md text-left py-[6px] px-2 border-[1.25px] border-zinc-300 dark:border-zinc-600 flex items-center",
					variant === "sm" && "py-1 px-1.5",
					buttonClassName,
					disabled && "opacity-50 pointer-events-none",
				)}
			>
				{items[valueIndex].label}
				<motion.span
					className="ml-auto"
					animate={{ rotateZ: isOpen ? 180 : 0 }}
				>
					<ChevronDown width="0.85rem" height="0.85rem" />
				</motion.span>
			</button>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						role="menu"
						className={cn(
							"absolute z-30 shadow-xl bg-zinc-50 dark:bg-zinc-700 overflow-hidden translate-y-1 w-full rounded-md border-zinc-300 dark:border-zinc-600 border-[1.25px]",
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
							<div className="flex flex-col py-[6px] px-[4.5px] max-h-[165px] overflow-y-auto">
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
										className="text-left py-[3px] px-[7px] hover:bg-zinc-150 dark:hover:bg-zinc-600 focus-visible:bg-zinc-150 dark:focus-visible:bg-zinc-600 rounded-md transition-colors outline-none"
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
