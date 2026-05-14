import { useMutation, useQueryClient } from '@tanstack/react-query';
import { navigate } from 'wouter/use-browser-location';
import {
  AddFolder,
  RenameFolder,
} from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/folderservice';
import {
  AddAttachments,
  AddAttachmentsFromPaths,
} from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/nodeservice';
import {
  AddNoteToFolder,
  RenameFile,
} from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import {
  createFilePath,
  createFolderPath,
  replaceLastPathSegment,
  type FilePath,
} from '../../../../utils/path';
import { NAME_CHARS } from '../../../../utils/string-formatting';
import { FILE_TYPE, FOLDER_TYPE, FileOrFolder, type Folder } from '../types';
import { MoveItemsToFolder } from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';
import { getSelectionValue } from '../../../../utils/selection';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { fileTreeDataAtom } from '../../../../atoms';
import { backendQueryAtom, sidebarSelectionAtom } from '../../../../atoms';
import { QueryError } from '../../../../utils/query';
import { insertCreatedNodeIntoFileTree } from '../utils/create-node';
import {
  getParentNodeFromPath,
  isTreeNodeAFolder,
} from '../utils/file-tree-utils';
import {
  applyParentFolderUpdates,
  applyPathRemappings,
  buildRenameUpdates,
} from '../utils/rename-node';

/**
 * A mutation hook for adding new tree items (folders or notes) to the file tree.
 * Validates the name, creates the item via the backend service, and navigates
 * to the newly created item.
 */
export function useAddTreeItemMutation() {
  const setFileTreeData = useSetAtom(fileTreeDataAtom);

  return useMutation({
    mutationFn: async ({
      parentFolder,
      addType,
      newName,
    }: {
      parentFolder: Folder | null;
      addType: typeof FOLDER_TYPE | typeof FILE_TYPE;
      newName: string;
      onSuccess?: () => void;
    }) => {
      if (!NAME_CHARS.test(newName)) {
        throw new Error(
          'Names can only contain letters, numbers, spaces, hyphens, and underscores.'
        );
      }

      if (addType === FOLDER_TYPE) {
        // Create folder: path is parentFolder/newFolderName (or top-level if null)
        const newFolderPath = parentFolder
          ? `${parentFolder.path}/${newName}`
          : newName;
        const res = await AddFolder(newFolderPath);
        if (!res.success) {
          throw new Error(res.message);
        }
        return {
          addType,
          parentPath: parentFolder?.path ?? '',
          newName,
          newFolderPath,
        };
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
      if (result.addType === FOLDER_TYPE) {
        // Optimistically insert the node into tree data
        setFileTreeData(
          (prev) =>
            insertCreatedNodeIntoFileTree(
              prev,
              result.newFolderPath,
              FOLDER_TYPE
            ) ?? prev
        );

        const folderPath = createFolderPath(result.newFolderPath);
        if (folderPath) {
          console.log('navigating to folder', folderPath.encodedFolderUrl);
          navigate(folderPath.encodedFolderUrl);
        }
      }

      if (result.addType === FILE_TYPE) {
        // Optimistically insert the node into tree data
        setFileTreeData((prev) => {
          return (
            insertCreatedNodeIntoFileTree(
              prev,
              result.newNotePath,
              FILE_TYPE
            ) ?? prev
          );
        });

        const filePath = createFilePath(result.newNotePath);
        if (filePath) {
          navigate(filePath.encodedFileUrl);
        }
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

/**
 * A mutation hook for renaming files or folders in the file tree.
 *
 * Applies the rename to `fileTreeDataAtom` optimistically (reusing the same
 * path-remap pipeline as the watcher event handler) before issuing the
 * backend call, and rolls back on error. The `file:rename` / `folder:rename`
 * event that follows is idempotent — its `buildRenameUpdates` won't find the
 * old path in the tree and bails out at `pathRemappings.size === 0`.
 */
export function useRenameTreeItemMutation() {
  const setFileTreeData = useSetAtom(fileTreeDataAtom);
  const queryClient = useQueryClient();
  const store = useStore();

  return useMutation({
    mutationFn: async (args: RenameTreeItemPayload) => {
      const trimmedName = args.newName.trim();
      if (!NAME_CHARS.test(trimmedName)) {
        throw new Error(
          'Names can only contain letters, numbers, spaces, hyphens, and underscores.'
        );
      }

      const oldPath =
        args.itemType === 'folder' ? args.folderPath : args.filePath.fullPath;
      const newLastSegment =
        args.itemType === 'folder'
          ? trimmedName
          : `${trimmedName}.${args.filePath.extension}`;
      const newPath = replaceLastPathSegment(oldPath, newLastSegment);

      // Snapshot for rollback, then apply the optimistic tree update
      // synchronously before awaiting the backend.
      const previousFileTreeData = store.get(fileTreeDataAtom);
      let needsTopLevelInvalidation = false;

      setFileTreeData((prev) => {
        const renameUpdates = buildRenameUpdates({
          entries: [{ oldPath, newPath }],
          fileTreeData: prev,
          isValidNode:
            args.itemType === 'folder'
              ? (node) => isTreeNodeAFolder(node)
              : undefined,
        });
        needsTopLevelInvalidation = renameUpdates.needsTopLevelInvalidation;
        if (renameUpdates.pathRemappings.size === 0) return prev;

        const remapped = applyPathRemappings({
          fileTreeData: prev,
          pathRemappings: renameUpdates.pathRemappings,
          nodeUpdates: renameUpdates.nodeUpdates,
          mode: args.itemType,
        });
        return applyParentFolderUpdates({
          treeData: remapped.treeData,
          filePathToTreeDataId: remapped.filePathToTreeDataId,
          parentFolderUpdates: renameUpdates.parentFolderUpdates,
        });
      });

      if (needsTopLevelInvalidation) {
        void queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
      }

      try {
        const res =
          args.itemType === 'folder'
            ? await RenameFolder(oldPath, newPath)
            : await RenameFile(oldPath, newPath);
        if (!res.success) throw new Error(res.message);
        return { itemType: args.itemType };
      } catch (err) {
        setFileTreeData(previousFileTreeData);
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      variables.onSuccess?.();
    },
  });
}

/**
 * A mutation hook for moving selected items to a new folder.
 * Retrieves the currently selected items from the sidebar selection atom,
 * looks them up in the file tree data, and calls the backend to move them.
 */
export function useMoveTreeItemsMutation() {
  const fileTreeData = useAtomValue(fileTreeDataAtom);
  const { selections } = useAtomValue(sidebarSelectionAtom);

  return useMutation({
    mutationFn: async (newFolder: string) => {
      if (selections.size === 0) {
        return;
      }
      // Get the selected items from the sidebar selection
      const selectedItems: FileOrFolder[] = [];
      for (const selectionKey of selections) {
        const itemId = getSelectionValue(selectionKey);
        if (!itemId) continue;
        const item = fileTreeData.treeData.get(itemId);
        if (!item) continue;

        if (item.path === newFolder) {
          return;
        }

        const parentFolder = getParentNodeFromPath(fileTreeData, item.path);

        // If the item's parent is the same as the new folder, it does not need to be moved
        // so we can skip it
        if (parentFolder && parentFolder.path === newFolder) {
          continue;
        }

        // Top-level items dropped on root don't need to move
        if (!parentFolder && newFolder === '') {
          continue;
        }

        selectedItems.push(item);
      }

      const itemPaths = selectedItems.map((item) => item.path);
      const res = await MoveItemsToFolder(itemPaths, newFolder);
      if (!res.success) {
        throw new QueryError(res.message);
      }
    },
  });
}

/**
 * A mutation hook for adding attachments to a folder.
 * Uses setBackendQuery to show a loading dialog.
 */
export function useAddFolderAttachmentsMutation() {
  const setBackendQuery = useSetAtom(backendQueryAtom);

  return useMutation({
    mutationFn: async (folderPath: string) => {
      const res = await AddAttachments(folderPath);
      if (!res.success) {
        throw new QueryError(res.message);
      }
      return res;
    },
    onMutate: () => {
      setBackendQuery({
        isLoading: true,
        message: `Adding attachments ...`,
      });
    },
    onSettled: () => {
      setBackendQuery({
        isLoading: false,
        message: '',
      });
    },
  });
}

/**
 * A mutation hook for adding dropped local files to a folder path in the tree.
 */
export function useAddDroppedFilesToFolderMutation() {
  return useMutation({
    mutationFn: async ({
      folderPath,
      filePaths,
    }: {
      folderPath: string;
      filePaths: string[];
    }): Promise<string[]> => {
      if (filePaths.length === 0) {
        return [];
      }

      const res = await AddAttachmentsFromPaths(folderPath, filePaths);
      if (!res.success) {
        throw new QueryError(res.message);
      }
      return res.paths ?? [];
    },
  });
}
