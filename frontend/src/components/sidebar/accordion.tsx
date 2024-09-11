import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { ChevronDown } from "../../icons/chevron-down";

export function SidebarAccordion({
	onClick,
	isOpen,
	children,
	title,
	icon,
}: {
	onClick: () => void;
	isOpen: boolean;
	children: ReactNode;
	title: string;
	icon?: JSX.Element;
}) {
	return (
		<section className="flex flex-col overflow-y-auto max-h-[35vh]">
			<button
				type="button"
				className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700 "
				onClick={onClick}
			>
				{icon}

				<p>{title}</p>
				<motion.span
					className="ml-auto"
					initial={{ rotateZ: isOpen ? 180 : 0 }}
					animate={{ rotateZ: isOpen ? 180 : 0 }}
				>
					<ChevronDown
						strokeWidth="2.5px"
						height="0.8rem"
						width="0.8rem"
						className="will-change-transform"
					/>
				</motion.span>
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
