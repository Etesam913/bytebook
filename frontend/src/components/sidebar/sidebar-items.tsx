import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import type {
	CSSProperties,
	Dispatch,
	ReactNode,
	RefObject,
	SetStateAction,
} from "react";
import type { SidebarContentType } from ".";
import { selectionRangeAtom } from "../../atoms";
import { keepSelectionNotesWithPrefix } from "../../utils/selection";
import { cn } from "../../utils/string-formatting";
import { SidebarHighlight } from "./highlight";

export function SidebarItems({
	allData,
	visibleData,
	getContextMenuStyle,
	hoveredItem,
	setHoveredItem,
	renderLink,
	anchorSelectionIndex,
	emptyElement,
	layoutId,
	startIndex,
	contentType,
	shouldHideSidebarHighlight,
	isSidebarItemCard,
}: {
	allData: string[] | null;
	visibleData: string[] | null;
	getContextMenuStyle?: (dataItem: string) => CSSProperties;
	hoveredItem: string | null;
	setHoveredItem: Dispatch<SetStateAction<string | null>>;
	renderLink: (data: {
		dataItem: string;
		i: number;
		selectionRange: Set<string>;
		setSelectionRange: Dispatch<SetStateAction<Set<string>>>;
	}) => ReactNode;
	anchorSelectionIndex: RefObject<number>;
	emptyElement?: ReactNode;
	layoutId: string;
	startIndex: number;
	contentType: SidebarContentType;
	shouldHideSidebarHighlight?: boolean;
	isSidebarItemCard: boolean;
}) {
	const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
	/**
	 * Handles shift-click behavior for multi-selection by selecting a range of items
	 * between the anchor index and the clicked index
	 */
	function handleShiftClick(i: number, allData: string[]) {
		const start = Math.min(anchorSelectionIndex.current, startIndex + i);
		const end = Math.max(anchorSelectionIndex.current, startIndex + i);
		const selectedElements: Set<string> = new Set();
		for (let j = start; j <= end; j++)
			selectedElements.add(`${contentType}:${allData[j]}`);
		setSelectionRange(selectedElements);
	}

	/**
	 * Handles command/ctrl-click behavior by toggling selection state of individual items
	 * while preserving existing selections
	 */
	function handleCommandClick(i: number, prefixedDataItem: string) {
		anchorSelectionIndex.current = startIndex + i;
		setSelectionRange((prev) => {
			// Making sure to clean the selection
			const newSelection = keepSelectionNotesWithPrefix(prev, contentType);

			// Whether the clicked element is already selected or not
			if (newSelection.has(prefixedDataItem)) {
				newSelection.delete(prefixedDataItem);
			} else {
				newSelection.add(prefixedDataItem);
			}
			return newSelection;
		});
	}
	const dataElements =
		allData &&
		visibleData?.map((dataItem, i) => {
			const prefixedDataItem = `${contentType}:${dataItem}`;
			return (
				<li
					onMouseEnter={() => {
						setHoveredItem(dataItem);
					}}
					onMouseLeave={() => {
						setHoveredItem(null);
					}}
					key={dataItem}
					className="py-[.1rem]"
					style={getContextMenuStyle?.(dataItem)}
				>
					<div
						className="flex items-center relative select-none rounded-md"
						onClick={(e) => {
							if (e.shiftKey) handleShiftClick(i, allData);
							else if (e.metaKey) handleCommandClick(i, prefixedDataItem);
							// Regular click
							else {
								anchorSelectionIndex.current = startIndex + i;
								setSelectionRange(new Set());
							}
						}}
					>
						{!shouldHideSidebarHighlight && (
							<AnimatePresence>
								{hoveredItem === dataItem &&
									!selectionRange.has(prefixedDataItem) && (
										<SidebarHighlight
											layoutId={layoutId}
											className={cn(isSidebarItemCard && "rounded-none")}
										/>
									)}
							</AnimatePresence>
						)}
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
