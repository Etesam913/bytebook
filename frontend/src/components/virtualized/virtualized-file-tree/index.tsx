import { useAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { Virtuoso, type ListRange, type VirtuosoHandle } from 'react-virtuoso';
import { useTopLevelFileOrFolders } from './hooks/top-level';
import { FileTreeItem } from './file-tree-item';
import { useAnimatedHeight } from '../hooks';
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

const FILE_TREE_MAX_HEIGHT = '65vh';
const INITIAL_VISIBLE_RANGE: ListRange = { startIndex: 0, endIndex: -1 };

export function VirtualizedFileTree({ isOpen }: { isOpen: boolean }) {
  const internalListRef = useRef<HTMLElement | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [visibleRange, setVisibleRange] = useState(INITIAL_VISIBLE_RANGE);
  const [stickyContentHeight, setStickyContentHeight] = useState(0);
  const [listHeight, setListHeight] = useState<number | null>(null);
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

  // Animated height related hooks
  const { scope, isReady, handleHeightChange } = useAnimatedHeight({
    isOpen,
    maxHeight: FILE_TREE_MAX_HEIGHT,
  });
  useEffect(() => {
    if (listHeight === null) return;
    handleHeightChange(listHeight + stickyContentHeight);
  }, [listHeight, stickyContentHeight, handleHeightChange]);

  /**
   * Renders a row wrapper used by tree navigation and delegates row content.
   */
  function renderItem(index: number, dataItem: VirtualizedFileTreeItem) {
    return (
      <div
        className="w-full"
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
      ref={scope}
      style={{ visibility: isReady ? 'visible' : 'hidden' }}
      className="overflow-hidden scrollbar-hidden pl-2 text-sm"
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
        onStickyContentHeightChange={setStickyContentHeight}
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
        className="scrollbar-hidden"
        scrollerRef={(node) => {
          const element = node instanceof HTMLElement ? node : null;
          internalListRef.current = element;
        }}
        overscan={20}
        computeItemKey={(_, item) => item.id}
        style={{
          overscrollBehavior: 'none',
          // Reserve space for sticky content above the list.
          maxHeight: `max(0px, calc(${FILE_TREE_MAX_HEIGHT} - ${stickyContentHeight}px))`,
          height:
            listHeight === null
              ? `max(0px, calc(${FILE_TREE_MAX_HEIGHT} - ${stickyContentHeight}px))`
              : `min(max(0px, calc(${FILE_TREE_MAX_HEIGHT} - ${stickyContentHeight}px)), ${listHeight}px)`,
        }}
        totalListHeightChanged={(height) => {
          setListHeight(height);
          handleHeightChange(height + stickyContentHeight);
        }}
        itemContent={renderItem}
      />
    </div>
  );
}
