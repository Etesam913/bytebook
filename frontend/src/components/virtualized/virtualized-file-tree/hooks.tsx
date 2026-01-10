import { useMutation, useQuery } from '@tanstack/react-query';
import {
  GetChildrenOfFolder,
  GetTopLevelItems,
} from '../../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';
import { QueryError } from '../../../utils/query';
import { fileOrFolderMapAtom } from '.';
import { FILE_TYPE, FOLDER_TYPE, type FileOrFolder } from './types';
import { useEffect } from 'react';
import { useSetAtom } from 'jotai';

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
          path: entry.path,
        };
        if (entry.type === FILE_TYPE) {
          folderOrFiles.push({
            ...commonAttributes,
            type: FILE_TYPE,
          });
        } else if (entry.type === FOLDER_TYPE) {
          folderOrFiles.push({
            ...commonAttributes,
            type: FOLDER_TYPE,
            childrenIds: [],
            isOpen: false,
            isDataStale: false,
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
      setFileMap((prev) => {
        const tempMap = new Map(prev);
        for (const fileOrFolder of data) {
          switch (fileOrFolder.type) {
            case FILE_TYPE:
              tempMap.set(fileOrFolder.id, fileOrFolder);
              break;
            case FOLDER_TYPE: {
              let existingIsOpen: null | boolean = null;
              const prevFileOrFolder = prev.get(fileOrFolder.id);
              if (prevFileOrFolder && prevFileOrFolder.type === FOLDER_TYPE) {
                existingIsOpen = prevFileOrFolder.isOpen;
              }

              tempMap.set(fileOrFolder.id, {
                ...fileOrFolder,
                isOpen: existingIsOpen ?? false,
              });
              break;
            }
            default:
              break;
          }
        }

        console.info({
          fileMapUpdate: tempMap,
        });
        return tempMap;
      });
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
  const setFileOrFolderMap = useSetAtom(fileOrFolderMapAtom);

  return useMutation({
    /**
     * Opens a folder by its path and updates the file/folder map atom with its children.
     *
     * @param params
     * @param params.pathToFolder - Relative path to the folder to open.
     * @param params.folderId - The `id` of the folder in the map to update `childrenIds` for.
     * @throws {QueryError} When backend response is not successful.
     */
    mutationFn: async ({
      pathToFolder,
      folderId,
    }: {
      pathToFolder: string;
      folderId: string;
    }) => {
      const res = await GetChildrenOfFolder(pathToFolder);
      if (!res.success || (!res.data && res.message)) {
        throw new QueryError(res.message);
      }

      setFileOrFolderMap((prev) => {
        if (!res.data) return prev;

        const tempMap = new Map(prev);
        const childrenIds: string[] = [];

        // Adding the children to the map
        for (const entry of res.data) {
          childrenIds.push(entry.id);
          const commonAttributes = {
            id: entry.id,
            name: entry.name,
            path: entry.path,
          };
          switch (entry.type) {
            case FILE_TYPE:
              tempMap.set(entry.id, { ...commonAttributes, type: 'file' });
              break;
            case FOLDER_TYPE:
              tempMap.set(entry.id, {
                ...commonAttributes,
                type: 'folder',
                childrenIds: entry.childrenIds,
                isOpen: false,
                isDataStale: false,
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
            isOpen: !folder.isOpen,
          });
        }

        return tempMap;
      });
    },
  });
}
