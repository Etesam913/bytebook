import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { MoveItemsToFolder } from '@bindings/services/filetreeservice';
import { RenameFolder } from '@bindings/services/folderservice';
import { SelectAttachmentPaths } from '@bindings/services/nodeservice';
import { RenameFile } from '@bindings/services/noteservice';
import { backendQueryAtom } from '@/atoms';
import {
  replaceLastPathSegment,
  stripTrailingSlash,
  type FilePath,
} from '@utils/path';
import { QueryError, getBackendResponseData } from '@utils/query';
import { queryKeys } from '@utils/query-keys';
import { NAME_CHARS } from '@utils/string-formatting';
import { importFilesToFolder } from '@utils/import-files';

export type RenameTreeItemPayload = (
  | RenameFolderPayload
  | RenameFilePayload
) & {
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
 * A mutation hook for renaming files or folders. The backend only performs
 * the rename on disk — the `file:rename` / `folder:rename` watcher event that
 * follows is what updates the query caches (`useAllPathsInvalidation`), the
 * route (`useSyncRouteWithRenames`), and the @pierre/trees model
 * (`usePierreTreeEvents`, skipped when the inline rename already moved it).
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

      await getBackendResponseData(
        args.itemType === 'folder'
          ? RenameFolder(oldPath, newPath)
          : RenameFile(oldPath, newPath)
      );
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
      onError?: () => void;
    }) => {
      const targetFolder = stripTrailingSlash(newFolder);
      const filtered = itemPaths.map(stripTrailingSlash).filter((path) => {
        if (path === targetFolder) return false;
        const parentPath = path.split('/').slice(0, -1).join('/');
        if (parentPath === targetFolder) return false;
        return true;
      });
      if (filtered.length === 0) return;
      await getBackendResponseData(MoveItemsToFolder(filtered, targetFolder));
    },
    onError: (_error, variables) => variables.onError?.(),
    // Keep the mutation pending until the authoritative paths have refreshed.
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.allPaths(),
      }),
  });
}

/**
 * A mutation hook for adding picked files to a folder.
 * Blocks interaction during native file selection, then reports copy progress in a toast.
 */
export function useAddFilesToFolderMutation() {
  const setBackendQuery = useSetAtom(backendQueryAtom);

  return useMutation({
    mutationFn: async (folderPath: string) => {
      let filePaths: string[];
      try {
        filePaths =
          (await getBackendResponseData(SelectAttachmentPaths())) ?? [];
      } catch (error) {
        throw error instanceof QueryError
          ? error
          : new QueryError(
              error instanceof Error ? error.message : String(error)
            );
      } finally {
        setBackendQuery({ isLoading: false, message: '' });
      }
      return importFilesToFolder({ folderPath, filePaths });
    },
    onMutate: () => {
      setBackendQuery({
        isLoading: true,
        message: `Adding files ...`,
      });
    },
  });
}
