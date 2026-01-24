import { useMutation, useQuery } from '@tanstack/react-query';
import {
  GetChildrenOfFolder,
  GetTopLevelItems,
  OpenFolderAndAddToFileWatcher,
} from '../../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';
import { QueryError } from '../../../utils/query';
import { fileOrFolderMapAtom } from '.';
import { reconcileTopLevelFileTreeMap } from './utils';
import { FILE_TYPE, FOLDER_TYPE, type FileOrFolder } from './types';
import { useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';

/**
 * Fetches the top-level folders from on mount
 */
export function useTopLevelFileOrFolders() {
  const topLevelFolderOrFilesQuery = useQuery({
    queryKey: ['top-level-files'],
    queryFn: async (): Promise<FileOrFolder[]> => {
      const res = await GetTopLevelItems();
      if (!res.success || !res.data) {
        throw new QueryError(res.message);
      }

      const folderOrFiles: FileOrFolder[] = [];
      for (const entry of res.data) {
        const commonAttributes = {
          id: entry.id,
          name: entry.name,
        };
        if (entry.type === FILE_TYPE) {
          folderOrFiles.push({
            ...commonAttributes,
            type: FILE_TYPE,
            parentId: null,
          });
        } else if (entry.type === FOLDER_TYPE) {
          folderOrFiles.push({
            ...commonAttributes,
            type: FOLDER_TYPE,
            childrenIds: [],
            childrenCursor: null,
            hasMoreChildren: false,
            isOpen: false,
            parentId: null,
          });
        }
      }

      return folderOrFiles;
    },
  });

  const setFileMap = useSetAtom(fileOrFolderMapAtom);

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
   * @dependencies Runs when `topLevelFolderOrFilesQuery.isLoading` or
   *   `topLevelFolderOrFilesQuery.data` changes
   */
  useEffect(() => {
    const isLoading = topLevelFolderOrFilesQuery.isLoading;
    const data = topLevelFolderOrFilesQuery.data;
    if (!isLoading && data) {
      setFileMap((prev) => reconcileTopLevelFileTreeMap(prev, data));
    }
  }, [topLevelFolderOrFilesQuery.isLoading, topLevelFolderOrFilesQuery.data]);

  return topLevelFolderOrFilesQuery;
}

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
 * @returns A mutation object for opening (expanding) a folder.
 */
export function useOpenFolderMutation() {
  const [fileOrFolderMap, setFileOrFolderMap] = useAtom(fileOrFolderMapAtom);
  const PAGE_SIZE = 50;

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
      const folderData = fileOrFolderMap.get(folderId);
      if (!folderData || folderData.type !== FOLDER_TYPE) {
        throw new QueryError('Folder not found');
      }

      const hasChildren = folderData.childrenIds.length > 0;
      if (hasChildren && !isLoadMore) {
        // There are already children, so we don't need to fetch them again.
        // The folder does have to be set as open though
        setFileOrFolderMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(folderId, {
            ...folderData,
            isOpen: true,
          });
          return newMap;
        });
        // Add folder to file watcher
        await OpenFolderAndAddToFileWatcher(pathToFolder);
        return;
      }

      const cursorToUse = isLoadMore ? (folderData.childrenCursor ?? '') : '';
      const res = await GetChildrenOfFolder(
        pathToFolder,
        cursorToUse,
        PAGE_SIZE
      );
      if (!res.success || (!res.data && res.message)) {
        throw new QueryError(res.message);
      }

      setFileOrFolderMap((prev) => {
        if (!res.data) return prev;

        const tempMap = new Map(prev);
        const existingFolder = tempMap.get(folderId);
        const childrenIds: string[] =
          isLoadMore && existingFolder && existingFolder.type === FOLDER_TYPE
            ? [...existingFolder.childrenIds]
            : [];

        // Adding the children to the map
        for (const entry of res.data.items ?? []) {
          childrenIds.push(entry.id);
          const commonAttributes = {
            id: entry.id,
            name: entry.name,
            parentId: folderId,
          };
          switch (entry.type) {
            case FILE_TYPE:
              tempMap.set(entry.id, {
                ...commonAttributes,
                type: 'file',
              });
              break;
            case FOLDER_TYPE:
              tempMap.set(entry.id, {
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
        const folder = tempMap.get(folderId);
        if (folder && folder.type === FOLDER_TYPE) {
          tempMap.set(folderId, {
            ...folder,
            childrenIds,
            isOpen: true,
            hasMoreChildren: res.data.hasMore,
            childrenCursor: res.data.hasMore ? res.data.nextCursor : null,
          });
        }

        return tempMap;
      });

      // Add folder to file watcher after successfully opening
      await OpenFolderAndAddToFileWatcher(pathToFolder);
    },
  });
}
