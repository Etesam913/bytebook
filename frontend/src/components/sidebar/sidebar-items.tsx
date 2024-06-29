import { AnimatePresence } from "framer-motion";
import { useAtom } from "jotai";
import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { selectionRangeAtom } from "../../atoms";
import { SidebarHighlight } from "./highlight";

export function SidebarItems({
	data,
	getContextMenuStyle,
	hoveredIndex,
	setHoveredIndex,
	renderLink,
	anchorSelectionIndex,
	emptyElement,
	layoutId,
}: {
	data: string[] | null;
	getContextMenuStyle?: (dataItem: string) => CSSProperties;
	hoveredIndex: number | null;
	setHoveredIndex: Dispatch<SetStateAction<number | null>>;
	renderLink: (data: {
		dataItem: string;
		i: number;
		selectionRange: Set<string>;
		setSelectionRange: Dispatch<SetStateAction<Set<string>>>;
	}) => ReactNode;
	anchorSelectionIndex: React.MutableRefObject<number>;
	emptyElement?: ReactNode;
	layoutId: string;
}) {
	const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);

	const dataElements = data?.map((dataItem, i) => (
		<li
			onMouseEnter={() => setHoveredIndex(i)}
			onMouseLeave={() => setHoveredIndex(null)}
			key={dataItem}
			className="py-[.1rem]"
			style={getContextMenuStyle?.(dataItem)}
		>
			<div
				className="flex items-center relative select-none rounded-md"
				onClick={(e) => {
					// Shift click
					if (e.shiftKey) {
						const start = Math.min(anchorSelectionIndex.current, i);
						const end = Math.max(anchorSelectionIndex.current, i);
						const selectedElements: Set<string> = new Set();
						for (let j = start; j <= end; j++) selectedElements.add(data[j]);
						setSelectionRange(selectedElements);
					}
					// Command click
					else if (e.metaKey) {
						anchorSelectionIndex.current = i;
						setSelectionRange((prev) => {
							const newSelection = new Set(prev);
							if (newSelection.has(data[i])) {
								newSelection.delete(data[i]);
							} else {
								newSelection.add(data[i]);
							}
							return newSelection;
						});
					}
					// Regular click
					else {
						anchorSelectionIndex.current = i;
						setSelectionRange(new Set());
					}
				}}
			>
				<AnimatePresence>
					{hoveredIndex === i && !selectionRange.has(data[i]) && (
						<SidebarHighlight layoutId={layoutId} />
					)}
				</AnimatePresence>
				{renderLink({ dataItem, i, selectionRange, setSelectionRange })}
			</div>
		</li>
	));
	return (
		<>{dataElements && dataElements.length > 0 ? dataElements : emptyElement}</>
	);
}
