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
import { queryKeys } from '../../../../utils/query-keys';
import { insertCreatedNodeIntoFileTree } from '../utils/create-node';
import {
  getParentNodeFromPath,
  isTreeNodeAFolder,
} from '../utils/file-tree-utils';
import { renameOrMoveNodes } from '../utils/rename-node';

/**
 * A mutation hook for adding new tree items (folders or notes) to the file tree.
 * Validates the name, creates the item via the backend service, and navigates
 * to the newly created item.
 */
type AddTreeItemVariables = {
  parentFolder: Folder | null;
  addType: typeof FOLDER_TYPE | typeof FILE_TYPE;
  newName: string;
  onSuccess?: () => void;
};

export function useAddTreeItemMutation() {
  const setFileTreeData = useSetAtom(fileTreeDataAtom);
  const queryClient = useQueryClient();
  const store = useStore();

  return useMutation({
    mutationFn: async ({
      parentFolder,
      addType,
      newName,
    }: AddTreeItemVariables) => {
      const trimmedName = newName.trim();
      if (!NAME_CHARS.test(trimmedName)) {
        throw new Error(
          'Names can only contain letters, numbers, spaces, hyphens, and underscores.'
        );
      }
      if (addType === FILE_TYPE && !parentFolder) {
        throw new Error('Parent folder is required to add a note');
      }

      const isTopLevel = !parentFolder;
      const newPath =
        addType === FOLDER_TYPE
          ? parentFolder
            ? `${parentFolder.path}/${trimmedName}`
            : trimmedName
          : `${parentFolder!.path}/${trimmedName}.md`;

      // Snapshot for rollback, then optimistically insert + navigate before
      // the backend call. The follow-up `folder:create` / `file:create`
      // watcher event is idempotent (skips paths already in the tree).
      const previousFileTreeData = store.get(fileTreeDataAtom);
      setFileTreeData((prev) => {
        // Top-level folders have no parent in the tree, so the general-purpose
        // insert helper bails. Insert directly with `parentId: null` to avoid
        // a NotFound flicker when FolderRenderer mounts before the backend
        // ack + `top-level-files` refetch lands.
        // `reconcileTopLevelFileTreeMap` dedupes by path on refetch and
        // preserves this optimistic id.
        if (addType === FOLDER_TYPE && isTopLevel) {
          if (prev.filePathToTreeDataId.has(newPath)) return prev;
          const id = globalThis.crypto.randomUUID();
          const treeData = new Map(prev.treeData);
          const filePathToTreeDataId = new Map(prev.filePathToTreeDataId);
          treeData.set(id, {
            id,
            type: FOLDER_TYPE,
            name: trimmedName,
            path: newPath,
            parentId: null,
            childrenIds: [],
            childrenCursor: '',
            hasMoreChildren: false,
            isOpen: false,
          });
          filePathToTreeDataId.set(newPath, id);
          return { treeData, filePathToTreeDataId };
        }
        return insertCreatedNodeIntoFileTree(prev, newPath, addType) ?? prev;
      });

      if (addType === FOLDER_TYPE) {
        const folderPath = createFolderPath(newPath);
        if (folderPath) navigate(folderPath.encodedFolderUrl);
      } else {
        const filePath = createFilePath(newPath);
        if (filePath) navigate(filePath.encodedFileUrl);
      }

      try {
        const res =
          addType === FOLDER_TYPE
            ? await AddFolder(newPath)
            : await AddNoteToFolder(parentFolder!.path, trimmedName);
        if (!res.success) throw new Error(res.message);
      } catch (err) {
        setFileTreeData(previousFileTreeData);
        throw err;
      }

      // Refresh the top-level list so the backend's authoritative id and
      // ordering replace our optimistic insert. `reconcileTopLevelFileTreeMap`
      // dedupes by path, so this won't double-insert.
      if (addType === FOLDER_TYPE && isTopLevel) {
        void queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
      }

      return { addType, newPath };
    },
    onSuccess: (_, variables) => {
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
        const { nextFileTreeData, needsTopLevelInvalidation: topLevel } =
          renameOrMoveNodes({
            fileTreeData: prev,
            entries: [{ oldPath, newPath }],
            mode: args.itemType,
          });
        needsTopLevelInvalidation = topLevel;
        return nextFileTreeData;
      });

      if (needsTopLevelInvalidation) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.topLevelFiles(),
        });
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
  const setFileTreeData = useSetAtom(fileTreeDataAtom);
  const { selections } = useAtomValue(sidebarSelectionAtom);
  const queryClient = useQueryClient();
  const store = useStore();

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

      if (selectedItems.length === 0) return;

      const previousFileTreeData = store.get(fileTreeDataAtom);
      let needsTopLevelInvalidation = false;

      const foldersToMove = selectedItems
        .filter(isTreeNodeAFolder)
        .map((item) => ({
          oldPath: item.path,
          newPath: newFolder === '' ? item.name : `${newFolder}/${item.name}`,
        }));

      const filesToMove = selectedItems
        .filter((item) => !isTreeNodeAFolder(item))
        .map((item) => ({
          oldPath: item.path,
          newPath: newFolder === '' ? item.name : `${newFolder}/${item.name}`,
        }));

      setFileTreeData((prev) => {
        let currentTreeData = prev;

        // Process folder moves
        if (foldersToMove.length > 0) {
          const { nextFileTreeData, needsTopLevelInvalidation: topLevel } =
            renameOrMoveNodes({
              fileTreeData: currentTreeData,
              entries: foldersToMove,
              mode: 'folder',
            });
          currentTreeData = nextFileTreeData;
          if (topLevel) needsTopLevelInvalidation = true;
        }

        // Process file moves
        if (filesToMove.length > 0) {
          const { nextFileTreeData, needsTopLevelInvalidation: topLevel } =
            renameOrMoveNodes({
              fileTreeData: currentTreeData,
              entries: filesToMove,
              mode: 'file',
            });
          currentTreeData = nextFileTreeData;
          if (topLevel) needsTopLevelInvalidation = true;
        }

        return currentTreeData;
      });

      if (needsTopLevelInvalidation) {
        void queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
      }
      void queryClient.invalidateQueries({ queryKey: ['folder-children'] });

      try {
        const itemPaths = selectedItems.map((item) => item.path);
        const res = await MoveItemsToFolder(itemPaths, newFolder);
        if (!res.success) {
          throw new QueryError(res.message);
        }
      } catch (err) {
        setFileTreeData(previousFileTreeData);
        throw err;
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
