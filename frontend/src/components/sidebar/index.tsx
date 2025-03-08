import { useAtom, useAtomValue } from "jotai/react";
import {
	type CSSProperties,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useParams } from "wouter";
import {
	contextMenuAtom,
	projectSettingsAtom,
	selectionRangeAtom,
} from "../../atoms";
import { useOnClickOutside } from "../../hooks/general";
import { useListVirtualization } from "../../hooks/observers";
import { useSearchParamsEntries } from "../../utils/routing";
import { scrollVirtualizedListToSelectedNoteOrFolder } from "../../utils/selection";
import { cn } from "../../utils/string-formatting";
import { SidebarItems } from "./sidebar-items";

export type SidebarContentType = "note" | "folder" | "tag";

export function Sidebar({
	data,
	getContextMenuStyle,
	renderLink,
	emptyElement,
	layoutId,
	contentType,
	shouldHideSidebarHighlight,
	activeDataItem,
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
	contentType: SidebarContentType;
	shouldHideSidebarHighlight?: boolean;
	activeDataItem?: string | null;
}) {
	const [hoveredItem, setHoveredItem] = useState<string | null>(null);
	const anchorSelectionIndex = useRef<number>(0);
	const { folder } = useParams();
	const listScrollContainerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLUListElement>(null);
	/*
	  If the activeNoteItem is set, then the note was navigated via a note link or the searchbar
		We need to change the scroll position to the sidebar so that the active note is visible
	*/
	const searchParams: { focus?: string } = useSearchParamsEntries();
	const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
	const contextMenuRef = useAtomValue(contextMenuAtom);
	const projectSettings = useAtomValue(projectSettingsAtom);

	useOnClickOutside(listRef, (e) => {
		// We need to use the selectionRange for the context menu so early return for this case
		if (contextMenuRef?.contains(e.target as Node)) return;
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

	const items = useMemo(() => data ?? [], [data]);

	const isSidebarItemCard = useMemo(
		() =>
			projectSettings.noteSidebarItemSize === "card" && contentType === "note",
		[projectSettings.noteSidebarItemSize, contentType],
	);
	const VIRUTALIZATION_HEIGHT = useMemo(
		() => (isSidebarItemCard ? 18 : 8),
		[isSidebarItemCard],
	);
	const SIDEBAR_ITEM_HEIGHT = useMemo(
		() => (isSidebarItemCard ? 83 : 34),
		[projectSettings.noteSidebarItemSize, contentType],
	);

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
		listScrollContainerRef.current?.scrollTo({
			top: 0,
		});
	}, [folder]);

	useEffect(() => {
		if (!activeDataItem || !searchParams.focus) return;
		const scrollTopToActiveItem = scrollVirtualizedListToSelectedNoteOrFolder(
			activeDataItem,
			items,
			visibleItems,
			SIDEBAR_ITEM_HEIGHT,
		);
		if (scrollTopToActiveItem === -1) return;
		setScrollTop(scrollTopToActiveItem);
		listScrollContainerRef.current?.scrollTo({
			top: scrollTopToActiveItem,
		});
	}, [activeDataItem, searchParams.focus, SIDEBAR_ITEM_HEIGHT]);

	return (
		<div
			className="overflow-y-auto"
			ref={listScrollContainerRef}
			onScroll={onScroll}
		>
			<div
				className="mt-[2px]"
				style={{
					height: items.length > 0 ? listContainerHeight : "auto",
				}}
			>
				<ul
					className={cn(
						contentType === "note" && "pl-1 pr-2",
						contentType === "folder" && "pl-[3px] pr-[3px] ",
					)}
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
						hoveredItem={hoveredItem}
						setHoveredItem={setHoveredItem}
						anchorSelectionIndex={anchorSelectionIndex}
						emptyElement={emptyElement}
						startIndex={startIndex}
						contentType={contentType}
						isSidebarItemCard={isSidebarItemCard}
						shouldHideSidebarHighlight={shouldHideSidebarHighlight}
					/>
				</ul>
			</div>
		</div>
	);
}
