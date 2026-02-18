import { useMutation } from '@tanstack/react-query';
import { navigate } from 'wouter/use-browser-location';
import {
  AddFolder,
  RenameFolder,
} from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/folderservice';
import {
  AddNoteToFolder,
  RenameFile,
} from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import { createFilePath, type FilePath } from '../../../../utils/path';
import { NAME_CHARS } from '../../../../utils/string-formatting';
import { FileOrFolder, type Folder } from '../types';
import { MoveItemsToFolder } from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';
import { getSelectionValue } from '../../../../utils/selection';
import { useAtomValue } from 'jotai';
import { fileTreeDataAtom } from '..';
import { sidebarSelectionAtom } from '../../../../atoms';
import { QueryError } from '../../../../utils/query';
import { setSkipRevealForPath } from '../utils/route-focus-intent';

const CREATE_NAVIGATION_DELAY_MS = 300;

/**
 * A mutation hook for adding new tree items (folders or notes) to the file tree.
 * Validates the name, creates the item via the backend service, and navigates
 * to the new note if one was created.
 */
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
        setSkipRevealForPath(result.newNotePath);
        setTimeout(() => {
          if (filePath) {
            navigate(filePath.encodedFileUrl);
          }
        }, CREATE_NAVIGATION_DELAY_MS);
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
