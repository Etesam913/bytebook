import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { ChevronDown } from "../../icons/chevron-down";

export function SidebarAccordion({
	onClick,
	isOpen,
	children,
	title,
}: {
	onClick: () => void;
	isOpen: boolean;
	children: ReactNode;
	title: string;
}) {
	return (
		<section className="flex flex-col overflow-y-auto max-h-[35vh]">
			<button
				type="button"
				className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700 "
				onClick={onClick}
			>
				<motion.span
					initial={{ rotateZ: isOpen ? 0 : 270 }}
					animate={{ rotateZ: isOpen ? 0 : 270 }}
				>
					<ChevronDown strokeWidth="2.5px" height="0.8rem" width="0.8rem" />
				</motion.span>
				<p>{title}</p>
			</button>
			<AnimatePresence>
				{isOpen && (
					<motion.ul
						initial={{ height: 0 }}
						animate={{
							height: "auto",
							transition: { type: "spring", damping: 16 },
						}}
						exit={{ height: 0, opacity: 0 }}
						className="overflow-hidden hover:overflow-auto"
					>
						{children}
					</motion.ul>
				)}
			</AnimatePresence>
		</section>
	);
}
