import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { navigate } from 'wouter/use-browser-location';
import {
  GetChildrenOfFolder,
  GetTopLevelItems,
  OpenFolderAndAddToFileWatcher,
} from '../../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';
import {
  AddFolder,
  RenameFolder,
} from '../../../../bindings/github.com/etesam913/bytebook/internal/services/folderservice';
import {
  AddNoteToFolder,
  RenameFile,
} from '../../../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import { QueryError } from '../../../utils/query';
import { fileTreeDataAtom } from '.';
import { reconcileTopLevelFileTreeMap } from './utils/file-tree-utils';
import { FILE_TYPE, FOLDER_TYPE, type FileOrFolder, Folder } from './types';
import { useAtom, useSetAtom } from 'jotai';
import { createFilePath, type FilePath } from '../../../utils/path';
import { NAME_CHARS } from '../../../utils/string-formatting';
import { toast } from 'sonner';
import { DEFAULT_SONNER_OPTIONS } from '../../../utils/general';

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

        if (itemType === FILE_TYPE) {
          folderOrFiles.push({
            ...commonAttributes,
            type: FILE_TYPE,
            parentId: null,
          });
        } else if (itemType === FOLDER_TYPE) {
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
  const [{ treeData }, setFileTreeData] = useAtom(fileTreeDataAtom);
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
      const folderData = treeData.get(folderId);
      if (!folderData || folderData.type !== FOLDER_TYPE) {
        throw new QueryError('Folder not found');
      }

      const cursorToUse = isLoadMore ? (folderData.childrenCursor ?? '') : '';
      const res = await GetChildrenOfFolder(
        pathToFolder,
        folderId,
        cursorToUse,
        PAGE_SIZE
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

export function useAddTreeItemMutation() {
  return useMutation({
    mutationFn: async ({
      parentFolder,
      addType,
      newName,
    }: {
      parentFolder: Folder | null;
      addType: 'folder' | 'note';
      newName: string;
      onSuccess?: () => void;
    }) => {
      if (!NAME_CHARS.test(newName)) {
        throw new Error(
          'Names can only contain letters, numbers, spaces, hyphens, and underscores.'
        );
      }

      if (addType === 'folder') {
        // Create folder: path is parentFolder/newFolderName (or top-level if null)
        const newFolderPath = parentFolder
          ? `${parentFolder.path}/${newName}`
          : newName;
        const res = await AddFolder(newFolderPath);
        if (!res.success) {
          throw new Error(res.message);
        }
        return { addType, parentPath: parentFolder?.path ?? '', newName };
      }

      if (!parentFolder) {
        throw new Error('Parent folder is required to add a note');
      }

      const newNotePath = `${parentFolder.path}/${newName}.md`;
      // Create note: folder is parentFolder.id, note name is newName
      const res = await AddNoteToFolder(parentFolder.path, newName);
      if (!res.success) {
        throw new Error(res.message);
      }

      return { addType, parentPath: parentFolder.path, newName, newNotePath };
    },
    onSuccess: (result, variables) => {
      if (result.addType === 'note') {
        const filePath = createFilePath(result.newNotePath);
        setTimeout(() => {
          if (filePath) {
            navigate(filePath.encodedFileUrl);
          }
        }, 300);
      }

      variables.onSuccess?.();
    },
  });
}

type RenameTreeItemPayload = (RenameFolderPayload | RenameFilePayload) & {
  onSuccess?: () => void;
  newName: string;
};

type RenameFolderPayload = {
  itemType: 'folder';
  folderPath: string;
};
type RenameFilePayload = {
  itemType: 'file';
  filePath: FilePath;
};

export function useRenameTreeItemMutation() {
  return useMutation({
    mutationFn: async (args: RenameTreeItemPayload) => {
      const trimmedName = args.newName.trim();
      if (!NAME_CHARS.test(trimmedName)) {
        throw new Error(
          'Names can only contain letters, numbers, spaces, hyphens, and underscores.'
        );
      }

      if (args.itemType === 'folder') {
        const pathSegments = args.folderPath.split('/');
        pathSegments[pathSegments.length - 1] = trimmedName;
        const newFolderPath = pathSegments.join('/');
        const res = await RenameFolder(args.folderPath, newFolderPath);
        if (!res.success) {
          throw new Error(res.message);
        }
        return { itemType: 'folder' as const };
      }

      // Renaming a file
      const newFilePathString = `${args.filePath.folder}/${trimmedName}.${args.filePath.extension}`;
      const newFilePath = createFilePath(newFilePathString);
      if (!newFilePath) {
        throw new Error('Invalid file path');
      }
      const res = await RenameFile(
        args.filePath.fullPath,
        newFilePath.fullPath
      );
      if (!res.success) {
        throw new Error(res.message);
      }
      return { itemType: 'file' as const };
    },
    onSuccess: (result, variables) => {
      if (result.itemType === 'folder') {
        toast.success('Folder renamed successfully', DEFAULT_SONNER_OPTIONS);
      } else {
        toast.success('File renamed successfully', DEFAULT_SONNER_OPTIONS);
      }

      variables.onSuccess?.();
    },
  });
}
