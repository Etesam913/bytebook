import {
  prepareFileTreeInput,
  type FileTree as PierreFileTree,
  type FileTreeBatchOperation,
  type FileTreePreparedInput,
} from '@pierre/trees';
import { useEffect, useRef } from 'react';
import {
  applySortedTreePathMutation,
  initializeSortedTreePaths,
  isDirectoryHandle,
  setSortedTreePaths,
} from '../model-utils';
import { useAllPaths } from '@hooks/all-paths';

/**
 * Keeps the @pierre/trees model in sync when `allPaths` refetches (such as
 * when `useAllPathsInvalidation` detects file-watcher changes on disk).
 * Changes are applied as an incremental add/remove batch — the watcher events
 * (`usePierreTreeEvents`) usually already mutated the model by the time the
 * refetch lands, so most syncs are no-ops. Renames are never inferred here;
 * they arrive as `move` operations through the watcher events.
 */
export function useSyncAllPaths({
  model,
  initialPaths,
  preparedInput,
}: {
  model: PierreFileTree;
  /** The exact list (by reference) the model was constructed from. */
  initialPaths: readonly string[];
  preparedInput: FileTreePreparedInput;
}): void {
  const allPaths = useAllPaths().data;
  const lastSyncedPathsRef = useRef<readonly string[]>(initialPaths);

  // Keep the stored row order accurate across watcher batches, drag moves,
  // and renames so scroll-into-view works between refetches.
  useEffect(() => {
    initializeSortedTreePaths(model, preparedInput.paths);
    return model.onMutation('*', (event) =>
      applySortedTreePathMutation(model, event)
    );
  }, [model, preparedInput]);

  useEffect(() => {
    // The ref is seeded with the construction list, so a content-identical
    // refetch (react-query structural sharing returns the same reference)
    // needs no work — even when the tree mounts long after the model was
    // built (the sidebar can be CSS-hidden).
    if (!allPaths || lastSyncedPathsRef.current === allPaths) return;
    const previousPaths = lastSyncedPathsRef.current;
    lastSyncedPathsRef.current = allPaths;

    // The prepared input's paths are in the tree's final row order — the
    // scroll-into-view helper needs it to map a path to a row index.
    const preparedNext = prepareFileTreeInput(allPaths);
    setSortedTreePaths(model, preparedNext.paths);

    const previous = new Set(previousPaths);
    const next = new Set(allPaths);
    // Skip paths the watcher events already applied — add/remove throw on
    // duplicate/unknown paths.
    const added = allPaths.filter(
      (path) => !previous.has(path) && !model.getItem(path)
    );
    const removedWithChildren = previousPaths.filter(
      (path) => !next.has(path) && model.getItem(path) !== null
    );
    // A recursive folder remove takes its children with it, so drop child
    // paths whose ancestor folder is also being removed.
    const removedFolders = removedWithChildren.filter((path) =>
      path.endsWith('/')
    );
    const removed = removedWithChildren.filter(
      (path) =>
        !removedFolders.some(
          (folder) => folder !== path && path.startsWith(folder)
        )
    );
    if (added.length === 0 && removed.length === 0) return;

    // A vault-sized diff (e.g. a project switch) is cheaper as a coarse
    // reset. resetPaths re-maps selection and focus itself, so no manual
    // restore is needed.
    if (added.length + removed.length > allPaths.length / 2) {
      const expandedDirectories = allPaths.filter((path) => {
        if (!path.endsWith('/')) return false;
        const item = model.getItem(path);
        return item !== null && isDirectoryHandle(item) && item.isExpanded();
      });
      model.resetPaths(allPaths, {
        preparedInput: preparedNext,
        initialExpandedPaths: expandedDirectories,
      });
      return;
    }

    const operations: FileTreeBatchOperation[] = [
      ...removed.map((path) => ({
        type: 'remove' as const,
        path,
        recursive: path.endsWith('/'),
      })),
      ...added.map((path) => ({ type: 'add' as const, path })),
    ];
    model.batch(operations);
  }, [model, allPaths]);
}
