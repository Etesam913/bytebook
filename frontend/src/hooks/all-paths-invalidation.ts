import { useQueryClient } from '@tanstack/react-query';
import { useWailsEvent } from './events';
import {
  FILE_CREATE,
  FILE_DELETE,
  FILE_RENAME,
  FOLDER_CREATE,
  FOLDER_DELETE,
  FOLDER_RENAME,
} from '../utils/events';
import { queryKeys } from '../utils/query-keys';

/**
 * The full vault path list (`useAllPaths`) backs both the folder view's grid
 * and the sidebar tree's phase-2 sync, so any file-watcher event has to
 * invalidate it for disk changes to appear. Mounted in `App` so it stays
 * active even when the sidebar tree is unmounted (<Activity> hides it).
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
  useWailsEvent(FOLDER_RENAME, invalidate);
  useWailsEvent(FILE_RENAME, invalidate);
}
