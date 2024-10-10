import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { ChevronDown } from "../../icons/chevron-down";

export function AccordionButton({
	icon,
	title,
	isOpen,
	onClick,
}: {
	icon: ReactNode;
	title: ReactNode;
	isOpen: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
			onClick={onClick}
		>
			{icon}

			<p>{title}</p>
			<motion.span
				className="ml-auto"
				initial={{ rotateZ: isOpen ? 180 : 0 }}
				animate={{ rotateZ: isOpen ? 180 : 0 }}
			>
				<ChevronDown strokeWidth="2.5px" className="will-change-transform" />
			</motion.span>
		</button>
	);
}
