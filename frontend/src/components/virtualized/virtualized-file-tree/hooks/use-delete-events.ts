import { useQueryClient } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { navigate } from 'wouter/use-browser-location';
import { fileTreeDataAtom } from '../../../../atoms';
import { WailsEvent, useWailsEvent } from '../../../../hooks/events';
import {
  useFilePathFromRoute,
  useFolderPathFromRoute,
} from '../../../../hooks/routes';
import { FOLDER_DELETE, NOTE_DELETE } from '../../../../utils/events';
import { logger } from '../../../../utils/logging';
import {
  getNavigationTargetForDeletedPaths,
  removePathsFromFileTree,
} from '../utils/delete-node';

/**
 * Handles `folder:delete` and `note:delete` Wails events with shared logic:
 * - Invalidate the top-level query for top-level paths
 * - Immutably remove deleted nodes and their subtrees
 * - Navigate away if the current route was among the deleted paths
 */
export function useDeleteEvents() {
  const queryClient = useQueryClient();
  const [fileTreeData, setFileTreeData] = useAtom(fileTreeDataAtom);
  const currentRouteFilePath = useFilePathFromRoute();
  const currentRouteFolderPath = useFolderPathFromRoute();
  const currentRoutePath =
    currentRouteFilePath?.fullPath ?? currentRouteFolderPath?.fullPath ?? null;

  function handleDelete(
    eventName: typeof NOTE_DELETE | typeof FOLDER_DELETE,
    body: WailsEvent
  ) {
    logger.event(eventName, body);
    const rawData = body.data as Array<Record<string, string>>;
    // Extract paths from event data before mutating the tree
    const paths: string[] = [];
    for (const item of rawData) {
      const path =
        eventName === NOTE_DELETE
          ? (item as { notePath: string }).notePath
          : (item as { folderPath: string }).folderPath;
      paths.push(path);
    }

    let needsTopLevelInvalidation = false;
    setFileTreeData((prev) => {
      const result = removePathsFromFileTree(prev, paths);
      needsTopLevelInvalidation = result.needsTopLevelInvalidation;
      if (!result.didChange) return prev;
      return result.next;
    });

    if (needsTopLevelInvalidation) {
      void queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
    }

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
  useWailsEvent(NOTE_DELETE, (body) => handleDelete(NOTE_DELETE, body));
}
