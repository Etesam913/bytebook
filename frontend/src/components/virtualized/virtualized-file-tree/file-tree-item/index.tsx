import { useAtomValue } from 'jotai';
import { useFetchFolderChildrenMutation } from '../hooks/open-folder';
import { LOAD_MORE_TYPE, VirtualizedFileTreeItem } from '../types';
import { isTreeNodeAFolder } from '../utils/file-tree-utils';
import { fileTreeDataAtom } from '../../../../atoms';
import { LoadMoreRow } from './load-more-row';
import { FileTreeItemContainer } from '../file-tree-item-container';

export function FileTreeItem({
  dataItem,
  virtualizedData,
  isSticky,
}: {
  dataItem: VirtualizedFileTreeItem;
  virtualizedData: VirtualizedFileTreeItem[];
  isSticky?: boolean;
}) {
  if (dataItem.type === LOAD_MORE_TYPE) {
    return <LoadMoreFileTreeItem dataItem={dataItem} />;
  }

  return (
    <FileTreeItemContainer
      dataItem={dataItem}
      virtualizedData={virtualizedData}
      isSticky={isSticky}
    />
  );
}

function LoadMoreFileTreeItem({
  dataItem,
}: {
  dataItem: Extract<VirtualizedFileTreeItem, { type: typeof LOAD_MORE_TYPE }>;
}) {
  const { treeData: fileOrFolderMap } = useAtomValue(fileTreeDataAtom);
  const { mutate: fetchFolderChildren } = useFetchFolderChildrenMutation();
  const parentFolder = fileOrFolderMap.get(dataItem.parentId);

  return (
    <LoadMoreRow
      level={dataItem.level}
      onLoadMore={() => {
        if (parentFolder && isTreeNodeAFolder(parentFolder)) {
          fetchFolderChildren({
            pathToFolder: parentFolder.path,
            folderId: parentFolder.id,
            isLoadMore: true,
          });
        }
      }}
    />
  );
}
