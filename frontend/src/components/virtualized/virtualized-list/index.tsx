import { useAtom } from 'jotai/react';
import {
  type HTMLAttributes,
  type RefObject,
  type ReactNode,
  useRef,
} from 'react';
import { Components, Virtuoso } from 'react-virtuoso';
import { sidebarSelectionAtom } from '@/atoms';
import { useInteractOutside } from 'react-aria';
import { cn } from '@utils/string-formatting';
import type { SetSelectionUpdater } from '@utils/selection';
import { VirtualizedListItem } from './virtualized-list-item';
import { SidebarContentType } from '@/types';
import { usePreventBoundaryOverscrollFlicker } from './hooks';
import { isRegularMouseClick } from '@utils/mouse';

export type SelectionOptions<T> =
  | { disableSelection: true }
  | {
      disableSelection?: false;
      dataItemToSelectionRangeEntry: (item: T) => string;
    };

function createListComponent() {
  function ListComponent({
    className,
    ref,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & {
    ref?: React.Ref<HTMLDivElement>;
  }) {
    return <div {...rest} ref={ref} className={cn('mt-[2px]', className)} />;
  }
  ListComponent.displayName = 'SidebarVirtuosoList';
  return ListComponent;
}

export type VirtualizedListProps<T> = {
  data: T[] | null;
  dataItemToKey: (item: T) => string;
  selectionOptions: SelectionOptions<T>;
  renderItem: (data: { dataItem: T; i: number }) => ReactNode;
  contentType: SidebarContentType;
  scrollContainerRef?: RefObject<HTMLElement | null>;
};

export function VirtualizedList<T>({
  data,
  dataItemToKey,
  selectionOptions,
  renderItem,
  contentType,
  scrollContainerRef,
}: VirtualizedListProps<T>) {
  const internalListRef = useRef<HTMLElement | null>(null);
  const [sidebarSelection, setSidebarSelection] = useAtom(sidebarSelectionAtom);
  const selectionRange = sidebarSelection.selections;
  const setSelectionRange: SetSelectionUpdater = (updater) => {
    setSidebarSelection((prev) => ({
      ...prev,
      selections: updater(prev.selections),
    }));
  };
  usePreventBoundaryOverscrollFlicker({ scrollElementRef: internalListRef });

  useInteractOutside({
    ref: internalListRef,
    onInteractOutside: (e) => {
      if (!isRegularMouseClick(e)) return;

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
  });

  const items = data ?? [];
  const ListComponent = createListComponent();

  const components: Components<T, HTMLDivElement> = {
    List: ListComponent,
  };

  const renderSidebarItem = (index: number, dataItem: T) => {
    const node = renderItem({
      dataItem,
      i: index,
    });

    return (
      <VirtualizedListItem
        key={dataItemToKey(dataItem)}
        dataItem={dataItem}
        allData={items}
        index={index}
        selectionOptions={selectionOptions}
        contentType={contentType}
      >
        {node}
      </VirtualizedListItem>
    );
  };

  return (
    <Virtuoso
      data={items}
      style={{ height: 0, flexGrow: 1 }}
      scrollerRef={(node) => {
        const element = node instanceof HTMLElement ? node : null;
        internalListRef.current = element;
        if (scrollContainerRef) {
          scrollContainerRef.current = element;
        }
      }}
      components={components}
      totalCount={items.length}
      computeItemKey={(_, dataItem) => dataItemToKey(dataItem)}
      itemContent={(index, dataItem) => renderSidebarItem(index, dataItem)}
    />
  );
}
