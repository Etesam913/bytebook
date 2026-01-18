import { useSetAtom } from 'jotai';
import { Dispatch, SetStateAction } from 'react';
import { fileOrFolderMapAtom } from '..';
import { cn } from '../../../../utils/string-formatting';
import { VirtualizedFileTreeItem } from '../types';

export function ItemRail({
  setHoveredItemRailPath,
  hoveredItemRailPath,
  dataItem,
}: {
  setHoveredItemRailPath: Dispatch<SetStateAction<string>>;
  hoveredItemRailPath: string;
  dataItem: VirtualizedFileTreeItem;
}) {
  const setFileOrFolderMap = useSetAtom(fileOrFolderMapAtom);
  const parentId = dataItem.parentId;
  if (!parentId) return null;

  // Elements with a rail should have a parentId
  const railPath = dataItem.id.split('/').slice(0, -1).join('/');

  return (
    <div className="absolute z-50">
      <button
        className="px-2 cursor-pointer"
        onMouseEnter={() => setHoveredItemRailPath(railPath)}
        onMouseLeave={() => setHoveredItemRailPath('')}
        onClick={() => {
          setFileOrFolderMap((prev) => {
            const newMap = new Map(prev);
            const parentData = newMap.get(parentId);

            // A parent should only be a folder, but !== folder is needed for type narrowing
            if (!parentData || parentData.type !== 'folder') return prev;

            newMap.set(parentId, {
              ...parentData,
              isOpen: false,
            });
            return newMap;
          });
        }}
      >
        <span
          className={cn(
            'block h-7 w-[1.5px] dark:bg-zinc-650 bg-zinc-200 rounded-md transition-colors duration-150',
            hoveredItemRailPath === railPath && 'dark:bg-zinc-500 bg-zinc-400'
          )}
        />
      </button>
    </div>
  );
}
