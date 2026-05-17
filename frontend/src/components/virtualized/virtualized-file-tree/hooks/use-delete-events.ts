import { useQueryClient } from '@tanstack/react-query';
import { useAtom, useSetAtom } from 'jotai';
import { navigate } from 'wouter/use-browser-location';
import { fileTreeDataAtom, sidebarSelectionAtom } from '../../../../atoms';
import { WailsEvent, useWailsEvent } from '../../../../hooks/events';
import {
  useFilePathFromRoute,
  useFolderPathFromRoute,
} from '../../../../hooks/routes';
import { FILE_DELETE, FOLDER_DELETE } from '../../../../utils/events';
import { logger } from '../../../../utils/logging';
import { getSelectionValue } from '../../../../utils/selection';
import {
  getNavigationTargetForDeletedPaths,
  removePathsFromFileTree,
} from '../utils/delete-node';

/**
 * Handles `folder:delete` and `file:delete` Wails events with shared logic:
 * - Invalidate the top-level query for top-level paths
 * - Immutably remove deleted nodes and their subtrees
 * - Navigate away if the current route was among the deleted paths
 */
export function useDeleteEvents() {
  const queryClient = useQueryClient();
  const [fileTreeData, setFileTreeData] = useAtom(fileTreeDataAtom);
  const setSidebarSelection = useSetAtom(sidebarSelectionAtom);
  const currentRouteFilePath = useFilePathFromRoute();
  const currentRouteFolderPath = useFolderPathFromRoute();
  const currentRoutePath =
    currentRouteFilePath?.fullPath ?? currentRouteFolderPath?.fullPath ?? null;

  function handleDelete(
    eventName: typeof FILE_DELETE | typeof FOLDER_DELETE,
    body: WailsEvent
  ) {
    logger.event(eventName, body);
    const rawData = body.data as Array<Record<string, string>>;
    // Extract paths from event data before mutating the tree
    const paths: string[] = [];
    for (const item of rawData) {
      const path =
        eventName === FILE_DELETE
          ? (item as { filePath: string }).filePath
          : (item as { folderPath: string }).folderPath;
      paths.push(path);
    }

    let needsTopLevelInvalidation = false;
    let removedIds: Set<string> = new Set();
    setFileTreeData((prev) => {
      const result = removePathsFromFileTree(prev, paths);
      needsTopLevelInvalidation = result.needsTopLevelInvalidation;
      removedIds = result.removedIds;
      if (!result.didChange) return prev;
      return result.next;
    });

    if (removedIds.size > 0) {
      setSidebarSelection((prev) => {
        let changed = false;
        const nextSelections = new Set<string>();
        for (const key of prev.selections) {
          const id = getSelectionValue(key);
          if (id && removedIds.has(id)) {
            changed = true;
            continue;
          }
          nextSelections.add(key);
        }

        let nextAnchor = prev.anchorSelection;
        if (nextAnchor) {
          const anchorId = getSelectionValue(nextAnchor);
          if (anchorId && removedIds.has(anchorId)) {
            nextAnchor = null;
            changed = true;
          }
        }

        if (!changed) return prev;
        return { selections: nextSelections, anchorSelection: nextAnchor };
      });
    }

    if (needsTopLevelInvalidation) {
      void queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
    }

    // The folder view's grid (`FolderRenderer`) reads from a
    // `['folder-children', folderPath]` infinite query that isn't backed by
    // `fileTreeDataAtom`, so invalidate it on every delete to keep the grid
    // in sync.
    void queryClient.invalidateQueries({ queryKey: ['folder-children'] });

    // Compute navigation target before tree mutation using pre-mutation state
    const navigationTarget = getNavigationTargetForDeletedPaths({
      currentRoutePath,
      fileTreeData,
      paths,
    });

    if (navigationTarget) {
      navigate(navigationTarget);
    }
  }

  useWailsEvent(FOLDER_DELETE, (body) => handleDelete(FOLDER_DELETE, body));
  useWailsEvent(FILE_DELETE, (body) => handleDelete(FILE_DELETE, body));
}
