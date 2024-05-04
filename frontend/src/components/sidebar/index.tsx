import { AnimatePresence, motion } from "framer-motion";
import { type CSSProperties, type ReactNode, useRef, useState } from "react";
import { useOnClickOutside } from "../../utils/hooks";
import { SidebarItems } from "./sidebar-items";

export function Sidebar({
	isCollapsed,
	data,
	getContextMenuStyle,
	renderLink,
}: {
	isCollapsed: boolean;
	data: string[] | null;
	getContextMenuStyle: (dataItem: string) => CSSProperties;
	renderLink: (dataItem: string, isSelected: boolean) => ReactNode;
}) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const [selectionRange, setSelectionRange] = useState<Set<number>>(new Set());
	const anchorSelectionIndex = useRef<number>(0);
	const listRef = useRef<HTMLUListElement>(null);

	useOnClickOutside(listRef, () => setSelectionRange(new Set()));

	return (
		<AnimatePresence>
			{!isCollapsed && (
				<motion.ul
					ref={listRef}
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
						setSelectionRange={setSelectionRange}
						selectionRange={selectionRange}
						anchorSelectionIndex={anchorSelectionIndex}
					/>
				</motion.ul>
			)}
		</AnimatePresence>
	);
}
