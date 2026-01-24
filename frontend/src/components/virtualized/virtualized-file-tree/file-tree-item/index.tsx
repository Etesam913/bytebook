import { useAtomValue } from 'jotai';
import { useOpenFolderMutation } from '../hooks';
import { LOAD_MORE_TYPE, VirtualizedFileTreeItem } from '../types';
import { fileOrFolderMapAtom } from '..';
import { ReactNode } from 'react';
import { LoadingSpinner } from '../../../loading-spinner';
import { motion } from 'motion/react';
import { LoadMoreRow } from './load-more-row';
import { FileTreeFileItem } from './file';
import { FileTreeFolderItem } from './folder';
import { currentZoomAtom } from '../../../../hooks/resize';

export function FileTreeItemContainer({
  paddingLeft,
  children,
  footer,
}: {
  paddingLeft: number;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      style={{
        paddingLeft: `${paddingLeft}px`,
      }}
    >
      {children}
      {footer}
    </div>
  );
}

export function FileTreeItem({
  dataItem,
}: {
  dataItem: VirtualizedFileTreeItem;
}) {
  const { mutate: openFolder, isPending } = useOpenFolderMutation();
  const fileOrFolderMap = useAtomValue(fileOrFolderMapAtom);
  const currentZoom = useAtomValue(currentZoomAtom);
  const INDENT_WIDTH = 18;
  const paddingLeft = (dataItem.level * INDENT_WIDTH) / currentZoom;

  if (dataItem.type === LOAD_MORE_TYPE) {
    const parentFolder = fileOrFolderMap.get(dataItem.parentId);
    return (
      <LoadMoreRow
        paddingLeft={paddingLeft}
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
