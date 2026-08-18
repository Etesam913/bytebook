import { useQuery } from '@tanstack/react-query';
import { GetAllPaths } from '../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';
import { QueryError } from '../utils/query';
import { queryKeys } from '../utils/query-keys';

/**
 * Loads every file and folder path under the notes directory in a single
 * backend call. The result is already sorted with trailing-slash directories,
 * ready for `preparePresortedFileTreeInput`.
 *
 * This list is the single source of truth for both the sidebar tree and the
 * folder grid: `useAllPathsInvalidation` (mounted in App) invalidates it on
 * every file-watcher event, and `useSyncAllPaths` folds refetches into the
 * tree model. A window-focus refetch would only duplicate that work.
 */
export function useAllPaths() {
  return useQuery({
    queryKey: queryKeys.allPaths(),
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
