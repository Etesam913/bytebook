import type { ListRange } from 'react-virtuoso';
import { FileTreeItem } from '../file-tree-item';
import {
  CREATE_FOLDER_TYPE,
  LOAD_MORE_TYPE,
  type VirtualizedFileTreeItem,
} from '../types';
import { isTreeNodeAFolder } from '../utils/file-tree-utils';
import { fileTreeDataAtom } from '../../../../atoms';
import { useAtomValue } from 'jotai';
import { cn } from '../../../../utils/string-formatting';

export function StickyHeader({
  flattenedTopLevelData,
  visibleRange,
}: {
  flattenedTopLevelData: VirtualizedFileTreeItem[];
  visibleRange: ListRange;
}) {
  const { treeData: fileOrFolderMap } = useAtomValue(fileTreeDataAtom);
  const visibleFlatStartIndex = visibleRange.startIndex;
  const visibleFlatEndIndex = Math.min(
    flattenedTopLevelData.length - 1,
    visibleRange.endIndex
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
        if (!parentItem || !isTreeNodeAFolder(parentItem)) break;

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
        (item) => item.id === stickyId && isTreeNodeAFolder(item)
      );
      return stickyItem ?? null;
    })
    .filter((item): item is VirtualizedFileTreeItem => item !== null);

  return (
    <header
      className={cn(
        'absolute top-0 left-0 right-0 z-10 bg-zinc-50 dark:bg-zinc-800 py-1',
        stickyItems.length > 0 &&
          'border-b border-zinc-200 dark:border-zinc-700'
      )}
    >
      {stickyItems.map((stickyItem) => (
        <div key={stickyItem.id} className="overflow-hidden px-2">
          <FileTreeItem dataItem={stickyItem} />
        </div>
      ))}
    </header>
  );
}
