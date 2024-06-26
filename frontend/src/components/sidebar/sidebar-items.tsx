import { AnimatePresence } from "framer-motion";
import { useAtom } from "jotai";
import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { selectionRangeAtom } from "../../atoms";
import {
	removeFoldersFromSelection,
	removeNotesFromSelection,
} from "../../utils/selection";
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
	startIndex,
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
	startIndex: number;
}) {
	const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);

	const doesSidebarContainNotes = data?.some((item) =>
		item.endsWith("?ext=md"),
	);

	const dataElements = data?.map((dataItem, i) => {
		return (
			<li
				onMouseEnter={() => {
					setHoveredIndex(i);
				}}
				onMouseLeave={() => {
					setHoveredIndex(null);
				}}
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
								// Making sure to clean the selection
								const newSelection = doesSidebarContainNotes
									? removeFoldersFromSelection(prev)
									: removeNotesFromSelection(prev);

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
					{renderLink({
						dataItem,
						i: startIndex + i,
						selectionRange,
						setSelectionRange,
					})}
				</div>
			</li>
		);
	});
	return (
		<>{dataElements && dataElements.length > 0 ? dataElements : emptyElement}</>
	);
}
