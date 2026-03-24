import { useAtom, useAtomValue } from 'jotai/react';
import {
  type CSSProperties,
  type HTMLAttributes,
  type RefObject,
  type ReactNode,
  forwardRef,
  useRef,
  useState,
} from 'react';
import { Components, Virtuoso } from 'react-virtuoso';
import { contextMenuRefAtom, sidebarSelectionAtom } from '../../../atoms';
import { useOnClickOutside } from '../../../hooks/general';
import { cn } from '../../../utils/string-formatting';
import type { SetSelectionUpdater } from '../../../utils/selection';
import { VirtualizedListItem } from './virtualized-list-item';
import { SidebarContentType } from '../../../types';
import { useSmartScroll } from './hooks';
import { shouldHandleOutsideSelectionInteraction } from '../../../utils/mouse';

export type SelectionOptions<T> =
  | { disableSelection: true }
  | {
      disableSelection?: false;
      dataItemToSelectionRangeEntry: (item: T) => string;
    };

function createListComponent() {
  const ListComponent = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
  >(({ className, ...rest }, ref) => (
    <div {...rest} ref={ref} className={cn('mt-[2px]', className)} />
  ));
  ListComponent.displayName = 'SidebarVirtuosoList';
  return ListComponent;
}

export type VirtualizedListProps<T> = {
  data: T[] | null;
  dataItemToString: (item: T) => string;
  dataItemToKey: (item: T) => string;
  selectionOptions: SelectionOptions<T>;
  getContextMenuStyle?: (dataItem: T) => CSSProperties;
  renderItem: (data: {
    dataItem: T;
    i: number;
    selectionRange: Set<string>;
    setSelectionRange: SetSelectionUpdater;
  }) => ReactNode;
  emptyElement?: ReactNode;
  layoutId: string;
  contentType: SidebarContentType;
  isItemActive?: (item: T, index: number) => boolean;
  maxHeight?: string;
  className?: string;
  onTotalListHeightChanged?: (height: number) => void;
  /** Callback when bottom of list is reached (for pagination) */
  endReached?: () => void;
  /** Callback when top of list is reached (for reverse pagination) */
  startReached?: () => void;
  /** Initial item index to scroll to */
  initialTopMostItemIndex?: number;
  /**
   * Used for prepending items. Set to the number of items before the first rendered item.
   * When prepending, decrease this value by the number of prepended items.
   */
  firstItemIndex?: number;
  scrollContainerRef?: RefObject<HTMLElement | null>;
};

export function VirtualizedList<T>({
  data,
  dataItemToString,
  dataItemToKey,
  selectionOptions,
  getContextMenuStyle,
  renderItem,
  emptyElement,
  layoutId,
  contentType,
  maxHeight,
  className,
  onTotalListHeightChanged,
  endReached,
  startReached,
  initialTopMostItemIndex,
  firstItemIndex,
  scrollContainerRef,
}: VirtualizedListProps<T>) {
  // Start with null to indicate height hasn't been measured yet
  const [listHeight, setListHeight] = useState<number | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const internalListRef = useRef<HTMLElement | null>(null);
  /*
	  If the activeNoteItem is set, then the note was navigated via a note link or the searchbar
		We need to change the scroll position to the sidebar so that the active note is visible
	*/
  const [sidebarSelection, setSidebarSelection] = useAtom(sidebarSelectionAtom);
  const selectionRange = sidebarSelection.selections;
  const setSelectionRange: SetSelectionUpdater = (updater) => {
    setSidebarSelection((prev) => ({
      ...prev,
      selections: updater(prev.selections),
    }));
  };
  const contextMenuRef = useAtomValue(contextMenuRefAtom);
  const { virtuosoRef, onRangeChanged } = useSmartScroll();

  useOnClickOutside(
    internalListRef,
    (e) => {
      if (!shouldHandleOutsideSelectionInteraction(e)) return;

      // We need to use the selectionRange for the context menu so early return for this case
      if (contextMenuRef?.current?.contains(e.target as Node)) return;

      // Check if the click is on a sidebar item button (including nested children like SVGs)
      const target = e.target as HTMLElement;
      const clickedButton = target.closest('button');
      const isSidebarItemClick =
        clickedButton?.classList.contains('list-sidebar-item');

      if (isSidebarItemClick) {
        return;
      }

      if (selectionRange.size === 0 || contentType === undefined) return;
      const selectionSetAsArray = Array.from(selectionRange);
      /*
			When a click is detected outside of the sidebar and the selection is of the same
			type as the contentType, then you can clear the selection. You do not want a
			file sidebar onClickOutside to clear the selection for a note valid click
		*/
      if (selectionSetAsArray[0].startsWith(contentType)) {
        setSelectionRange(() => new Set());
      }
    },
    []
  );

  const items = data ?? [];
  const ListComponent = createListComponent();

  const components: Components<T, HTMLDivElement> = {
    List: ListComponent,
    EmptyPlaceholder: emptyElement ? () => <>{emptyElement}</> : undefined,
  };

  const renderSidebarItem = (index: number, dataItem: T) => {
    const node = renderItem({
      dataItem,
      i: index,
      selectionRange,
      setSelectionRange,
    });

    return (
      <VirtualizedListItem
        key={dataItemToKey(dataItem)}
        dataItem={dataItem}
        allData={items}
        index={index}
        dataItemToString={dataItemToString}
        selectionOptions={selectionOptions}
        getContextMenuStyle={getContextMenuStyle}
        hoveredItem={hoveredItem}
        setHoveredItem={setHoveredItem}
        layoutId={layoutId}
        contentType={contentType}
      >
        {node}
      </VirtualizedListItem>
    );
  };

  return (
    <Virtuoso
      ref={virtuosoRef}
      rangeChanged={onRangeChanged}
      data={items}
      className={className}
      style={{
        overscrollBehavior: 'none',
        // When no maxHeight (flex mode), use height:0 + flexGrow:1 to fill parent.
        // Otherwise use maxHeight until first measurement to prevent 0-height flicker.
        ...(maxHeight
          ? {
              height:
                listHeight === null
                  ? maxHeight
                  : `min(${maxHeight}, ${listHeight}px)`,
            }
          : { height: 0, flexGrow: 1 }),
      }}
      scrollerRef={(node) => {
        const element = node instanceof HTMLElement ? node : null;
        internalListRef.current = element;
        if (scrollContainerRef) {
          scrollContainerRef.current = element;
        }
      }}
      components={components}
      totalListHeightChanged={(height) => {
        setListHeight(height);
        onTotalListHeightChanged?.(height);
      }}
      overscan={500}
      totalCount={items.length}
      computeItemKey={(_, dataItem) => dataItemToKey(dataItem)}
      itemContent={(index, dataItem) => renderSidebarItem(index, dataItem)}
      endReached={endReached}
      startReached={startReached}
      initialTopMostItemIndex={initialTopMostItemIndex ?? 0}
      firstItemIndex={firstItemIndex ?? 0}
    />
  );
}
