import { SetStateAction, useSetAtom } from 'jotai';
import { Folder } from '../../../icons/folder';
import { FolderOpen } from '../../../icons/folder-open';
import { Note } from '../../../icons/page';
import { useOpenFolderMutation } from './hooks';
import { FlattenedFileOrFolder } from './types';
import { fileOrFolderMapAtom } from '.';
import { cn } from '../../../utils/string-formatting';
import { Dispatch } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { LoadingSpinner } from '../../loading-spinner';
import { motion } from 'motion/react';

function FileItemIcon({ dataItem }: { dataItem: FlattenedFileOrFolder }) {
  if (dataItem.type === 'file') {
    return (
      <Note
        className="min-w-4 min-h-4"
        height={16}
        width={16}
        strokeWidth={1.75}
      />
    );
  }

  if (dataItem.isOpen) {
    return (
      <FolderOpen
        className="min-w-4 min-h-4"
        height={16}
        width={16}
        strokeWidth={1.75}
      />
    );
  }

  return (
    <Folder
      className="min-w-4 min-h-4"
      height={16}
      width={16}
      strokeWidth={1.75}
    />
  );
}

function ItemRail({
  setHoveredItemRailPath,
  hoveredItemRailPath,
  dataItem,
}: {
  setHoveredItemRailPath: Dispatch<SetStateAction<string>>;
  hoveredItemRailPath: string;
  dataItem: FlattenedFileOrFolder;
}) {
  const setFileOrFolderMap = useSetAtom(fileOrFolderMapAtom);
  const parentId = dataItem.parentId;
  if (!parentId) return null;

  // Elements with a rail should have a parentId
  const railPath = dataItem.path.split('/').slice(0, -1).join('/');

  return (
    <div className="absolute">
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

const INDENT_WIDTH = 22;

export function FileTreeItem({
  dataItem,
  setHoveredItemRailPath,
  hoveredItemRailPath,
}: {
  setHoveredItemRailPath: Dispatch<SetStateAction<string>>;
  hoveredItemRailPath: string;
  dataItem: FlattenedFileOrFolder;
}) {
  const { mutate: openFolder, isPending } = useOpenFolderMutation();
  const setFileOrFolderMap = useSetAtom(fileOrFolderMapAtom);
  const isFolder = dataItem.type === 'folder';
  const isRoot = dataItem.level === 0;

  return (
    <div
      style={{
        paddingLeft: `${dataItem.level * INDENT_WIDTH}px`,
      }}
    >
      <span className="flex gap-2 text-sm w-full relative">
        {!isRoot && (
          <ItemRail
            setHoveredItemRailPath={setHoveredItemRailPath}
            hoveredItemRailPath={hoveredItemRailPath}
            dataItem={dataItem}
          />
        )}
        <button
          onClick={() => {
            navigate(`/notes/${encodeURIComponent(dataItem.path)}`);
            if (isFolder) {
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
            }
          }}
          className={cn(
            'flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-650 rounded-md w-full py-1 px-2 ml-3.75'
          )}
        >
          <FileItemIcon dataItem={dataItem} />{' '}
          <span className="truncate">{dataItem.name}</span>
        </button>
      </span>
      {isPending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <LoadingSpinner className="ml-11 my-1.25" height={16} width={16} />
        </motion.div>
      )}
    </div>
  );
}
