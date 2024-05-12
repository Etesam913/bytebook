import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { easingFunctions } from "../../../animations";
import type { FloatingDataType } from "../../../types";

export function FloatingTextFormatPlugin({
	floatingData,
	children,
}: {
	floatingData: FloatingDataType;
	children: ReactNode;
}) {
	const isOpen = floatingData.isOpen && floatingData.type === "text-format";

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.form
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					style={{
						top: floatingData.top + 25,
						left: floatingData.left,
					}}
					transition={{ ease: easingFunctions["ease-out-circ"] }}
					className="absolute bg-white bg-opacity-[98] dark:bg-zinc-750 p-1 rounded-md shadow-lg flex items-center gap-2 z-50 border-[1px] border-zinc-300 dark:border-zinc-600"
				>
					{children}
				</motion.form>
			)}
		</AnimatePresence>
	);
}
