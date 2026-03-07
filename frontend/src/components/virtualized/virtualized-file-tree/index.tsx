import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { Virtuoso, type ListRange, type VirtuosoHandle } from 'react-virtuoso';
import { useTopLevelFileOrFolders } from './hooks/top-level';
import { FileTreeItem } from './file-tree-item';
import { useAnimatedHeight } from '../hooks';
import { transformFileTreeForVirtualizedList } from './utils/file-tree-utils';
import {
  CREATE_FOLDER_TYPE,
  type CreateFolderItem,
  type VirtualizedFileTreeItem,
} from './types';
import { sidebarSelectionAtom } from '../../../atoms';
import { fileTreeDataAtom } from '../../../atoms';
import { useOnClickOutside } from '../../../hooks/general';
import {
  handleFileTreeItemClickCapture,
  handleFileTreeKeyDown,
} from './utils/file-tree-navigation';
import { useRoutePathFocus } from './hooks/use-route-path-focus';
import { StickyHeader } from './sticky-header';
import { shouldHandleOutsideSelectionInteraction } from '../../../utils/mouse';
import { useFileTreeContentDrop } from './hooks/use-file-tree-content-drop';
import { usePreventOverscroll } from './hooks/use-prevent-overscroll';

const FILE_TREE_MAX_HEIGHT = '65vh';
const INITIAL_VISIBLE_RANGE: ListRange = { startIndex: 0, endIndex: -1 };
const CREATE_FOLDER_ITEM: CreateFolderItem = {
  id: 'create-folder',
  type: CREATE_FOLDER_TYPE,
  level: 0,
};

export function VirtualizedFileTree({ isOpen }: { isOpen: boolean }) {
  const fileTreeData = useAtomValue(fileTreeDataAtom);
  const { treeData: fileOrFolderMap } = fileTreeData;
  const internalListRef = useRef<HTMLElement | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [visibleRange, setVisibleRange] = useState(INITIAL_VISIBLE_RANGE);
  const [stickyContentHeight, setStickyContentHeight] = useState(0);
  const [listHeight, setListHeight] = useState<number | null>(null);
  const setSidebarSelection = useSetAtom(sidebarSelectionAtom);
  useFileTreeContentDrop();

  // This only runs on component mount and when folder/note events are received
  const { data: topLevelFileOrFolders } = useTopLevelFileOrFolders();
  const flattenedTopLevelData = transformFileTreeForVirtualizedList(
    topLevelFileOrFolders ?? [],
    fileOrFolderMap
  );
  const virtualizedData = [CREATE_FOLDER_ITEM, ...flattenedTopLevelData];

  const { scope, isReady, handleHeightChange } = useAnimatedHeight({
    isOpen,
    maxHeight: FILE_TREE_MAX_HEIGHT,
  });

  useEffect(() => {
    if (listHeight === null) return;
    handleHeightChange(listHeight + stickyContentHeight);
  }, [listHeight, stickyContentHeight, handleHeightChange]);

  // Clear selection when clicking outside the file tree (unless it's a context menu click)
  useOnClickOutside(
    internalListRef,
    (event) => {
      if (!shouldHandleOutsideSelectionInteraction(event)) return;

      setSidebarSelection((prev) => ({
        ...prev,
        selections: new Set([]),
        anchorSelection: null,
      }));
    },
    []
  );

  function handleScrollerRef(node: HTMLElement | Window | null) {
    const element = node instanceof HTMLElement ? node : null;
    internalListRef.current = element;
  }

  useRoutePathFocus({ visibleRange, virtualizedData, virtuosoRef });
  usePreventOverscroll({
    internalListRef,
    listHeight: listHeight ?? 0,
    stickyContentHeight,
  });

  /**
   * Renders a row wrapper used by tree navigation and delegates row content.
   */
  function renderItem(index: number, dataItem: VirtualizedFileTreeItem) {
    return (
      <div
        className="contents"
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
        flattenedTopLevelData={flattenedTopLevelData}
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
        scrollerRef={handleScrollerRef}
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
