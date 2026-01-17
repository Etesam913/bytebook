import { useAtomValue } from 'jotai';
import { useOpenFolderMutation } from '../hooks';
import { LOAD_MORE_TYPE, VirtualizedFileTreeItem } from '../types';
import { fileOrFolderMapAtom } from '..';
import { Dispatch, ReactNode, SetStateAction } from 'react';
import { LoadingSpinner } from '../../../loading-spinner';
import { motion } from 'motion/react';
import { ItemRail } from './item-rail';
import { LoadMoreRow } from './load-more-row';
import { FileTreeFileItem } from './file';
import { FileTreeFolderItem } from './folder';

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
  const fileOrFolderMap = useAtomValue(fileOrFolderMapAtom);

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
      {dataItem.type === 'folder' ? (
        <FileTreeFolderItem dataItem={dataItem} openFolder={openFolder} />
      ) : (
        <FileTreeFileItem dataItem={dataItem} />
      )}
    </FileTreeItemContainer>
  );
}
