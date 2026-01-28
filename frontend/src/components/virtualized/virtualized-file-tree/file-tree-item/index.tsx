import { useAtomValue } from 'jotai';
import { useOpenFolderMutation } from '../hooks';
import { LOAD_MORE_TYPE, VirtualizedFileTreeItem } from '../types';
import { fileTreeDataAtom } from '..';
import { LoadMoreRow } from './load-more-row';
import { currentZoomAtom } from '../../../../hooks/resize';
import { FileTreeItemContainer } from '../file-tree-item-container';

export function FileTreeItem({
  dataItem,
}: {
  dataItem: VirtualizedFileTreeItem;
}) {
  const { treeData: fileOrFolderMap } = useAtomValue(fileTreeDataAtom);
  const { mutate: openFolder, isPending } = useOpenFolderMutation();
  const currentZoom = useAtomValue(currentZoomAtom);
  const INDENT_WIDTH = 18;
  const paddingLeft = ((dataItem.level + 1) * INDENT_WIDTH) / currentZoom;

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

  // After the LOAD_MORE_TYPE check, dataItem is guaranteed to be FlattenedFileOrFolder
  const flattenedDataItem = dataItem;

  return (
    <FileTreeItemContainer
      paddingLeft={paddingLeft}
      dataItem={flattenedDataItem}
      isLoadMorePending={isPending}
    />
  );
}
