import { useEffect } from 'react';
import type { ListRange } from 'react-virtuoso';
import { FileTreeItem } from '../file-tree-item';
import {
  CREATE_FOLDER_TYPE,
  FOLDER_TYPE,
  LOAD_MORE_TYPE,
  type FileOrFolder,
  type VirtualizedFileTreeItem,
} from '../types';

const STICKY_ELEMENT_HEIGHT = 28;

export function StickyHeader({
  flattenedTopLevelData,
  fileOrFolderMap,
  visibleRange,
  onStickyContentHeightChange,
}: {
  flattenedTopLevelData: VirtualizedFileTreeItem[];
  fileOrFolderMap: Map<string, FileOrFolder>;
  visibleRange: ListRange;
  onStickyContentHeightChange: (height: number) => void;
}) {
  const visibleFlatStartIndex = Math.max(0, visibleRange.startIndex - 1);
  const visibleFlatEndIndex = Math.min(
    flattenedTopLevelData.length - 1,
    visibleRange.endIndex - 1
  );

  let stickyElements: string[] = [];

  if (
    flattenedTopLevelData.length !== 0 &&
    visibleFlatStartIndex <= visibleFlatEndIndex
  ) {
    const visibleItems = flattenedTopLevelData.slice(
      visibleFlatStartIndex,
      visibleFlatEndIndex + 1
    );

    const visibleItemIds = new Set(visibleItems.map((item) => item.id));
    const nextStickyElementIds = new Set<string>();

    for (const visibleItem of visibleItems) {
      if (
        visibleItem.type === CREATE_FOLDER_TYPE ||
        visibleItem.type === LOAD_MORE_TYPE
      ) {
        continue;
      }

      let currentParentId = visibleItem.parentId;
      while (currentParentId) {
        const parentItem = fileOrFolderMap.get(currentParentId);
        if (!parentItem || parentItem.type !== FOLDER_TYPE) break;

        if (parentItem.isOpen && !visibleItemIds.has(parentItem.id)) {
          nextStickyElementIds.add(parentItem.id);
        }

        currentParentId = parentItem.parentId;
      }
    }

    stickyElements = Array.from(nextStickyElementIds).reverse();
  }

  const stickyItems = stickyElements
    .map((stickyId) => {
      const stickyItem = flattenedTopLevelData.find(
        (item) => item.id === stickyId && item.type === FOLDER_TYPE
      );
      return stickyItem ?? null;
    })
    .filter((item): item is VirtualizedFileTreeItem => item !== null);

  useEffect(() => {
    onStickyContentHeightChange(stickyItems.length * STICKY_ELEMENT_HEIGHT);
  }, [onStickyContentHeightChange, stickyItems.length]);

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-700">
      {stickyItems.map((stickyItem) => (
        <div
          key={stickyItem.id}
          style={{ height: `${STICKY_ELEMENT_HEIGHT}px` }}
          className="overflow-hidden"
        >
          <FileTreeItem dataItem={stickyItem} />
        </div>
      ))}
    </header>
  );
}
