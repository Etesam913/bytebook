import {
  prepareFileTreeInput,
  type FileTree as PierreFileTree,
} from '@pierre/trees';
import { useEffect } from 'react';
import { isDirectoryHandle, setSortedTreePaths } from '../model-utils';
import { useAllPaths } from './use-all-paths';

/**
 * Identity of the path list the model was last synced with. Module-level for
 * the same reason as the shared model itself: the sync must survive the
 * <Activity> unmount/remount cycle of the sidebar's files panel.
 */
let lastSyncedPaths: readonly string[] | null = null;

function arePathListsEqual(
  a: readonly string[],
  b: readonly string[]
): boolean {
  return a.length === b.length && a.every((path, index) => path === b[index]);
}

/**
 * Keeps the @pierre/trees model in sync when `allPaths` refetches (such as
 * when `useAllPathsInvalidation` detects file-watcher changes on disk).
 * Returns the current path list so callers can react to path revisions.
 */
export function useSyncAllPaths(
  model: PierreFileTree
): readonly string[] | undefined {
  const allPaths = useAllPaths().data;

  useEffect(() => {
    if (!allPaths || lastSyncedPaths === allPaths) return;
    const previousPaths = lastSyncedPaths;
    lastSyncedPaths = allPaths;

    const preparedInput = prepareFileTreeInput(allPaths);
    // The prepared input's paths are in the tree's final row order — the
    // scroll-into-view helper needs it to map a path to a row index.
    setSortedTreePaths(preparedInput.paths);

    // Initial mount is already initialized by ensureSharedModel with allPaths,
    // and content-identical refetches need no coarse reset.
    if (previousPaths === null || arePathListsEqual(previousPaths, allPaths)) {
      return;
    }

    const expandedDirectories = allPaths.filter((path) => {
      if (!path.endsWith('/')) return false;
      const item = model.getItem(path);
      if (item === null || !isDirectoryHandle(item)) return false;
      return item.isExpanded();
    });
    const selectedPaths = model.getSelectedPaths();
    const focusedPath = model.getFocusedPath();

    model.resetPaths(allPaths, {
      preparedInput,
      initialExpandedPaths: expandedDirectories,
    });

    for (const path of selectedPaths) {
      model.getItem(path)?.select();
    }
    if (focusedPath) {
      model.focusNearestPath(focusedPath);
    }
  }, [model, allPaths]);

  return allPaths;
}
