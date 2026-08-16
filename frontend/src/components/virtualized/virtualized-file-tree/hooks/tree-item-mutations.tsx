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
import { FILE_TYPE, FOLDER_TYPE } from '../types';
import { MoveItemsToFolder } from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';
import { useSetAtom } from 'jotai';
import { backendQueryAtom } from '../../../../atoms';
import { QueryError } from '../../../../utils/query';
import { queryKeys } from '../../../../utils/query-keys';

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

      const newPath =
        addType === FOLDER_TYPE
          ? parentFolderPath
            ? `${parentFolderPath}/${trimmedName}`
            : trimmedName
          : `${parentFolderPath}/${trimmedName}.md`;

      const res =
        addType === FOLDER_TYPE
          ? await AddFolder(newPath)
          : await AddNoteToFolder(parentFolderPath!, trimmedName);
      if (!res.success) throw new Error(res.message);

      if (addType === FOLDER_TYPE) {
        const folderPath = createFolderPath(newPath);
        if (folderPath) navigate(folderPath.encodedFolderUrl);
      } else {
        const filePath = createFilePath(newPath);
        if (filePath) navigate(filePath.encodedFileUrl);
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
 * A mutation hook for renaming files or folders. The backend performs the
 * rename on disk; the `file:rename` / `folder:rename` watcher event that
 * follows moves the path in the @pierre/trees model (and is skipped if the
 * model already applied the move from its inline rename UI).
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

      const oldPath =
        args.itemType === 'folder' ? args.folderPath : args.filePath.fullPath;
      const newLastSegment =
        args.itemType === 'folder'
          ? trimmedName
          : `${trimmedName}.${args.filePath.extension}`;
      const newPath = replaceLastPathSegment(oldPath, newLastSegment);

      const res =
        args.itemType === 'folder'
          ? await RenameFolder(oldPath, newPath)
          : await RenameFile(oldPath, newPath);
      if (!res.success) throw new Error(res.message);
      return { itemType: args.itemType };
    },
    onSuccess: (_, variables) => {
      variables.onSuccess?.();
    },
  });
}

/**
 * A mutation hook for moving items to a new folder. Callers pass the source
 * paths and the destination folder path directly — selection is owned by the
 * @pierre/trees model, so there is no atom to consult.
 */
export function useMoveTreeItemsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemPaths,
      newFolder,
    }: {
      itemPaths: readonly string[];
      newFolder: string;
    }) => {
      const filtered = itemPaths.filter((path) => {
        if (path === newFolder) return false;
        const parentPath = path.split('/').slice(0, -1).join('/');
        if (parentPath === newFolder) return false;
        return true;
      });
      if (filtered.length === 0) return;
      const res = await MoveItemsToFolder([...filtered], newFolder);
      if (!res.success) {
        throw new QueryError(res.message);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.folderChildrenAll(),
      });
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
      return res.data ?? [];
    },
  });
}
