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
 * The folder view's grid (`FolderRenderer`) reads from a
 * `['folder-children', folderPath]` infinite query that isn't backed by the
 * file tree model, so any file-watcher event has to invalidate it for disk
 * changes to appear in the grid. Mounted in `App` so it stays active even
 * when the sidebar tree is unmounted.
 */
export function useFolderChildrenInvalidation() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.folderChildrenAll(),
    });
  };

  useWailsEvent(FOLDER_CREATE, invalidate);
  useWailsEvent(FILE_CREATE, invalidate);
  useWailsEvent(FOLDER_DELETE, invalidate);
  useWailsEvent(FILE_DELETE, invalidate);
  useWailsEvent(FOLDER_RENAME, invalidate);
  useWailsEvent(FILE_RENAME, invalidate);
}
