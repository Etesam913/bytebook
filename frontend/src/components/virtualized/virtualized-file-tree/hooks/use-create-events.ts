import { useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { logger } from '../../../../utils/logging';
import { FileTreeData, fileTreeDataAtom } from '../../../../atoms';
import { useWailsEvent, type WailsEvent } from '../../../../hooks/events';
import { FILE_CREATE, FOLDER_CREATE } from '../../../../utils/events';
import { getParentNodeFromPath } from '../utils/file-tree-utils';
import { insertCreatedNodeIntoFileTree } from '../utils/create-node';
import { queryKeys } from '../../../../utils/query-keys';

/**
 * Handles `folder:create` and `file:create` Wails events with shared logic:
 * Skip paths already present in the file tree
 * Invalidate the top-level query for top-level or unmapped paths
 * Reveal newly created paths whose parent folder is already open
 */
export function useCreateEvents() {
  const queryClient = useQueryClient();
  const setFileTreeData = useSetAtom(fileTreeDataAtom);

  function handleCreate(
    eventName: typeof FOLDER_CREATE | typeof FILE_CREATE,
    body: WailsEvent
  ) {
    logger.event(eventName, body);
    const rawData = body.data as Array<Record<string, string>>;
    let needsTopLevelInvalidation = false;
    setFileTreeData((prev) => {
      let current: FileTreeData = prev;
      let didChange = false;

      for (const item of rawData) {
        const path =
          eventName === FOLDER_CREATE
            ? (item as { folderPath: string }).folderPath
            : (item as { filePath: string }).filePath;

        if (current.filePathToTreeDataId.has(path)) {
          continue;
        }

        const parentNode = getParentNodeFromPath(current, path);
        if (!parentNode) {
          needsTopLevelInvalidation = true;
          continue;
        }

        const nodeType = eventName === FOLDER_CREATE ? 'folder' : 'file';
        const result = insertCreatedNodeIntoFileTree(current, path, nodeType);

        if (!result) {
          continue;
        }

        current = result;
        didChange = true;
      }

      if (!didChange) return prev;

      return current;
    });

    if (needsTopLevelInvalidation) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.topLevelFiles(),
      });
    }

    // The folder view's grid (`FolderRenderer`) reads from a
    // `['folder-children', folderPath]` infinite query that isn't backed by
    // `fileTreeDataAtom`, so invalidate it so newly created children appear
    // in the grid.
    void queryClient.invalidateQueries({ queryKey: ['folder-children'] });
  }

  useWailsEvent(FOLDER_CREATE, (body) => handleCreate(FOLDER_CREATE, body));
  useWailsEvent(FILE_CREATE, (body) => handleCreate(FILE_CREATE, body));
}
