import { useAtomValue, useSetAtom } from 'jotai';
import { Folder } from '../../../../icons/folder';
import { FolderOpen } from '../../../../icons/folder-open';
import { Note } from '../../../../icons/page';
import { useOpenFolderMutation } from '../hooks';
import {
  FlattenedFileOrFolder,
  LOAD_MORE_TYPE,
  VirtualizedFileTreeItem,
} from '../types';
import { fileOrFolderMapAtom } from '..';
import { cn } from '../../../../utils/string-formatting';
import { Dispatch, ReactNode, SetStateAction, useState } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { LoadingSpinner } from '../../../loading-spinner';
import { AnimatePresence, motion } from 'motion/react';
import { useFilePathFromRoute } from '../../../../hooks/routes';
import { createFilePath } from '../../../../utils/path';
import { SidebarHighlight } from '../../virtualized-list/highlight';
import { ItemRail } from './item-rail';
import { LoadMoreRow } from './load-more-row';

function FileItemIcon({ dataItem }: { dataItem: FlattenedFileOrFolder }) {
  if (dataItem.type === 'file') {
    return (
      <Note
        className="min-w-4 min-h-4 will-change-transform"
        height={16}
        width={16}
        strokeWidth={1.75}
      />
    );
  }

  if (dataItem.isOpen) {
    return (
      <FolderOpen
        className="min-w-4 min-h-4 will-change-transform"
        height={16}
        width={16}
        strokeWidth={1.75}
      />
    );
  }

  return (
    <Folder
      className="min-w-4 min-h-4 will-change-transform"
      height={16}
      width={16}
      strokeWidth={1.75}
    />
  );
}

export function FileTreeItemContainer({
  paddingLeft,
  dataItem,
  setHoveredItemRailPath,
  hoveredItemRailPath,
  children,
  footer,
  showRail = true,
}: {
  paddingLeft: number;
  dataItem: VirtualizedFileTreeItem;
  setHoveredItemRailPath: Dispatch<SetStateAction<string>>;
  hoveredItemRailPath: string;
  children?: ReactNode;
  footer?: ReactNode;
  showRail?: boolean;
}) {
  return (
    <div
      style={{
        paddingLeft: `${paddingLeft}px`,
      }}
    >
      <span className="flex gap-2 text-sm w-full relative">
        {showRail && (
          <ItemRail
            setHoveredItemRailPath={setHoveredItemRailPath}
            hoveredItemRailPath={hoveredItemRailPath}
            dataItem={dataItem}
          />
        )}
        {children}
      </span>
      {footer}
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
  dataItem: VirtualizedFileTreeItem;
}) {
  const { mutate: openFolder, isPending } = useOpenFolderMutation();
  const [isHovered, setIsHovered] = useState(false);
  const fileOrFolderMap = useAtomValue(fileOrFolderMapAtom);
  const setFileOrFolderMap = useSetAtom(fileOrFolderMapAtom);

  const filePathFromRoute = useFilePathFromRoute();
  const filePath = createFilePath(dataItem.path);
  const isSelected =
    filePathFromRoute && filePath && filePathFromRoute.equals(filePath);
  const paddingLeft = dataItem.level * INDENT_WIDTH;
  const shouldShowRail = Boolean(dataItem.parentId);

  if (dataItem.type === LOAD_MORE_TYPE) {
    const parentFolder = fileOrFolderMap.get(dataItem.parentId);
    return (
      <LoadMoreRow
        dataItem={dataItem}
        paddingLeft={paddingLeft}
        setHoveredItemRailPath={setHoveredItemRailPath}
        hoveredItemRailPath={hoveredItemRailPath}
        showRail={shouldShowRail}
        onLoadMore={() => {
          if (parentFolder && parentFolder.type === 'folder') {
            openFolder({
              pathToFolder: parentFolder.path,
              folderId: parentFolder.id,
              isLoadMore: true,
            });
          }
        }}
      />
    );
  }

  const isFolder = dataItem.type === 'folder';
  return (
    <FileTreeItemContainer
      paddingLeft={paddingLeft}
      dataItem={dataItem}
      setHoveredItemRailPath={setHoveredItemRailPath}
      hoveredItemRailPath={hoveredItemRailPath}
      showRail={shouldShowRail}
      footer={
        isPending ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <LoadingSpinner className="ml-11 my-1.25" height={16} width={16} />
          </motion.div>
        ) : null
      }
    >
      <button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
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
          } else {
            if (filePath) {
              navigate(filePath.encodedFileUrl);
            }
          }
        }}
        className={cn('flex items-center w-full relative rounded-md')}
      >
        <AnimatePresence>
          {isHovered && (
            <SidebarHighlight
              layoutId={'file-tree-item-highlight'}
              className="w-[calc(100%-15px)] ml-3.75"
            />
          )}
        </AnimatePresence>
        <span
          className={cn(
            'rounded-md flex items-center gap-2 z-10 py-1 px-2 ml-3.75 overflow-hidden w-full',
            isSelected && 'bg-zinc-150 dark:bg-zinc-650'
          )}
        >
          <FileItemIcon dataItem={dataItem} />
          <span className="truncate">{dataItem.name}</span>
        </span>
      </button>
    </FileTreeItemContainer>
  );
}
