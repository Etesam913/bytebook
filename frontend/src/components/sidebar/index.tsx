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
import { SidebarItems } from "./sidebar-items";
import { useListVirtualization } from "../../utils/hooks";

const SIDEBAR_ITEM_HEIGHT = 36;
const VIRUTALIZATION_HEIGHT = 8;

export function Sidebar({
	isCollapsed,
	data,
	getContextMenuStyle,
	renderLink,
	emptyElement,
	layoutId,
	contentType,
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
	contentType?: "note" | "folder";
}) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const anchorSelectionIndex = useRef<number>(0);
	const { folder } = useParams();

	const listRef = useRef<HTMLDivElement>(null);
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
		listRef,
	);

	// Reset scroll position when folder changes so that the sidebar is scrolled to the top
	useEffect(() => {
		setScrollTop(0);
	}, [folder]);

	return (
		<div className="overflow-y-auto" ref={listRef} onScroll={onScroll}>
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
