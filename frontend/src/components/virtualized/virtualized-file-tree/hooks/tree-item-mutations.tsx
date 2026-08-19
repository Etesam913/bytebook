import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { MoveItemsToFolder } from '@bindings/services/filetreeservice';
import { RenameFolder } from '@bindings/services/folderservice';
import { AddAttachments } from '@bindings/services/nodeservice';
import { RenameFile } from '@bindings/services/noteservice';
import { backendQueryAtom } from '@/atoms';
import {
  replaceLastPathSegment,
  stripTrailingSlash,
  type FilePath,
} from '@utils/path';
import { QueryError } from '@utils/query';
import { queryKeys } from '@utils/query-keys';
import { NAME_CHARS } from '@utils/string-formatting';

export type RenameTreeItemPayload = (
  | RenameFolderPayload
  | RenameFilePayload
) & {
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
        throw new QueryError(
          'Names can only contain letters, numbers, spaces, hyphens, and underscores.'
        );
      }

      const oldPath = stripTrailingSlash(
        args.itemType === 'folder' ? args.folderPath : args.filePath.fullPath
      );
      const newPath = replaceLastPathSegment(oldPath, trimmedName);

      const res =
        args.itemType === 'folder'
          ? await RenameFolder(oldPath, newPath)
          : await RenameFile(oldPath, newPath);
      if (!res.success) throw new QueryError(res.message);
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
      const targetFolder = stripTrailingSlash(newFolder);
      const filtered = itemPaths.map(stripTrailingSlash).filter((path) => {
        if (path === targetFolder) return false;
        const parentPath = path.split('/').slice(0, -1).join('/');
        if (parentPath === targetFolder) return false;
        return true;
      });
      if (filtered.length === 0) return;
      const res = await MoveItemsToFolder(filtered, targetFolder);
      if (!res.success) {
        throw new QueryError(res.message);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.allPaths(),
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
      const res = await AddAttachments(stripTrailingSlash(folderPath));
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
