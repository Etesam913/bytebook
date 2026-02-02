import { useAtomValue, useSetAtom } from 'jotai';
import { useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useTopLevelFileOrFolders } from './hooks';
import { FileTreeItem } from './file-tree-item';
import { useAnimatedHeight } from '../hooks';
import { transformFileTreeForVirtualizedList } from './utils/file-tree-utils';
import {
  CREATE_FOLDER_TYPE,
  type CreateFolderItem,
  FileOrFolder,
} from './types';
import { atomWithLogging } from '../../../atoms';
import { useOnClickOutside } from '../../../hooks/general';
import { sidebarSelectionAtom } from '../../../hooks/selection';

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

export function VirtualizedFileTree({ isOpen }: { isOpen: boolean }) {
  const { treeData: fileOrFolderMap } = useAtomValue(fileTreeDataAtom);
  const internalListRef = useRef<HTMLElement | null>(null);
  const setSidebarSelection = useSetAtom(sidebarSelectionAtom);

  // This only runs on component mount and when folder/note events are received
  const { data: topLevelFileOrFolders } = useTopLevelFileOrFolders();
  const flattenedTopLevelData = transformFileTreeForVirtualizedList(
    topLevelFileOrFolders ?? [],
    fileOrFolderMap
  );
  const createFolderItem: CreateFolderItem = {
    id: 'create-folder',
    type: CREATE_FOLDER_TYPE,
    level: 0,
  };
  const virtualizedData = [createFolderItem, ...flattenedTopLevelData];

  const { scope, isReady, handleHeightChange, totalHeight } = useAnimatedHeight(
    {
      isOpen,
      maxHeight: FILE_TREE_MAX_HEIGHT,
    }
  );

  // Clear selection when clicking outside the file tree (unless it's a context menu click)
  useOnClickOutside(internalListRef, () => {
    setSidebarSelection({
      selections: new Set([]),
      anchorSelection: null,
    });
  }, []);

  const handleScrollerRef = (node: HTMLElement | Window | null) => {
    const element = node instanceof HTMLElement ? node : null;
    internalListRef.current = element;
  };

  console.log({ totalHeight });
  return (
    <div
      ref={scope}
      style={{ visibility: isReady ? 'visible' : 'hidden' }}
      className="overflow-hidden scrollbar-hidden pl-2 text-sm"
    >
      <Virtuoso
        data={virtualizedData}
        className="scrollbar-hidden"
        scrollerRef={handleScrollerRef}
        style={{
          overscrollBehavior: 'auto',
          height:
            totalHeight === null
              ? FILE_TREE_MAX_HEIGHT
              : `min(${FILE_TREE_MAX_HEIGHT}, ${totalHeight}px)`,
        }}
        totalListHeightChanged={handleHeightChange}
        itemContent={(_, dataItem) => <FileTreeItem dataItem={dataItem} />}
      />
    </div>
  );
}
