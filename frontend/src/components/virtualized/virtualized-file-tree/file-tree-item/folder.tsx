import { useSetAtom } from 'jotai';
import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Folder } from '../../../../icons/folder';
import { FolderOpen } from '../../../../icons/folder-open';
import { SidebarHighlight } from '../../virtualized-list/highlight';
import { BYTEBOOK_DRAG_DATA_FORMAT } from '../../../../utils/draggable';
import { cn } from '../../../../utils/string-formatting';
import type { FlattenedFileOrFolder } from '../types';
import { fileOrFolderMapAtom } from '..';

type OpenFolderArgs = {
  pathToFolder: string;
  folderId: string;
  isLoadMore?: boolean;
};

type FileTreeFolderItemProps = {
  dataItem: FlattenedFileOrFolder;
  openFolder: (args: OpenFolderArgs) => void;
};

export function FileTreeFolderItem({
  dataItem,
  openFolder,
}: FileTreeFolderItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const setFileOrFolderMap = useSetAtom(fileOrFolderMapAtom);

  return (
    <button
      draggable
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(e.dataTransfer.getData(BYTEBOOK_DRAG_DATA_FORMAT));
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (dataItem.type !== 'folder') {
          return;
        }

        if (!dataItem.isOpen) {
          openFolder({
            pathToFolder: dataItem.path,
            folderId: dataItem.id,
          });
        } else {
          setFileOrFolderMap((prev) => {
            const newMap = new Map(prev);
            newMap.set(dataItem.id, { ...dataItem, isOpen: false });
            return newMap;
          });
        }
      }}
      className={cn('flex items-center w-full relative rounded-md py-0.25')}
    >
      <AnimatePresence>
        {isHovered && (
          <SidebarHighlight
            layoutId={'file-tree-item-highlight'}
            className="w-[calc(100%-15px)] ml-3.75"
          />
        )}
      </AnimatePresence>
      <span className="rounded-md flex items-center gap-2 z-10 py-1 px-2 ml-3.75 overflow-hidden w-full">
        {dataItem.type === 'folder' && dataItem.isOpen ? (
          <FolderOpen
            className="min-w-4 min-h-4 will-change-transform"
            height={16}
            width={16}
            strokeWidth={1.75}
          />
        ) : (
          <Folder
            className="min-w-4 min-h-4 will-change-transform"
            height={16}
            width={16}
            strokeWidth={1.75}
          />
        )}
        <span className="truncate">{dataItem.name}</span>
      </span>
    </button>
  );
}
