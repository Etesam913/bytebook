import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { AccordionButton } from "./accordion-button";

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
		<section>
			<AccordionButton
				onClick={onClick}
				isOpen={isOpen}
				title={title}
				icon={icon}
			/>
			<AnimatePresence>
				{isOpen && (
					<motion.ul
						initial={{ height: 0 }}
						animate={{
							height: "auto",
							transition: { type: "spring", damping: 16 },
						}}
						exit={{ height: 0, opacity: 0 }}
						className="overflow-hidden hover:overflow-auto pl-1"
					>
						{children}
					</motion.ul>
				)}
			</AnimatePresence>
		</section>
	);
}
