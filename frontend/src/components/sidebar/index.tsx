import { useAtom, useAtomValue } from 'jotai/react';
import {
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useRef,
  useState,
} from 'react';
import {
  contextMenuRefAtom,
  dialogDataAtom,
  projectSettingsAtom,
  selectionRangeAtom,
} from '../../atoms';
import { useOnClickOutside } from '../../hooks/general';
import { useListVirtualization } from '../../hooks/observers';
import { cn } from '../../utils/string-formatting';
import { SidebarItems } from './sidebar-items';

export type SidebarContentType = 'note' | 'folder' | 'tag';

export function Sidebar<T>({
  data,
  accessor,
  getContextMenuStyle,
  renderLink,
  emptyElement,
  layoutId,
  contentType,
  shouldHideSidebarHighlight,
}: {
  data: T[] | null;
  accessor: (item: T) => string;
  getContextMenuStyle?: (dataItem: T) => CSSProperties;
  renderLink: (data: {
    dataItem: T;
    i: number;
    selectionRange: Set<string>;
    setSelectionRange: Dispatch<SetStateAction<Set<string>>>;
  }) => ReactNode;
  emptyElement?: ReactNode;
  layoutId: string;
  contentType: SidebarContentType;
  shouldHideSidebarHighlight?: boolean;
}) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const anchorSelectionIndex = useRef<number>(0);
  const listScrollContainerRef = useRef<HTMLDivElement>(null);
  const dialogData = useAtomValue(dialogDataAtom);
  /*
	  If the activeNoteItem is set, then the note was navigated via a note link or the searchbar
		We need to change the scroll position to the sidebar so that the active note is visible
	*/
  const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
  const contextMenuRef = useAtomValue(contextMenuRefAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);

  useOnClickOutside(
    listScrollContainerRef,
    (e) => {
      // We need to use the selectionRange for the context menu so early return for this case
      if (contextMenuRef?.current?.contains(e.target as Node)) return;
      if (selectionRange.size === 0 || contentType === undefined) return;
      const selectionSetAsArray = Array.from(selectionRange);
      /*
			When a click is detected outside of the sidebar and the selection is of the same
			type as the contentType, then you can clear the selection. You do not want a
			folder sidebar onClickOutside to clear the selection for a note valid click
		*/
      if (selectionSetAsArray[0].startsWith(contentType)) {
        setSelectionRange(new Set());
      }
    },
    [contextMenuRef?.current ?? null]
  );

  const items = data ?? [];

  const isSidebarItemCard =
    projectSettings.appearance.noteSidebarItemSize === 'card' &&
    contentType === 'note';

  const SIDEBAR_ITEM_HEIGHT = isSidebarItemCard ? 83 : 34;

  const {
    onScroll,
    visibleItems,
    outerContainerStyle,
    innerContainerStyle,
    startIndex,
  } = useListVirtualization({
    items,
    itemHeight: SIDEBAR_ITEM_HEIGHT,
    listRef: listScrollContainerRef,
  });

  // Reset scroll position when folder changes so that the sidebar is scrolled to the top
  // useEffect(() => {
  //   setScrollTop(0);
  //   listScrollContainerRef.current?.scrollTo({
  //     top: 0,
  //   });
  // }, [folder]);

  // // Scroll to the active item when the activeDataItem or focus changes
  // useEffect(() => {
  //   if (!activeDataItem || !searchParams.focus) return;
  //   const scrollTopToActiveItem = scrollVirtualizedListToSelectedNoteOrFolder(
  //     activeDataItem,
  //     items,
  //     visibleItems,
  //     SIDEBAR_ITEM_HEIGHT
  //   );
  //   if (scrollTopToActiveItem === -1) return;
  //   setScrollTop(scrollTopToActiveItem);
  //   listScrollContainerRef.current?.scrollTo({
  //     top: scrollTopToActiveItem,
  //   });
  // }, [activeDataItem, searchParams.focus, SIDEBAR_ITEM_HEIGHT]);

  return (
    <div
      className="overflow-y-auto"
      ref={listScrollContainerRef}
      onScroll={onScroll}
    >
      <div
        className="mt-[2px]"
        style={{
          ...outerContainerStyle,
        }}
      >
        <ul
          className={cn(
            contentType === 'note' && 'pl-1 pr-2',
            contentType === 'folder' && 'pl-[3px] pr-[3px]'
          )}
          style={{
            ...innerContainerStyle,
          }}
        >
          <SidebarItems
            layoutId={layoutId}
            allData={data}
            visibleData={visibleItems}
            accessor={accessor}
            renderLink={renderLink}
            getContextMenuStyle={getContextMenuStyle}
            hoveredItem={hoveredItem}
            setHoveredItem={setHoveredItem}
            ref={anchorSelectionIndex}
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
