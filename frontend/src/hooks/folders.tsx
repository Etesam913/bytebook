import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  QueryClient,
} from '@tanstack/react-query';
import { logger } from '../utils/logging';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { toast } from 'sonner';
import { navigate } from 'wouter/use-browser-location';
import {
  AddFolder,
  DeleteFolder,
  GetFolders,
  RenameFolder,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/folderservice';
import {
  AddNoteToFolder,
  MoveNoteToFolder,
  RevealFolderOrFileInFinder,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import { fileTreeDataAtom } from '../components/virtualized/virtualized-file-tree';
import {
  addFolderToFileTreeMap,
  getTreeNodeFromPath,
  removeFolderFromFileTreeMap,
} from '../components/virtualized/virtualized-file-tree/utils';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';
import { QueryError } from '../utils/query';
import {
  validateName,
  getContentTypeAndValueFromSelectionRangeValue,
} from '../utils/string-formatting';
import { routeUrls } from '../utils/routes';
import { useWailsEvent } from './events';
import { isEventInCurrentWindow } from '../utils/events';
import { useCreateFolderDialog } from './dialogs';
import { OpenFolderAndAddToFileWatcher } from '../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';

type FoldersQueryData = {
  alphabetizedFolders: string[];
  previousAlphabetizedFolders: string[] | undefined;
};

type FolderFormElementWithMetadata = HTMLFormElement & {
  __folderName?: string;
};

export const folderQueries = {
  getFolders: (queryClient: QueryClient) =>
    queryOptions({
      queryKey: ['folders'],
      queryFn: async () => {
        const res = await GetFolders();
        if (!res.success) {
          throw new QueryError(res.message);
        }
        const previousQueryData = queryClient.getQueryData<FoldersQueryData>([
          'folders',
        ]);
        const previousFolders = previousQueryData?.alphabetizedFolders;
        return {
          alphabetizedFolders: (res.data ?? []).sort((a, b) =>
            a.localeCompare(b)
          ),
          previousAlphabetizedFolders: previousFolders || undefined,
        };
      },
    }),
};

/**
 * Custom hook to fetch and manage folders.
 *
 * @param curFolder - The current folder name from the URL.
 * @returns An object containing the query data and alphabetized folders.
 */
export function useFolders() {
  const queryClient = useQueryClient();
  return useQuery(folderQueries.getFolders(queryClient));
}

/** This function is used to handle `folder:create` events */
export function useFolderCreate() {
  const queryClient = useQueryClient();
  const setFileTreeData = useSetAtom(fileTreeDataAtom);

  useWailsEvent('folder:create', async (body) => {
    logger.event('folder:create', body);
    const data = body.data as { folderPath: string }[];
    let needsTopLevelInvalidation = false;

    setFileTreeData((prev) => {
      let updatedTreeData = new Map(prev.treeData);
      const updatedFilePathToTreeDataId = new Map(prev.filePathToTreeDataId);

      for (const { folderPath } of data) {
        // Skip if folder path already exists in the filepath-to-id mapping
        if (updatedFilePathToTreeDataId.has(folderPath)) {
          continue;
        }

        const segments = folderPath.split('/').filter(Boolean);

        if (segments.length === 1) {
          // Top-level folder - just invalidate the query
          needsTopLevelInvalidation = true;
          continue;
        }

        const folderName = segments[segments.length - 1];
        const parentPath = segments.slice(0, -1).join('/');
        const parentId = updatedFilePathToTreeDataId.get(parentPath);

        if (!parentId) {
          // The folder is top level as it does not have a parent
          needsTopLevelInvalidation = true;
          continue;
        }

        const parent = updatedTreeData.get(parentId);

        if (!parent || parent.type !== 'folder' || !parent.isOpen) {
          // Parent can't be closed
          continue;
        }

        // Generate a new UUID for this folder
        const newFolderId = crypto.randomUUID();
        updatedFilePathToTreeDataId.set(folderPath, newFolderId);
        updatedTreeData = addFolderToFileTreeMap({
          map: updatedTreeData,
          folderId: newFolderId,
          folderPath,
          folderName,
          parentId,
        });
      }

      return {
        treeData: updatedTreeData,
        filePathToTreeDataId: updatedFilePathToTreeDataId,
      };
    });

    if (needsTopLevelInvalidation) {
      queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
    }
  });
}

/** This function is used to handle `folder:delete` events. This gets triggered when deleting a folder using the file system */
export function useFolderDelete() {
  const queryClient = useQueryClient();
  const setFileTreeData = useSetAtom(fileTreeDataAtom);

  useWailsEvent('folder:delete', async (body) => {
    logger.event('folder:delete', body);
    const data = body.data as { folderPath: string }[];
    let needsTopLevelInvalidation = false;

    setFileTreeData((prev) => {
      let updatedFileTreeData = prev;
      let didUpdate = false;

      for (const { folderPath } of data) {
        const segments = folderPath.split('/').filter(Boolean);

        if (segments.length === 1) {
          // Top-level folder - just invalidate the query
          needsTopLevelInvalidation = true;
          continue;
        }

        // Nested folder - remove it from the map
        const parentPath = segments.slice(0, -1).join('/');

        // Look up ids from paths
        const folderId =
          updatedFileTreeData.filePathToTreeDataId.get(folderPath);
        const parentId =
          updatedFileTreeData.filePathToTreeDataId.get(parentPath);

        if (!folderId || !parentId) {
          // Can't find folder in path map - invalidate queries
          needsTopLevelInvalidation = true;
          continue;
        }

        updatedFileTreeData = removeFolderFromFileTreeMap({
          fileTreeData: updatedFileTreeData,
          folderId,
          parentId,
        });
        didUpdate = true;
      }

      return didUpdate ? updatedFileTreeData : prev;
    });

    if (needsTopLevelInvalidation) {
      queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
    }
  });
}

/** This function is used to handle `folder:rename` events. This gets triggered when renaming a folder using the file system */
export function useFolderRename() {
  const queryClient = useQueryClient();
  const [{ filePathToTreeDataId, treeData }, setFileTreeData] =
    useAtom(fileTreeDataAtom);

  useWailsEvent('folder:rename', async (body) => {
    logger.event('folder:rename', body);
    const data = body.data as {
      oldFolderPath: string;
      newFolderPath: string;
    }[];

    // needsTopLevelInvalidation is to track if the top level needs to be invalidated
    let needsTopLevelInvalidation = false;

    // pathRemappings is to track changes from an old path to a new path
    const pathRemappings = new Map<string, string>(); // oldPath -> newPath

    // folderUpdates is to track changes to a folder's properties based off of id
    const folderUpdates = new Map<
      string,
      { path: string; name: string; parentId: string | null }
    >(); // folderId -> { path, name, parentId }

    // parentFolderUpdates is to track changes to a parent folder's children based off of id
    const parentFolderUpdates = new Map<
      string,
      { removeChildIds: Set<string>; addChildIds: Set<string> }
    >(); // parentId -> { removeChildIds, addChildIds }

    for (const { oldFolderPath, newFolderPath } of data) {
      const treeDataNode = getTreeNodeFromPath(
        { filePathToTreeDataId, treeData },
        oldFolderPath
      );

      if (!treeDataNode || treeDataNode.type !== 'folder') {
        logger.error('folder:rename', 'id for old folder path not found', {
          oldFolderPath,
        });
        continue;
      }

      if (treeDataNode.isOpen) {
        // If the folder is open, and going to be renamed to a different path, we need to ensure that the file watcher is listening
        // to the new path
        await OpenFolderAndAddToFileWatcher(newFolderPath);
      }

      // Adds to path remapping map
      const oldSegments = oldFolderPath.split('/').filter(Boolean);
      const newSegments = newFolderPath.split('/').filter(Boolean);
      pathRemappings.set(oldFolderPath, newFolderPath);

      // Determine if the folder is being moved to or from the top level
      const isUpdatingtopLevel =
        oldSegments.length === 1 || newSegments.length === 1;
      if (isUpdatingtopLevel) {
        needsTopLevelInvalidation = true;
      }

      // Update the required properties for the folder based off of id
      const newFolderName = newSegments[newSegments.length - 1];
      const oldParentId = treeDataNode.parentId;
      const newParentPath = newSegments.slice(0, -1).join('/');
      const newParentId =
        getTreeNodeFromPath({ filePathToTreeDataId, treeData }, newParentPath)
          ?.id ?? null;
      folderUpdates.set(treeDataNode.id, {
        path: newFolderPath,
        name: newFolderName,
        parentId: newParentId,
      });

      // If the folder did not used to be a top level folder, remove it from the old parent folder's children
      if (oldParentId && oldParentId !== newParentId) {
        if (!parentFolderUpdates.has(oldParentId)) {
          // Providing a a default empty value for the updates
          parentFolderUpdates.set(oldParentId, {
            removeChildIds: new Set(),
            addChildIds: new Set(),
          });
        }
        parentFolderUpdates
          .get(oldParentId)!
          .removeChildIds.add(treeDataNode.id);
      }

      // If the folder is moving to a new parent folder, add it to the new parent folder's children
      if (newParentId && newParentId !== oldParentId) {
        if (!parentFolderUpdates.has(newParentId)) {
          parentFolderUpdates.set(newParentId, {
            removeChildIds: new Set(),
            addChildIds: new Set(),
          });
        }
        parentFolderUpdates.get(newParentId)!.addChildIds.add(treeDataNode.id);
      }
    }

    if (needsTopLevelInvalidation) {
      queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
    }

    // Apply all changes in a single setFileTreeData call
    if (pathRemappings.size > 0) {
      setFileTreeData((prev) => {
        const newFilePathToTreeDataId = new Map(prev.filePathToTreeDataId);
        const updatedTreeData = new Map(prev.treeData);

        // Update the filePathToTreeDataId map with the remappings
        for (const [oldFolderPath, newFolderPath] of pathRemappings) {
          const entriesToUpdate: [string, string][] = [];

          for (const [path, id] of newFilePathToTreeDataId.entries()) {
            // Finds all files and folders that start with the old folder path
            // This gets the children of the old folder path
            // These need to be updated to the new folder path
            if (
              path === oldFolderPath ||
              path.startsWith(oldFolderPath + '/')
            ) {
              entriesToUpdate.push([path, id]);
            }
          }

          for (const [oldPath, id] of entriesToUpdate) {
            // Updating the paths in the filePathToTreeDataId map
            // and the tree data map for the folder and each of its children
            newFilePathToTreeDataId.delete(oldPath);
            const newPath =
              oldPath === oldFolderPath
                ? newFolderPath
                : newFolderPath + oldPath.slice(oldFolderPath.length);
            newFilePathToTreeDataId.set(newPath, id);

            const node = updatedTreeData.get(id);
            if (!node) continue;
            updatedTreeData.set(id, {
              ...node,
              path: newPath,
            });
          }
        }

        // Apply folder updates
        for (const [folderId, updates] of folderUpdates) {
          const existingFolder = updatedTreeData.get(folderId);
          if (existingFolder && existingFolder.type === 'folder') {
            updatedTreeData.set(folderId, {
              ...existingFolder,
              path: updates.path,
              name: updates.name,
              parentId: updates.parentId,
            });
          }
        }

        // Apply parent folder updates
        for (const [parentId, updates] of parentFolderUpdates) {
          const parent = updatedTreeData.get(parentId);
          if (!parent || parent.type !== 'folder') {
            continue;
          }

          let updatedChildrenIds = [...parent.childrenIds];
          for (const childId of updates.removeChildIds) {
            updatedChildrenIds = updatedChildrenIds.filter(
              (id) => id !== childId
            );
          }

          // Add children to new parent
          for (const childId of updates.addChildIds) {
            if (!updatedChildrenIds.includes(childId)) {
              updatedChildrenIds.push(childId);
            }
          }

          // Sort alphabetically by name
          updatedChildrenIds.sort((a, b) => {
            const aItem = updatedTreeData.get(a);
            const bItem = updatedTreeData.get(b);
            const aName = aItem?.name ?? a;
            const bName = bItem?.name ?? b;
            return aName.localeCompare(bName);
          });

          updatedTreeData.set(parentId, {
            ...parent,
            childrenIds: updatedChildrenIds,
          });
        }

        return {
          treeData: updatedTreeData,
          filePathToTreeDataId: newFilePathToTreeDataId,
        };
      });
    }
  });
}

/**
 * Custom hook to handle moving notes into a folder.
 */
export function useMoveNoteIntoFolder() {
  return useMutation({
    mutationFn: async ({
      backendNotePaths,
      newFolder,
    }: {
      backendNotePaths: string[];
      newFolder: string;
    }) => {
      const res = await MoveNoteToFolder(backendNotePaths, newFolder);
      if (!res.success) throw new QueryError(res.message);
    },
  });
}

/**
 * Custom hook to handle folder creation through a dialog form submission.
 * Optimistically updates the cache so that navigation can happen without
 * a 404 page error
 */
export function useFolderCreateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      e,
    }: {
      e: FormEvent<HTMLFormElement>;
      setErrorText: Dispatch<SetStateAction<string>>;
    }): Promise<boolean> => {
      // Extract form data and validate the folder name
      const formElement = e.target as FolderFormElementWithMetadata;
      const formData = new FormData(formElement);
      const newFolderName = formData.get('folder-name');
      const { isValid, errorMessage } = validateName(newFolderName, 'folder');
      if (!isValid) throw new Error(errorMessage);
      if (!newFolderName) return false;

      const newFolderNameString = newFolderName.toString().trim();

      // Handle folder creation
      const res = await AddFolder(newFolderNameString);
      if (!res.success) throw new Error(res.message);

      // Add an untitled note to the newly created folder
      const addNoteRes = await AddNoteToFolder(newFolderNameString, 'Untitled');
      if (addNoteRes.success) {
        // Store the folder name for navigation in onSuccess
        formElement.__folderName = newFolderNameString;
        return true;
      }
      throw new Error(addNoteRes.message);
    },
    // Optimistically update cache
    onMutate: async (variables) => {
      const getFoldersQueryKey = folderQueries.getFolders(queryClient).queryKey;
      await queryClient.cancelQueries({
        queryKey: getFoldersQueryKey,
      });
      const previousFolders = queryClient.getQueryData(getFoldersQueryKey);

      const formData = new FormData(variables.e.target as HTMLFormElement);
      const newFolderName =
        formData.get('folder-name')?.toString()?.trim() ?? '';

      // Only perform optimistic update if the new folder name doesn't already exist
      if (newFolderName && previousFolders?.alphabetizedFolders) {
        const folderAlreadyExists =
          previousFolders.alphabetizedFolders.includes(newFolderName);

        // Skip optimistic update if folder already exists to avoid duplicate keys
        if (!folderAlreadyExists) {
          const updatedFolders: FoldersQueryData = {
            alphabetizedFolders: [
              ...previousFolders.alphabetizedFolders,
              newFolderName,
            ].sort((a, b) => a.localeCompare(b)),
            previousAlphabetizedFolders:
              previousFolders.alphabetizedFolders || undefined,
          };
          queryClient.setQueryData(getFoldersQueryKey, updatedFolders);
        }
      }

      return { previousFolders };
    },
    onSuccess: (result, variables) => {
      const formElement = variables.e.target as FolderFormElementWithMetadata;
      const folderName = formElement.__folderName;
      if (result && folderName) {
        navigate(routeUrls.folder(folderName));
      }
      const getFoldersQueryKey = folderQueries.getFolders(queryClient).queryKey;
      queryClient.invalidateQueries({
        queryKey: getFoldersQueryKey,
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousFolders) {
        const getFoldersQueryKey =
          folderQueries.getFolders(queryClient).queryKey;
        queryClient.setQueryData(getFoldersQueryKey, context.previousFolders);
      }
      if (error instanceof Error) variables.setErrorText(error.message);
      else
        variables.setErrorText(
          'An unknown error occurred. Please try again later.'
        );
    },
  });
}

/**
 * Custom hook to handle folder renaming through a dialog form submission.
 */
export function useFolderRenameMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      e,
      folderFromSidebar,
    }: {
      e: FormEvent<HTMLFormElement>;
      folderFromSidebar: string;
      setErrorText: Dispatch<SetStateAction<string>>;
    }): Promise<boolean> => {
      // Extract form data and validate the folder name
      const formData = new FormData(e.target as HTMLFormElement);
      const newFolderName = formData.get('folder-name');
      const { isValid, errorMessage } = validateName(newFolderName, 'folder');
      if (!isValid) throw new Error(errorMessage);
      if (!newFolderName) return false;

      const newFolderNameString = newFolderName.toString().trim();

      // Handle folder renaming
      if (!folderFromSidebar) throw new Error('Something went wrong');
      const res = await RenameFolder(folderFromSidebar, newFolderNameString);
      if (!res.success) throw new Error(res.message);

      // Store the folder name for navigation in onSuccess
      (e.target as FolderFormElementWithMetadata).__folderName =
        newFolderNameString;
      return true;
    },
    // Optimistically update cache
    onMutate: async (variables) => {
      const getFoldersQueryKey = folderQueries.getFolders(queryClient).queryKey;
      await queryClient.cancelQueries({
        queryKey: getFoldersQueryKey,
      });
      const previousFolders = queryClient.getQueryData(getFoldersQueryKey);

      const formData = new FormData(variables.e.target as HTMLFormElement);
      const newFolderName =
        formData.get('folder-name')?.toString()?.trim() ?? '';

      // Only perform optimistic update if the new folder name doesn't already exist
      if (newFolderName && previousFolders?.alphabetizedFolders) {
        const folderAlreadyExists =
          previousFolders.alphabetizedFolders.includes(newFolderName);

        // Skip optimistic update if folder already exists to avoid duplicate keys
        if (!folderAlreadyExists) {
          const updatedFolders: FoldersQueryData = {
            alphabetizedFolders: previousFolders.alphabetizedFolders
              .map((folder) =>
                folder === variables.folderFromSidebar ? newFolderName : folder
              )
              .sort((a, b) => a.localeCompare(b)),
            previousAlphabetizedFolders:
              previousFolders.alphabetizedFolders || undefined,
          };
          queryClient.setQueryData(getFoldersQueryKey, updatedFolders);
        }
      }

      return { previousFolders };
    },
    onSuccess: (result, variables) => {
      const formElement = variables.e.target as FolderFormElementWithMetadata;
      const folderName = formElement.__folderName;
      if (result && folderName) {
        navigate(routeUrls.folder(folderName));
      }
      const getFoldersQueryKey = folderQueries.getFolders(queryClient).queryKey;
      queryClient.invalidateQueries({
        queryKey: getFoldersQueryKey,
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousFolders) {
        const getFoldersQueryKey =
          folderQueries.getFolders(queryClient).queryKey;
        queryClient.setQueryData(getFoldersQueryKey, context.previousFolders);
      }
      if (error instanceof Error) variables.setErrorText(error.message);
      else
        variables.setErrorText(
          'An unknown error occurred. Please try again later.'
        );
    },
  });
}

/**
 * Custom hook to handle inline folder renaming (without form submission).
 * Designed for use in file tree components.
 */
export function useFolderRenameInlineMutation() {
  return useMutation({
    mutationFn: async ({
      oldFolderPath,
      newFolderName,
    }: {
      oldFolderPath: string;
      newFolderName: string;
      setErrorText: Dispatch<SetStateAction<string>>;
    }) => {
      const res = await RenameFolder(oldFolderPath, newFolderName);
      if (!res.success) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success('Folder renamed successfully', DEFAULT_SONNER_OPTIONS);
    },
    onError: (error, variables) => {
      if (error instanceof Error) {
        variables.setErrorText(error.message);
      } else {
        variables.setErrorText(
          'An unknown error occurred. Please try again later.'
        );
      }
    },
  });
}

/**
 * Custom hook to handle folder deletion through a dialog form submission.
 */
export function useFolderDeleteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folderFromSidebar,
    }: {
      folderFromSidebar: string;
      setErrorText: Dispatch<SetStateAction<string>>;
    }): Promise<boolean> => {
      // Handle folder deletion
      if (!folderFromSidebar) throw new Error('Something went wrong');
      const res = await DeleteFolder(folderFromSidebar);
      if (!res.success) throw new Error(res.message);
      return true;
    },
    onSuccess: () => {
      const getFoldersQueryKey = folderQueries.getFolders(queryClient).queryKey;
      queryClient.invalidateQueries({
        queryKey: getFoldersQueryKey,
      });
    },
    onError: (error, variables) => {
      if (error instanceof Error) variables.setErrorText(error.message);
      else
        variables.setErrorText(
          'An unknown error occurred. Please try again later.'
        );
    },
  });
}

/**
 * Custom hook to handle the "folder:create-dialog" Wails event.
 * Opens the create folder dialog when the event is received for the current window.
 */
export function useFolderCreateDialogEvent(): void {
  const openCreateFolderDialog = useCreateFolderDialog();

  useWailsEvent('folder:create-dialog', async (data) => {
    if (!(await isEventInCurrentWindow(data))) return;
    openCreateFolderDialog();
  });
}

/** Custom hook to handle revealing folders in Finder */
export function useFolderRevealInFinderMutation() {
  return useMutation({
    // The main function that handles revealing folders in Finder
    mutationFn: async ({ selectionRange }: { selectionRange: Set<string> }) => {
      // Limit the number of folders to reveal to 5
      const selectedFolders = [...selectionRange].slice(0, 5);

      // Reveal each selected folder in Finder
      const res = await Promise.all(
        selectedFolders.map(async (selectionRangeValue) => {
          const { value: folder } =
            getContentTypeAndValueFromSelectionRangeValue(selectionRangeValue);
          return await RevealFolderOrFileInFinder(`notes/${folder}`, true);
        })
      );

      // Check if any folder failed to reveal
      if (res.some((r) => !r.success)) {
        throw new Error('Failed to reveal a folder in Finder');
      }
    },
    // Handle errors that occur during the mutation
    onError: (e) => {
      if (e instanceof Error) {
        toast.error(e.message, DEFAULT_SONNER_OPTIONS);
      }
    },
  });
}
