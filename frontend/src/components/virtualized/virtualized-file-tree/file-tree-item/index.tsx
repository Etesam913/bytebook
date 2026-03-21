import { useAtomValue } from 'jotai';
import { useFetchFolderChildrenMutation } from '../hooks/open-folder';
import {
  CREATE_FOLDER_TYPE,
  FOLDER_TYPE,
  LOAD_MORE_TYPE,
  VirtualizedFileTreeItem,
} from '../types';
import { fileTreeDataAtom } from '../../../../atoms';
import { LoadMoreRow } from './load-more-row';
import { FileTreeItemContainer } from '../file-tree-item-container';
import { CreateFolder } from '../create-folder';

export function FileTreeItem({
  dataItem,
}: {
  dataItem: VirtualizedFileTreeItem;
}) {
  const { treeData: fileOrFolderMap } = useAtomValue(fileTreeDataAtom);
  const { mutate: fetchFolderChildren } = useFetchFolderChildrenMutation();

  if (dataItem.type === CREATE_FOLDER_TYPE) {
    return <CreateFolder />;
  }

  if (dataItem.type === LOAD_MORE_TYPE) {
    const parentFolder = fileOrFolderMap.get(dataItem.parentId);
    return (
      <LoadMoreRow
        level={dataItem.level}
        onLoadMore={() => {
          if (parentFolder && parentFolder.type === FOLDER_TYPE) {
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

  // After the LOAD_MORE_TYPE check, dataItem is guaranteed to be FlattenedFileOrFolder
  const flattenedDataItem = dataItem;

  return <FileTreeItemContainer dataItem={flattenedDataItem} />;
}
