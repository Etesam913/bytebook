import { useAtom } from 'jotai';
import { type RefObject, useRef, useState } from 'react';
import { Virtuoso, type ListRange, type VirtuosoHandle } from 'react-virtuoso';
import { useTopLevelFileOrFolders } from './hooks/top-level';
import { FileTreeItem } from './file-tree-item';
import { type VirtualizedFileTreeItem } from './types';
import { sidebarSelectionAtom } from '../../../atoms';
import { useOnClickOutside } from '../../../hooks/general';
import {
  handleFileTreeItemClickCapture,
  handleFileTreeKeyDown,
} from './utils/file-tree-navigation';
import { useRoutePathFocus } from './hooks/use-route-path-focus';
import { StickyHeader } from './sticky-header';
import { shouldHandleOutsideSelectionInteraction } from '../../../utils/mouse';
import { useFileTreeContentDrop } from './hooks/use-file-tree-content-drop';

const INITIAL_VISIBLE_RANGE: ListRange = { startIndex: 0, endIndex: -1 };

export function VirtualizedFileTree({
  scrollContainerRef,
}: {
  scrollContainerRef?: RefObject<HTMLElement | null>;
}) {
  const internalListRef = useRef<HTMLElement | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [visibleRange, setVisibleRange] = useState(INITIAL_VISIBLE_RANGE);
  const [sidebarSelection, setSidebarSelection] = useAtom(sidebarSelectionAtom);

  // This only runs on component mount and when a top level folder or note is received in the folder:create or note:create events
  const { topLevelFolderOrFilesQuery, virtualizedData } =
    useTopLevelFileOrFolders();
  const { isSuccess } = topLevelFolderOrFilesQuery;

  useRoutePathFocus({ visibleRange, virtualizedData, virtuosoRef, isSuccess });
  useFileTreeContentDrop();
  // Clear selection when clicking outside the file tree (unless it's a context menu click)
  useOnClickOutside(
    internalListRef,
    (event) => {
      if (
        !shouldHandleOutsideSelectionInteraction(event) ||
        sidebarSelection.selections.size === 0
      )
        return;

      setSidebarSelection((prev) => ({
        ...prev,
        selections: new Set([]),
        anchorSelection: null,
      }));
    },
    []
  );

  /**
   * Renders a row wrapper used by tree navigation and delegates row content.
   */
  function renderItem(index: number, dataItem: VirtualizedFileTreeItem) {
    return (
      <div
        className="w-full px-2"
        data-file-tree-index={index}
        onClickCapture={(e) => {
          handleFileTreeItemClickCapture(
            {
              virtualizedData,
              internalListRef,
              virtuosoRef,
            },
            e
          );
        }}
      >
        <FileTreeItem dataItem={dataItem} />
      </div>
    );
  }

  return (
    <div
      id="file-tree"
      className="flex flex-1 flex-col min-h-0 overflow-hidden text-sm"
      onKeyDown={(event) => {
        handleFileTreeKeyDown(
          {
            virtualizedData,
            internalListRef,
            virtuosoRef,
          },
          event
        );
      }}
    >
      <StickyHeader
        flattenedTopLevelData={virtualizedData}
        visibleRange={visibleRange}
      />
      <Virtuoso
        ref={virtuosoRef}
        data={virtualizedData}
        rangeChanged={(range) => {
          setVisibleRange((previousRange) =>
            previousRange.startIndex === range.startIndex &&
            previousRange.endIndex === range.endIndex
              ? previousRange
              : range
          );
        }}
        scrollerRef={(node) => {
          const element = node instanceof HTMLElement ? node : null;
          internalListRef.current = element;
          if (scrollContainerRef) {
            scrollContainerRef.current = element;
          }
        }}
        overscan={20}
        computeItemKey={(_, item) => item.id}
        style={{
          overscrollBehavior: 'none',
          height: 0,
          flexGrow: 1,
        }}
        totalListHeightChanged={() => {}}
        itemContent={renderItem}
      />
    </div>
  );
}
