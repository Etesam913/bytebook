import { useQuery } from '@tanstack/react-query';
import {
  GetAllPaths,
  GetTopLevelItems,
} from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';
import { QueryError } from '../../../../utils/query';
import { FOLDER_TYPE } from '../types';

/**
 * Loads just the top-level entries of the notes directory. This resolves in a
 * millisecond or two, so the tree can paint immediately while the full path
 * list from `useAllPaths` is still in flight. Directory paths include a
 * trailing slash, as @pierre/trees requires to distinguish them from files.
 */
export function useTopLevelPaths() {
  return useQuery({
    queryKey: ['file-tree', 'top-level-paths'],
    queryFn: async (): Promise<string[]> => {
      const res = await GetTopLevelItems();
      if (!res.success || !res.data) {
        throw new QueryError(res.message);
      }
      return res.data.map((item) =>
        item.type === FOLDER_TYPE ? `${item.path}/` : item.path
      );
    },
  });
}

/**
 * Loads every file and folder path under the notes directory in a single
 * backend call. The result is already sorted with trailing-slash directories,
 * ready for `preparePresortedFileTreeInput`.
 *
 * Watcher events keep the mounted tree model in sync after this resolves, so
 * a window-focus refetch would only cause a pointless `resetPaths`.
 */
export function useAllPaths() {
  return useQuery({
    queryKey: ['file-tree', 'all-paths'],
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
