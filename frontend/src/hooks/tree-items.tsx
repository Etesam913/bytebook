import { useMutation } from '@tanstack/react-query';
import { navigate } from 'wouter/use-browser-location';
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
import { NAME_CHARS } from '../utils/string-formatting';
import { FILE_TYPE, FOLDER_TYPE } from '../utils/tree-item-types';

type AddTreeItemVariables = {
  parentFolderPath: string | null;
  addType: typeof FOLDER_TYPE | typeof FILE_TYPE;
  newName: string;
  onSuccess?: () => void;
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
      if (!res.success) throw new Error(res.message);

      navigate(
        newItemPath.type === FOLDER_TYPE
          ? newItemPath.encodedFolderUrl
          : newItemPath.encodedFileUrl
      );

      return { addType, newPath: newItemPath.fullPath };
    },
    onSuccess: (_, variables) => {
      variables.onSuccess?.();
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
