import { useMutation } from '@tanstack/react-query';
import {
  GetChildrenOfFolder,
  OpenFolderAndAddToFileWatcher,
} from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';
import { QueryError } from '../../../../utils/query';
import { fileTreeDataAtom } from '../../../../atoms';
import { FILE_TYPE, FOLDER_TYPE } from '../types';
import { useSetAtom, useStore } from 'jotai';

/**
 * Custom hook to manage opening a folder in the file tree.
 *
 * When invoked (via the returned mutation), it retrieves the children of a provided folder path
 * from the backend, adds or updates child entries in the fileOrFolderMap atom, and updates
 * the parent's `childrenIds` to reflect its children.
 *
 * It sets folders as open (`isOpen: true`) upon retrieval and ensures their immediate children
 * are mapped in the atom. This keeps the file tree state consistent with user navigation.
 *
 * @param options.pageSize - Number of children to fetch per request (default: 50).
 * @returns A mutation object for opening (expanding) a folder.
 */
export function useOpenFolderMutation(options?: { pageSize?: number }) {
  const store = useStore();
  const setFileTreeData = useSetAtom(fileTreeDataAtom);
  const pageSize = options?.pageSize ?? 300;

  // Opens a folder by its path and updates the file/folder map atom with its children.
  return useMutation({
    mutationFn: async ({
      pathToFolder,
      folderId,
      isLoadMore,
    }: {
      pathToFolder: string;
      folderId: string;
      isLoadMore?: boolean;
    }) => {
      const { treeData } = store.get(fileTreeDataAtom);
      const folderData = treeData.get(folderId);
      if (!folderData || folderData.type !== FOLDER_TYPE) {
        throw new QueryError('Folder not found');
      }

      const cursorToUse = isLoadMore ? (folderData.childrenCursor ?? '') : '';
      const res = await GetChildrenOfFolder(
        pathToFolder,
        folderId,
        cursorToUse,
        pageSize
      );
      if (!res.success || (!res.data && res.message)) {
        throw new QueryError(res.message);
      }

      setFileTreeData((prev) => {
        if (!res.data) return prev;

        const tempTreeData = new Map(prev.treeData);
        const tempFilePathToTreeDataId = new Map(prev.filePathToTreeDataId);
        const existingFolder = tempTreeData.get(folderId);

        if (isLoadMore) {
          // When loading more children, we just add them to the childrenIds of the parent folder
          const childrenIds: string[] =
            existingFolder && existingFolder.type === FOLDER_TYPE
              ? [...existingFolder.childrenIds]
              : [];

          // Adding the children to the map
          for (const entry of res.data.items ?? []) {
            childrenIds.push(entry.id);
            const commonAttributes = {
              id: entry.id,
              path: entry.path,
              name: entry.name,
              parentId: folderId,
            };

            // Populate filePathToTreeDataId map for children
            tempFilePathToTreeDataId.set(entry.path, entry.id);

            switch (entry.type) {
              case FILE_TYPE:
                tempTreeData.set(entry.id, {
                  ...commonAttributes,
                  type: 'file',
                });
                break;
              case FOLDER_TYPE:
                tempTreeData.set(entry.id, {
                  ...commonAttributes,
                  type: 'folder',
                  childrenIds: entry.childrenIds,
                  childrenCursor: null,
                  hasMoreChildren: false,
                  isOpen: false,
                });
                break;
              default:
                break;
            }
          }

          // Updating the childrenIds of the parent folder
          const folder = tempTreeData.get(folderId);
          if (folder && folder.type === FOLDER_TYPE) {
            tempTreeData.set(folderId, {
              ...folder,
              childrenIds,
              isOpen: true,
              hasMoreChildren: res.data.hasMore,
              childrenCursor: res.data.hasMore ? res.data.nextCursor : null,
            });
          }
        } else {
          // When loading the first set of children, we need to update the parent to include
          // the new children and remove the children that may no longer exist in the new data
          const returnedPaths = new Set(
            (res.data.items ?? []).map((entry) => entry.path)
          );

          if (existingFolder && existingFolder.type === FOLDER_TYPE) {
            for (const childId of existingFolder.childrenIds) {
              const childNode = tempTreeData.get(childId);
              if (!childNode) {
                continue;
              }
              if (returnedPaths.has(childNode.path)) {
                // No need to do anything if the child still exists in the new data
                continue;
              }

              for (const [path, id] of tempFilePathToTreeDataId.entries()) {
                // Finding all files and folders that start with the child node's path
                // These need to be removed from the filePathToTreeDataId map
                if (
                  path === childNode.path ||
                  path.startsWith(childNode.path + '/')
                ) {
                  tempFilePathToTreeDataId.delete(path);
                  tempTreeData.delete(id);
                }
              }
            }
          }

          const reconciledChildrenIds: string[] = [];
          for (const entry of res.data.items ?? []) {
            const existingId = tempFilePathToTreeDataId.get(entry.path);
            if (existingId) {
              reconciledChildrenIds.push(existingId);
            } else {
              // If the child does not exist in the new data, we need to add it to the childrenIds of the parent folder
              reconciledChildrenIds.push(entry.id);
              tempFilePathToTreeDataId.set(entry.path, entry.id);
              if (entry.type === FILE_TYPE) {
                tempTreeData.set(entry.id, {
                  ...entry,
                  type: 'file',
                  parentId: folderId,
                });
              } else if (entry.type === FOLDER_TYPE) {
                tempTreeData.set(entry.id, {
                  ...entry,
                  type: 'folder',
                  childrenIds: [],
                  childrenCursor: null,
                  hasMoreChildren: false,
                  isOpen: false,
                });
              }
            }
          }

          const folder = tempTreeData.get(folderId);
          if (folder && folder.type === FOLDER_TYPE) {
            tempTreeData.set(folderId, {
              ...folder,
              childrenIds: reconciledChildrenIds,
              isOpen: true,
              hasMoreChildren: res.data.hasMore,
              childrenCursor: res.data.hasMore ? res.data.nextCursor : null,
            });
          }
        }

        return {
          treeData: tempTreeData,
          filePathToTreeDataId: tempFilePathToTreeDataId,
        };
      });

      // Add folder to file watcher after successfully opening
      await OpenFolderAndAddToFileWatcher(pathToFolder);
    },
  });
}
