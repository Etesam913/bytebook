import { AnimatePresence } from "framer-motion";
import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { SidebarHighlight } from "./highlight";

export function SidebarItems({
	data,
	getContextMenuStyle,
	hoveredIndex,
	setHoveredIndex,
	renderLink,
	selectionRange,
	setSelectionRange,
	anchorSelectionIndex,
}: {
	data: string[] | null;
	getContextMenuStyle: (dataItem: string) => CSSProperties;
	hoveredIndex: number | null;
	setHoveredIndex: Dispatch<SetStateAction<number | null>>;
	renderLink: (dataItem: string, isSelected: boolean) => ReactNode;
	selectionRange: Set<number>;
	setSelectionRange: Dispatch<SetStateAction<Set<number>>>;
	anchorSelectionIndex: React.MutableRefObject<number>;
}) {
	const dataElements = data?.map((dataItem, i) => (
		<li
			onMouseEnter={() => setHoveredIndex(i)}
			onMouseLeave={() => setHoveredIndex(null)}
			key={dataItem}
			className="py-[.1rem]"
			style={getContextMenuStyle(dataItem)}
		>
			<div
				className="flex items-center relative select-none rounded-md"
				onClick={(e) => {
					// Shift click
					if (e.shiftKey) {
						const start = Math.min(anchorSelectionIndex.current, i);
						const end = Math.max(anchorSelectionIndex.current, i);
						setSelectionRange(
							new Set(
								Array.from({ length: end - start + 1 }, (_, i) => start + i),
							),
						);
					}
					// Command click
					else if (e.metaKey) {
						anchorSelectionIndex.current = i;
						setSelectionRange((prev) => {
							const newSelection = new Set(prev);
							if (newSelection.has(i)) {
								newSelection.delete(i);
							} else {
								newSelection.add(i);
							}
							return newSelection;
						});
					}
					// Regular click
					else {
						anchorSelectionIndex.current = i;
						setSelectionRange(new Set([i]));
					}
				}}
			>
				<AnimatePresence>
					{hoveredIndex === i && (
						<SidebarHighlight layoutId="folder-highlight" />
					)}
				</AnimatePresence>
				{renderLink(dataItem, selectionRange.has(i))}
			</div>
		</li>
	));
	return <>{dataElements}</>;
}
