import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { GetTopLevelItems } from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';
import { QueryError } from '../../../../utils/query';
import { fileTreeDataAtom } from '../../../../atoms';
import { reconcileTopLevelFileTreeMap } from '../utils/file-tree-utils';
import { FILE_TYPE, FOLDER_TYPE, type FileOrFolder } from '../types';
import { useSetAtom } from 'jotai';

/**
 * Hook that fetches top-level files and folders from the backend
 * and transforms them into an array of `FileOrFolder` objects
 */
function useTopLevelFileOrFoldersQuery() {
  return useQuery({
    queryKey: ['top-level-files'],
    queryFn: async (): Promise<FileOrFolder[]> => {
      const res = await GetTopLevelItems();
      if (!res.success || !res.data) {
        throw new QueryError(res.message);
      }

      const folderOrFiles: FileOrFolder[] = [];
      for (const { id, name, path, type: itemType } of res.data) {
        // Cast to include path since bindings are excluded from TS checking
        const commonAttributes = {
          id,
          path,
          name,
        };

        switch (itemType) {
          case FILE_TYPE:
            folderOrFiles.push({
              ...commonAttributes,
              type: FILE_TYPE,
              parentId: null,
            });
            break;
          case FOLDER_TYPE:
            folderOrFiles.push({
              ...commonAttributes,
              type: FOLDER_TYPE,
              childrenIds: [],
              childrenCursor: null,
              hasMoreChildren: false,
              isOpen: false,
              parentId: null,
            });
            break;
        }
      }

      return folderOrFiles;
    },
  });
}

/**
 * Fetches the top-level folders from on mount
 * and populates the fileTreeDataAtom atom with a map of id to FileOrFolder object
 */
export function useTopLevelFileOrFolders() {
  const topLevelFolderOrFilesQuery = useTopLevelFileOrFoldersQuery();
  const setFileTreeData = useSetAtom(fileTreeDataAtom);

  /**
   * Synchronizes the file/folder map atom with the top-level items query data.
   *
   * When the query successfully loads data, this effect updates the global file/folder
   * map atom with the fetched items. For folders, it preserves the existing `isOpen`
   * state if the folder was already present in the map, preventing loss of user
   * interaction state (expanded/collapsed) when data is refetched.
   *
   * Files are simply added/updated in the map, while folders merge their state to
   * maintain UI continuity.
   *
   */
  useEffect(() => {
    const isLoading = topLevelFolderOrFilesQuery.isLoading;
    const data = topLevelFolderOrFilesQuery.data;
    if (!isLoading && data) {
      setFileTreeData((prev) => {
        const reconciledTreeData = reconcileTopLevelFileTreeMap(prev, data);
        const newFilePathToTreeDataId = new Map<string, string>();

        // Rebuild filePathToTreeDataId from reconciled tree data
        // to drop stale paths that were removed during reconciliation.
        for (const [id, node] of reconciledTreeData.entries()) {
          newFilePathToTreeDataId.set(node.path, id);
        }

        return {
          treeData: reconciledTreeData,
          filePathToTreeDataId: newFilePathToTreeDataId,
        };
      });
    }
  }, [topLevelFolderOrFilesQuery.isLoading, topLevelFolderOrFilesQuery.data]);

  return topLevelFolderOrFilesQuery;
}
