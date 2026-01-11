import { atom, useAtomValue } from 'jotai';
import { Virtuoso } from 'react-virtuoso';
import { useTopLevelFileOrFolders } from './hooks';
import { FileTreeItem } from './file-tree-item';
import { useAnimatedHeight } from '../hooks';
import { transformFileTreeForVirtualizedList } from './utils';
import { FileOrFolder } from './types';
import { useState } from 'react';

export const fileOrFolderMapAtom = atom(new Map<string, FileOrFolder>());

const FILE_TREE_MAX_HEIGHT = '65vh';

export function VirtualizedFileTree({ isOpen }: { isOpen: boolean }) {
  const fileOrFolderMap = useAtomValue(fileOrFolderMapAtom);
  const [hoveredItemRailPath, setHoveredItemRailPath] = useState<string>('');

  // This only runs once on component mount
  const { data: topLevelFileOrFolders } = useTopLevelFileOrFolders();
  const flattenedTopLevelData = transformFileTreeForVirtualizedList(
    topLevelFileOrFolders ?? [],
    fileOrFolderMap
  );

  const { scope, isReady, handleHeightChange, totalHeight } = useAnimatedHeight(
    {
      isOpen,
      maxHeight: FILE_TREE_MAX_HEIGHT,
    }
  );

  console.log({
    flattenedData: flattenedTopLevelData,
  });

  return (
    <div
      ref={scope}
      style={{ visibility: isReady ? 'visible' : 'hidden' }}
      className="overflow-hidden scrollbar-hidden"
    >
      <Virtuoso
        data={flattenedTopLevelData}
        className="scrollbar-hidden"
        style={{
          overscrollBehavior: 'none',
          height: !FILE_TREE_MAX_HEIGHT
            ? '100%'
            : totalHeight === null
              ? FILE_TREE_MAX_HEIGHT
              : `min(${FILE_TREE_MAX_HEIGHT}, ${totalHeight}px)`,
        }}
        totalListHeightChanged={handleHeightChange}
        itemContent={(_, dataItem) => (
          <FileTreeItem
            dataItem={dataItem}
            setHoveredItemRailPath={setHoveredItemRailPath}
            hoveredItemRailPath={hoveredItemRailPath}
          />
        )}
      />
    </div>
  );
}
