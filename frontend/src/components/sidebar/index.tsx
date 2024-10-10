import { useAtom } from "jotai/react";
import {
	type CSSProperties,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";
import { useParams } from "wouter";
import { selectionRangeAtom } from "../../atoms";
import { useListVirtualization, useOnClickOutside } from "../../utils/hooks";
import { SidebarItems } from "./sidebar-items";

const SIDEBAR_ITEM_HEIGHT = 36;
const VIRUTALIZATION_HEIGHT = 8;

export function Sidebar({
	data,
	getContextMenuStyle,
	renderLink,
	emptyElement,
	layoutId,
	contentType,
}: {
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
	contentType?: "note" | "folder";
}) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const anchorSelectionIndex = useRef<number>(0);
	const { folder } = useParams();
	const listScrollContainerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLUListElement>(null);
	const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);

	useOnClickOutside(listRef, () => {
		if (selectionRange.size === 0 || contentType === undefined) return;
		const selectionSetAsArray = Array.from(selectionRange);
		/*
			When a click is detected outside of the sidebar and the selection is of the same
			type as the contentType, then you can clear the selection. You do not want a
			folder side onClickOutside to clear the selection for a note valid click
		*/
		if (selectionSetAsArray[0].startsWith(contentType)) {
			setSelectionRange(new Set());
		}
	});
	const items = data ?? [];

	const {
		setScrollTop,
		visibleItems,
		startIndex,
		onScroll,
		listContainerHeight,
		listHeight,
		listTop,
	} = useListVirtualization(
		items,
		SIDEBAR_ITEM_HEIGHT,
		VIRUTALIZATION_HEIGHT,
		listScrollContainerRef,
	);

	// Reset scroll position when folder changes so that the sidebar is scrolled to the top
	useEffect(() => {
		setScrollTop(0);
	}, [folder]);

	return (
		<div
			className="overflow-y-auto"
			ref={listScrollContainerRef}
			onScroll={onScroll}
		>
			<div
				style={{
					height: items.length > 0 ? listContainerHeight : "auto",
				}}
			>
				<ul
					style={{
						position: "relative",
						height: visibleItems.length > 0 ? listHeight : "auto",
						top: listTop,
					}}
					ref={listRef}
				>
					<SidebarItems
						layoutId={layoutId}
						allData={data}
						visibleData={visibleItems}
						renderLink={renderLink}
						getContextMenuStyle={getContextMenuStyle}
						hoveredIndex={hoveredIndex}
						setHoveredIndex={setHoveredIndex}
						anchorSelectionIndex={anchorSelectionIndex}
						emptyElement={emptyElement}
						startIndex={startIndex}
						contentType={contentType}
					/>
				</ul>
			</div>
		</div>
	);
}
