import { motion } from "framer-motion";
import { easingFunctions } from "../../animations";

export function SidebarHighlight({ layoutId }: { layoutId: string }) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ ease: easingFunctions["ease-out-expo"] }}
			layoutId={layoutId}
			className="absolute pointer-events-none z-[-5] h-full w-full bg-zinc-100 dark:bg-zinc-650 rounded-md"
		/>
	);
}
