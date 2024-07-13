import {
	type CSSProperties,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { SidebarItems } from "./sidebar-items";

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

	const listRef = useRef<HTMLDivElement>(null);
	const [scrollTop, setScrollTop] = useState(0);
	const items = data ?? [];
	const numberOfItems = items.length;
	const [containerHeight, setContainerHeight] = useState(0);
	const startIndex = Math.floor(scrollTop / SIDEBAR_ITEM_HEIGHT);
	const endIndex = Math.min(
		startIndex +
			Math.ceil(
				containerHeight / (SIDEBAR_ITEM_HEIGHT - VIRUTALIZATION_HEIGHT),
			),
		numberOfItems,
	);
	const visibleItems = items.slice(startIndex, endIndex);

	useLayoutEffect(() => {
		const resizeObserver = new ResizeObserver((entries) => {
			const container = entries[0].target;
			setContainerHeight(container.clientHeight);
		});
		if (listRef.current) {
			resizeObserver.observe(listRef.current);
		}
		return () => {
			resizeObserver.disconnect();
		};
	}, [listRef]);

	return (
		<div
			className="overflow-y-auto"
			ref={listRef}
			onScroll={(e) => {
				if (visibleItems.length > 0) {
					setScrollTop(Math.max(0, (e.target as HTMLElement).scrollTop));
				}
			}}
		>
			<div
				style={{
					height:
						items.length > 0
							? `${items.length * SIDEBAR_ITEM_HEIGHT}px`
							: "auto",
				}}
			>
				<ul
					style={{
						position: "relative",
						height:
							visibleItems.length > 0
								? `${visibleItems.length * SIDEBAR_ITEM_HEIGHT}px`
								: "auto",
						top: `${startIndex * SIDEBAR_ITEM_HEIGHT}px`,
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
