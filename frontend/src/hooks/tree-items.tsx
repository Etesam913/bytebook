import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { AddFolder } from '../../bindings/github.com/etesam913/bytebook/internal/services/folderservice';
import { AddAttachmentsFromPaths } from '../../bindings/github.com/etesam913/bytebook/internal/services/nodeservice';
import { AddNoteToFolder } from '../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import {
  createFilePath,
  createFolderPath,
  joinPath,
  stripTrailingSlash,
} from '../utils/path';
import { QueryError } from '../utils/query';
import { navigateToPath } from '../utils/routes';
import { NAME_CHARS } from '../utils/string-formatting';
import { FILE_TYPE, FOLDER_TYPE } from '../utils/tree-item-types';

type TreeItemType = typeof FOLDER_TYPE | typeof FILE_TYPE;

export type AddTreeItemVariables = {
  parentFolderPath: string | null;
  addType: TreeItemType;
  newName: string;
};

/**
 * A mutation hook for adding new tree items (folders or notes). Validates the
 * name, creates the item via the backend service, and navigates to the newly
 * created item. The `folder:create` / `file:create` watcher event that follows
 * inserts the new path into the @pierre/trees model.
 */
export function useAddTreeItemMutation() {
  return useMutation({
    mutationFn: async ({
      parentFolderPath,
      addType,
      newName,
    }: AddTreeItemVariables) => {
      const trimmedName = newName.trim();
      if (!NAME_CHARS.test(trimmedName)) {
        throw new Error(
          'Names can only contain letters, numbers, spaces, hyphens, and underscores.'
        );
      }
      if (addType === FILE_TYPE && !parentFolderPath) {
        throw new Error('Parent folder is required to add a note');
      }

      const newItemPath =
        addType === FOLDER_TYPE
          ? createFolderPath(joinPath(parentFolderPath, trimmedName))
          : createFilePath(joinPath(parentFolderPath, `${trimmedName}.md`));
      if (!newItemPath) {
        throw new Error(`"${trimmedName}" is not a valid name`);
      }

      const res =
        newItemPath.type === FOLDER_TYPE
          ? await AddFolder(stripTrailingSlash(newItemPath.fullPath))
          : await AddNoteToFolder(
              stripTrailingSlash(parentFolderPath!),
              trimmedName
            );
      if (!res.success) throw new QueryError(res.message);

      navigateToPath(newItemPath);

      return { addType, newPath: newItemPath.fullPath };
    },
  });
}

/**
 * Shared state machine for the inline "create folder/note" flows (the sidebar
 * tree header and the folder view's create card). Owns the pending item type,
 * the name input value, and the submit/cancel handling around
 * `useAddTreeItemMutation`.
 */
export function useCreateTreeItemForm({
  parentFolderPath,
}: {
  parentFolderPath: string | null;
}) {
  const {
    mutate: addTreeItem,
    isPending,
    error,
    reset,
  } = useAddTreeItemMutation();
  const [creatingItemType, setCreatingItemType] = useState<TreeItemType | null>(
    null
  );
  const [name, setName] = useState('');

  function startCreating(itemType: TreeItemType) {
    reset();
    setName('');
    setCreatingItemType(itemType);
  }

  function cancelCreating() {
    reset();
    setName('');
    setCreatingItemType(null);
  }

  function submit() {
    const trimmedName = name.trim();
    if (!trimmedName || !creatingItemType) {
      cancelCreating();
      return;
    }
    if (isPending) return;
    addTreeItem(
      { parentFolderPath, addType: creatingItemType, newName: trimmedName },
      { onSuccess: cancelCreating }
    );
  }

  const errorText =
    error instanceof Error ? error.message : error ? 'An error occurred' : '';

  return {
    creatingItemType,
    name,
    setName,
    isPending,
    errorText,
    startCreating,
    cancelCreating,
    submit,
  };
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

      const res = await AddAttachmentsFromPaths(
        stripTrailingSlash(folderPath),
        filePaths
      );
      if (!res.success) {
        throw new QueryError(res.message);
      }
      return res.data ?? [];
    },
  });
}
