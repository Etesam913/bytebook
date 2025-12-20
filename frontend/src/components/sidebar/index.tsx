import { useAtom, useAtomValue } from 'jotai/react';
import {
  type Dispatch,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type SetStateAction,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Components, Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { contextMenuRefAtom, selectionRangeAtom } from '../../atoms';
import { useOnClickOutside } from '../../hooks/general';
import { cn } from '../../utils/string-formatting';
import { SidebarListItem } from './sidebar-items';
import { SidebarContentType } from '../../types';

export type SelectionOptions<T> =
  | { disableSelection: true }
  | {
      disableSelection?: false;
      dataItemToSelectionRangeEntry: (item: T) => string;
    };

function createListComponent(contentType: SidebarContentType) {
  const listPaddingClass = cn(
    contentType === 'note' && 'pl-1 pr-2',
    contentType === 'folder' && 'pl-[3px] pr-[3px]',
    contentType === 'kernel' && 'pl-[3px] pr-[3px]'
  );

  const ListComponent = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
  >(({ className, ...rest }, ref) => (
    <div
      {...rest}
      ref={ref}
      className={cn('mt-[2px]', listPaddingClass, className)}
    />
  ));
  ListComponent.displayName = 'SidebarVirtuosoList';
  return ListComponent;
}

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
  shouldHideSidebarHighlight,
  maxHeight,
  scrollToIndex,
}: {
  data: T[] | null;
  dataItemToString: (item: T) => string;
  dataItemToKey: (item: T) => string;
  selectionOptions: SelectionOptions<T>;
  getContextMenuStyle?: (dataItem: T) => CSSProperties;
  renderItem: (data: {
    dataItem: T;
    i: number;
    selectionRange: Set<string>;
    setSelectionRange: Dispatch<SetStateAction<Set<string>>>;
  }) => ReactNode;
  emptyElement?: ReactNode;
  layoutId: string;
  contentType: SidebarContentType;
  shouldHideSidebarHighlight?: boolean;
  maxHeight?: number;
  scrollToIndex?: number;
}) {
  const [listHeight, setListHeight] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const anchorSelectionIndexRef = useRef<number>(0);
  const internalListRef = useRef<HTMLElement | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  /*
	  If the activeNoteItem is set, then the note was navigated via a note link or the searchbar
		We need to change the scroll position to the sidebar so that the active note is visible
	*/
  const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
  const contextMenuRef = useAtomValue(contextMenuRefAtom);

  useOnClickOutside(
    internalListRef,
    (e) => {
      // We need to use the selectionRange for the context menu so early return for this case
      if (contextMenuRef?.current?.contains(e.target as Node)) return;

      // Check if the click is on a sidebar item button (including nested children like SVGs)
      // Sidebar item buttons have 'list-sidebar-item' or 'card-sidebar-item' class
      const target = e.target as HTMLElement;
      const clickedButton = target.closest('button');
      const isSidebarItemClick =
        clickedButton?.classList.contains('list-sidebar-item') ||
        clickedButton?.classList.contains('card-sidebar-item');

      if (isSidebarItemClick) {
        return;
      }

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
    []
  );

  const items = data ?? [];
  const ListComponent = createListComponent(contentType);

  useEffect(() => {
    if (scrollToIndex === undefined) return;
    if (scrollToIndex < 0) return;
    if (scrollToIndex >= items.length) return;
    virtuosoRef.current?.scrollToIndex({
      index: scrollToIndex,
      align: 'center',
      behavior: 'auto',
    });
  }, [scrollToIndex, items.length]);

  const components: Components<T, HTMLDivElement> = {
    List: ListComponent,
    EmptyPlaceholder: emptyElement ? () => <>{emptyElement}</> : undefined,
  };

  const handleScrollerRef = (node: HTMLElement | Window | null) => {
    const element = node instanceof HTMLElement ? node : null;
    internalListRef.current = element;
  };

  const renderSidebarItem = (index: number, dataItem: T) => {
    const node = renderItem({
      dataItem,
      i: index,
      selectionRange,
      setSelectionRange,
    });

    return (
      <SidebarListItem
        key={dataItemToKey(dataItem)}
        dataItem={dataItem}
        allData={items}
        index={index}
        dataItemToString={dataItemToString}
        selectionOptions={selectionOptions}
        getContextMenuStyle={getContextMenuStyle}
        hoveredItem={hoveredItem}
        setHoveredItem={setHoveredItem}
        anchorSelectionIndexRef={anchorSelectionIndexRef}
        layoutId={layoutId}
        contentType={contentType}
        shouldHideSidebarHighlight={shouldHideSidebarHighlight}
      >
        {node}
      </SidebarListItem>
    );
  };

  return (
    <Virtuoso
      ref={virtuosoRef}
      data={items}
      style={{ height: !maxHeight ? '100%' : Math.min(maxHeight, listHeight) }}
      className="overflow-hidden"
      scrollerRef={handleScrollerRef}
      increaseViewportBy={{ top: 400, bottom: 400 }}
      components={components}
      totalListHeightChanged={setListHeight}
      computeItemKey={(_, dataItem) => dataItemToKey(dataItem)}
      itemContent={(index, dataItem) => renderSidebarItem(index, dataItem)}
    />
  );
}
