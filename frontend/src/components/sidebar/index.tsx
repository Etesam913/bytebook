import { AnimatePresence, motion } from "framer-motion";
import { type CSSProperties, type ReactNode, useState } from "react";
import { SidebarItems } from "./sidebar-items";

export function Sidebar({
	isCollapsed,
	data,
	getContextMenuStyle,
	renderLink,
	comparisonValue,
}: {
	isCollapsed: boolean;
	data: string[] | null;
	getContextMenuStyle: (dataItem: string) => CSSProperties;
	renderLink: (dataItem: string) => ReactNode;
	comparisonValue: string | undefined;
}) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

	return (
		<AnimatePresence>
			{!isCollapsed && (
				<motion.ul
					initial={{ height: 0 }}
					animate={{
						height: "auto",
					}}
					exit={{ height: 0, opacity: 0 }}
					transition={{ type: "spring", damping: 22, stiffness: 130 }}
					className="overflow-y-auto"
				>
					<SidebarItems
						data={data}
						renderLink={renderLink}
						getContextMenuStyle={getContextMenuStyle}
						hoveredIndex={hoveredIndex}
						setHoveredIndex={setHoveredIndex}
						comparisonValue={comparisonValue}
					/>
				</motion.ul>
			)}
		</AnimatePresence>
	);
}
