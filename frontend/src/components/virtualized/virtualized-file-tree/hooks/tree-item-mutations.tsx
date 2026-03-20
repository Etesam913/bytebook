import { useMutation } from '@tanstack/react-query';
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
  type FilePath,
} from '../../../../utils/path';
import { NAME_CHARS } from '../../../../utils/string-formatting';
import { FILE_TYPE, FOLDER_TYPE, FileOrFolder, type Folder } from '../types';
import { MoveItemsToFolder } from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';
import { getSelectionValue } from '../../../../utils/selection';
import { useAtomValue, useSetAtom } from 'jotai';
import { fileTreeDataAtom } from '../../../../atoms';
import { backendQueryAtom, sidebarSelectionAtom } from '../../../../atoms';
import { QueryError } from '../../../../utils/query';
import { insertCreatedNodeIntoFileTree } from '../utils/create-node';

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
 * Validates the new name, calls the appropriate backend service (folder or file),
 * and displays a success toast on completion.
 */
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
  const { treeData: fileOrFolderMap } = useAtomValue(fileTreeDataAtom);
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
        const item = fileOrFolderMap.get(itemId);
        if (!item) continue;

        if (item.path === newFolder) {
          return;
        }

        if (item.type === FILE_TYPE) {
          const parentFolder = item.parentId
            ? fileOrFolderMap.get(item.parentId)
            : undefined;

          // If the item's parent is the same as the new folder, it does not need to be moved
          // so we can skip it
          if (
            parentFolder &&
            parentFolder.type === FOLDER_TYPE &&
            parentFolder.path === newFolder
          ) {
            continue;
          }
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
    }) => {
      if (filePaths.length === 0) {
        return;
      }

      const res = await AddAttachmentsFromPaths(folderPath, filePaths);
      if (!res.success) {
        throw new QueryError(res.message);
      }
    },
  });
}
