import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { GetAllPaths } from '@bindings/services/filetreeservice';
import { useWailsEvent } from './events';
import {
  FILE_CREATE,
  FILE_DELETE,
  FILE_RENAME,
  FOLDER_CREATE,
  FOLDER_DELETE,
  FOLDER_RENAME,
} from '@utils/events';
import { remapPathThroughRenames, type PathRename } from '@utils/path';
import { QueryError } from '@utils/query';
import { queryKeys } from '@utils/query-keys';

/**
 * Loads every file and folder path under the notes directory in a single
 * backend call. Directories carry a trailing slash; the list is passed through
 * `prepareFileTreeInput` before reaching the tree model.
 *
 * This list is the single source of truth for both the sidebar tree and the
 * folder grid: `useAllPathsInvalidation` (mounted in App) invalidates it on
 * every file-watcher event, and `useSyncAllPaths` folds refetches into the
 * tree model. A window-focus refetch would only duplicate that work.
 */
export function useAllPaths() {
  return useQuery({
    queryKey: queryKeys.allPaths(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<string[]> => {
      const res = await GetAllPaths();
      if (!res.success || !res.data) {
        throw new QueryError(res.message);
      }
      return res.data;
    },
  });
}

/**
 * Optimistically remaps the vault path list before rename-driven navigation.
 * The invalidation that follows reconciles this immediate update with disk.
 */
function remapAllPathsCache({
  queryClient,
  renames,
  isFolder,
}: {
  queryClient: QueryClient;
  renames: readonly PathRename[];
  isFolder: boolean;
}) {
  queryClient.setQueryData<string[]>(queryKeys.allPaths(), (paths) =>
    paths?.map(
      (path) => remapPathThroughRenames({ path, renames, isFolder }) ?? path
    )
  );
}

/**
 * The full vault path list (`useAllPaths`) backs both the folder view's grid
 * and the sidebar tree's phase-2 sync, so any file-watcher event has to
 * invalidate it for disk changes to appear. Mounted in `App` so it stays
 * active independently of whether the sidebar tree is CSS-hidden.
 */
export function useAllPathsInvalidation() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.allPaths(),
    });
  };

  useWailsEvent(FOLDER_CREATE, invalidate);
  useWailsEvent(FILE_CREATE, invalidate);
  useWailsEvent(FOLDER_DELETE, invalidate);
  useWailsEvent(FILE_DELETE, invalidate);
  useWailsEvent(FOLDER_RENAME, (event) => {
    const renames = (
      (event.data as Array<{
        oldFolderPath: string;
        newFolderPath: string;
      }>) ?? []
    ).map((item) => ({
      oldPath: item.oldFolderPath,
      newPath: item.newFolderPath,
    }));
    remapAllPathsCache({ queryClient, renames, isFolder: true });
    invalidate();
  });
  useWailsEvent(FILE_RENAME, (event) => {
    const renames = (
      (event.data as Array<{ oldFilePath: string; newFilePath: string }>) ?? []
    ).map((item) => ({
      oldPath: item.oldFilePath,
      newPath: item.newFilePath,
    }));
    remapAllPathsCache({ queryClient, renames, isFolder: false });
    invalidate();
  });
}
