import { AnimatePresence } from "framer-motion";
import { useAtom } from "jotai";
import {
	type CSSProperties,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useMemo,
} from "react";
import { selectionRangeAtom } from "../../atoms";
import {
	removeFoldersFromSelection,
	removeNotesFromSelection,
} from "../../utils/selection";
import { SidebarHighlight } from "./highlight";

export function SidebarItems({
	allData,
	visibleData,
	getContextMenuStyle,
	hoveredIndex,
	setHoveredIndex,
	renderLink,
	anchorSelectionIndex,
	emptyElement,
	layoutId,
	startIndex,
	contentType,
}: {
	allData: string[] | null;
	visibleData: string[] | null;
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
	contentType?: "note" | "folder";
}) {
	const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);

	const contentTypePrefix = useMemo(() => {
		if (contentType === "note") {
			return "note:";
		}
		if (contentType === "folder") {
			return "folder:";
		}
		return "";
	}, [contentType]);

	const dataElements =
		allData &&
		visibleData?.map((dataItem, i) => {
			const prefixedDataItem = `${contentTypePrefix}${dataItem}`;
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
								const start = Math.min(
									anchorSelectionIndex.current,
									startIndex + i,
								);
								const end = Math.max(
									anchorSelectionIndex.current,
									startIndex + i,
								);
								const selectedElements: Set<string> = new Set();
								for (let j = start; j <= end; j++)
									selectedElements.add(`${contentType}:${allData[j]}`);
								setSelectionRange(selectedElements);
							}
							// Command click
							else if (e.metaKey) {
								anchorSelectionIndex.current = startIndex + i;
								setSelectionRange((prev) => {
									// Making sure to clean the selection
									const newSelection =
										contentType === "note"
											? removeFoldersFromSelection(prev)
											: removeNotesFromSelection(prev);

									if (newSelection.has(prefixedDataItem)) {
										newSelection.delete(prefixedDataItem);
									} else {
										newSelection.add(prefixedDataItem);
									}
									return newSelection;
								});
							}
							// Regular click
							else {
								anchorSelectionIndex.current = startIndex + i;
								setSelectionRange(new Set());
							}
						}}
					>
						<AnimatePresence>
							{hoveredIndex === i && !selectionRange.has(prefixedDataItem) && (
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
