import { useAtom } from 'jotai';
import { type MouseEvent, type RefObject, useRef, useState } from 'react';
import { motion } from 'motion/react';
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
import { useExternalFileTreeDrag } from './hooks/use-external-file-tree-drag';
import { useFileTreeContentDrop } from './hooks/use-file-tree-content-drop';
import { usePreventBoundaryOverscrollFlicker } from '../virtualized-list/hooks';
import {
  isFileTreeBlankAreaClickTarget,
  getFolderOpenAnimationRows,
  OPENED_FOLDER_ROW_ANIMATION_DURATION,
  OPENED_FOLDER_ROW_STAGGER,
  OPENED_FOLDER_ROW_MAX_STAGGERED_ROWS,
} from './utils/file-tree-utils';
import { useFolderOpenAnimationParentIds } from './hooks/use-folder-open-animation';
import { easingFunctions } from '../../../animations';

const INITIAL_VISIBLE_RANGE: ListRange = { startIndex: 0, endIndex: -1 };

export function VirtualizedFileTree({
  ref,
}: {
  ref: RefObject<HTMLElement | null>;
}) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [visibleRange, setVisibleRange] = useState(INITIAL_VISIBLE_RANGE);
  const [sidebarSelection, setSidebarSelection] = useAtom(sidebarSelectionAtom);
  const folderOpenAnimationParentIds = useFolderOpenAnimationParentIds();

  // This only runs on component mount and when a top level folder or file is received in the folder:create or file:create events
  const { topLevelFolderOrFilesQuery, virtualizedData } =
    useTopLevelFileOrFolders();
  const { isSuccess } = topLevelFolderOrFilesQuery;
  const folderOpenAnimationRows = getFolderOpenAnimationRows({
    currentData: virtualizedData,
    parentFolderIds: folderOpenAnimationParentIds,
  });

  useRoutePathFocus({ visibleRange, virtualizedData, virtuosoRef, isSuccess });
  useFileTreeContentDrop();
  useExternalFileTreeDrag();
  usePreventBoundaryOverscrollFlicker({ scrollElementRef: ref });

  function clearSidebarSelection() {
    setSidebarSelection((prev) => ({
      ...prev,
      selections: new Set([]),
      anchorSelection: null,
    }));
  }

  // Clear selection when clicking outside the file tree (unless it's a context menu click)
  useOnClickOutside(
    ref,
    (event) => {
      if (
        !shouldHandleOutsideSelectionInteraction(event) ||
        sidebarSelection.selections.size === 0
      )
        return;

      clearSidebarSelection();
    },
    []
  );

  function handleFileTreeBlankAreaMouseDownCapture(event: MouseEvent) {
    if (
      !shouldHandleOutsideSelectionInteraction(event.nativeEvent) ||
      sidebarSelection.selections.size === 0 ||
      !isFileTreeBlankAreaClickTarget(event.target)
    ) {
      return;
    }

    clearSidebarSelection();
  }

  /**
   * Renders a row wrapper used by tree navigation and delegates row content.
   */
  function renderItem(index: number, dataItem: VirtualizedFileTreeItem) {
    const openAnimationIndex = folderOpenAnimationRows.get(dataItem.id);
    const shouldAnimateFolderOpen = openAnimationIndex !== undefined;

    return (
      <motion.div
        key={dataItem.id}
        className="w-full px-2"
        data-file-tree-index={index}
        initial={shouldAnimateFolderOpen ? { opacity: 0, y: -3 } : false}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: OPENED_FOLDER_ROW_ANIMATION_DURATION,
          delay: 0.1,
        }}
        onClickCapture={(e) => {
          handleFileTreeItemClickCapture(
            {
              virtualizedData,
              internalListRef: ref,
              virtuosoRef,
            },
            e
          );
        }}
      >
        <FileTreeItem dataItem={dataItem} virtualizedData={virtualizedData} />
      </motion.div>
    );
  }

  return (
    <div
      id="file-tree"
      role="tree"
      aria-label="File tree"
      className="relative flex flex-1 flex-col min-h-0 overflow-hidden text-sm"
      onMouseDownCapture={handleFileTreeBlankAreaMouseDownCapture}
      onKeyDown={(event) => {
        handleFileTreeKeyDown(
          {
            virtualizedData,
            internalListRef: ref,
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
          if (ref) {
            ref.current = element;
          }
        }}
        overscan={20}
        computeItemKey={(_, item) => item.id}
        style={{
          height: 0,
          flexGrow: 1,
        }}
        totalListHeightChanged={() => { }}
        itemContent={renderItem}
      />
    </div>
  );
}
