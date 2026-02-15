import { useAtomValue, useSetAtom } from 'jotai';
import { useRef } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { useTopLevelFileOrFolders } from './hooks/top-level';
import { FileTreeItem } from './file-tree-item';
import { useAnimatedHeight } from '../hooks';
import { transformFileTreeForVirtualizedList } from './utils/file-tree-utils';
import {
  CREATE_FOLDER_TYPE,
  type CreateFolderItem,
  FileOrFolder,
  type VirtualizedFileTreeItem,
} from './types';
import { atomWithLogging, sidebarSelectionAtom } from '../../../atoms';
import { useOnClickOutside } from '../../../hooks/general';
import {
  handleFileTreeItemClickCapture,
  handleFileTreeKeyDown,
} from './utils/file-tree-navigation';
import { useRoutePathFocus } from './hooks/use-route-path-focus';

export type FileTreeData = {
  treeData: Map<string, FileOrFolder>;
  filePathToTreeDataId: Map<string, string>;
};

export const fileTreeDataAtom = atomWithLogging<FileTreeData>(
  'fileTreeDataAtom',
  {
    treeData: new Map<string, FileOrFolder>(),
    filePathToTreeDataId: new Map<string, string>(),
  }
);

const FILE_TREE_MAX_HEIGHT = '65vh';
const INITIAL_VISIBLE_RANGE = { startIndex: 0, endIndex: -1 };
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
  const visibleElementsRef = useRef(INITIAL_VISIBLE_RANGE);
  const setSidebarSelection = useSetAtom(sidebarSelectionAtom);

  // This only runs on component mount and when folder/note events are received
  const { data: topLevelFileOrFolders } = useTopLevelFileOrFolders();
  const flattenedTopLevelData = transformFileTreeForVirtualizedList(
    topLevelFileOrFolders ?? [],
    fileOrFolderMap
  );
  const virtualizedData = [CREATE_FOLDER_ITEM, ...flattenedTopLevelData];

  const { scope, isReady, handleHeightChange, totalHeight } = useAnimatedHeight(
    {
      isOpen,
      maxHeight: FILE_TREE_MAX_HEIGHT,
    }
  );

  // Clear selection when clicking outside the file tree (unless it's a context menu click)
  useOnClickOutside(internalListRef, () => {
    setSidebarSelection((prev) => ({
      ...prev,
      selections: new Set([]),
      anchorSelection: null,
    }));
  }, []);

  function handleScrollerRef(node: HTMLElement | Window | null) {
    const element = node instanceof HTMLElement ? node : null;
    internalListRef.current = element;
  }

  useRoutePathFocus({ visibleElementsRef, virtualizedData, virtuosoRef });

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
      <Virtuoso
        ref={virtuosoRef}
        data={virtualizedData}
        rangeChanged={(range) => (visibleElementsRef.current = range)}
        className="scrollbar-hidden"
        scrollerRef={handleScrollerRef}
        overscan={1000}
        computeItemKey={(_, item) => item.id}
        style={{
          overscrollBehavior: 'none',
          height:
            totalHeight === null
              ? FILE_TREE_MAX_HEIGHT
              : `min(${FILE_TREE_MAX_HEIGHT}, ${totalHeight}px)`,
        }}
        totalListHeightChanged={handleHeightChange}
        itemContent={renderItem}
      />
    </div>
  );
}
