import { useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { logger } from '../../../../utils/logging';
import { FileTreeData, fileTreeDataAtom } from '../../../../atoms';
import { useWailsEvent, type WailsEvent } from '../../../../hooks/events';
import {
  getParentNodeFromPath,
  insertCreatedNodeIntoFileTree,
} from '../utils/file-tree-utils';

/**
 * Handles `folder:create` and `note:create` Wails events with shared logic:
 * Skip paths already present in the file tree
 * Invalidate the top-level query for top-level or unmapped paths
 * Reveal newly created paths whose parent folder is already open
 */
export function useCreateEvents() {
  const queryClient = useQueryClient();
  const setFileTreeData = useSetAtom(fileTreeDataAtom);

  function handleCreate(
    eventName: 'folder:create' | 'note:create',
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
          eventName === 'folder:create'
            ? (item as { folderPath: string }).folderPath
            : (item as { notePath: string }).notePath;

        if (current.filePathToTreeDataId.has(path)) {
          continue;
        }

        const parentNode = getParentNodeFromPath(current, path);
        if (!parentNode) {
          needsTopLevelInvalidation = true;
          continue;
        }

        const nodeType = eventName === 'folder:create' ? 'folder' : 'file';
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
      queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
    }
  }

  useWailsEvent('folder:create', (body) => handleCreate('folder:create', body));
  useWailsEvent('note:create', (body) => handleCreate('note:create', body));
}
