import {
  prepareFileTreeInput,
  type FileTree as PierreFileTree,
} from '@pierre/trees';
import { useEffect, useRef } from 'react';
import { isDirectoryHandle, setSortedTreePaths } from '../model-utils';
import { useAllPaths } from './use-all-paths';

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
  const lastSyncedPathsRef = useRef<readonly string[] | null>(null);

  useEffect(() => {
    if (!allPaths || lastSyncedPathsRef.current === allPaths) return;
    const previousPaths = lastSyncedPathsRef.current;
    lastSyncedPathsRef.current = allPaths;

    const preparedInput = prepareFileTreeInput(allPaths);
    // The prepared input's paths are in the tree's final row order — the
    // scroll-into-view helper needs it to map a path to a row index. This runs
    // on mount too (before any reveal effect), so it is the only writer.
    setSortedTreePaths(preparedInput.paths);

    // The model was constructed with this same path list, and content-identical
    // refetches need no coarse reset.
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
