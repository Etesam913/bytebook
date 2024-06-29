import { AnimatePresence, motion } from "framer-motion";
import {
	type CSSProperties,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useRef,
	useState,
} from "react";
import { SidebarItems } from "./sidebar-items";

export function Sidebar({
	isCollapsed,
	data,
	getContextMenuStyle,
	renderLink,
	emptyElement,
	layoutId,
}: {
	isCollapsed: boolean;
	data: string[] | null;
	getContextMenuStyle?: (dataItem: string) => CSSProperties;
	renderLink: (data: {
		dataItem: string;
		i: number;
		selectionRange: Set<string>;
		setSelectionRange: Dispatch<SetStateAction<Set<string>>>;
	}) => ReactNode;
	emptyElement?: ReactNode;
	layoutId: string;
}) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const anchorSelectionIndex = useRef<number>(0);
	const listRef = useRef<HTMLUListElement>(null);

	return (
		<AnimatePresence initial={false}>
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
						layoutId={layoutId}
						data={data}
						renderLink={renderLink}
						getContextMenuStyle={getContextMenuStyle}
						hoveredIndex={hoveredIndex}
						setHoveredIndex={setHoveredIndex}
						anchorSelectionIndex={anchorSelectionIndex}
						emptyElement={emptyElement}
					/>
				</motion.ul>
			)}
		</AnimatePresence>
	);
}
