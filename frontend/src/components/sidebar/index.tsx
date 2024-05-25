import { AnimatePresence, motion } from "framer-motion";
import {
	type CSSProperties,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useRef,
	useState,
} from "react";
import { useOnClickOutside } from "../../utils/hooks";
import { SidebarItems } from "./sidebar-items";

export function Sidebar({
	isCollapsed,
	data,
	getContextMenuStyle,
	renderLink,
	emptyElement,
}: {
	isCollapsed: boolean;
	data: string[] | null;
	getContextMenuStyle?: (dataItem: string) => CSSProperties;
	renderLink: (data: {
		dataItem: string;
		i: number;
		selectionRange: Set<number>;
		setSelectionRange: Dispatch<SetStateAction<Set<number>>>;
	}) => ReactNode;
	emptyElement?: ReactNode;
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
						emptyElement={emptyElement}
					/>
				</motion.ul>
			)}
		</AnimatePresence>
	);
}
