import type {
  FileTree as PierreFileTree,
  FileTreePreparedInput,
} from '@pierre/trees';
import { useEffect, useRef } from 'react';
import {
  applySortedTreePathMutation,
  initializeSortedTreePaths,
} from '../model/model-utils';
import { reconcileTreePaths } from '../model/reconcile';
import { useAllPaths } from '@hooks/all-paths';

export function useSyncAllPaths({
  model,
  preparedInput,
  isMovePending,
  getPendingCreatePaths,
}: {
  model: PierreFileTree;
  preparedInput: FileTreePreparedInput;
  isMovePending: boolean;
  getPendingCreatePaths: () => readonly string[];
}): void {
  const { data: allPaths, dataUpdatedAt, isFetching } = useAllPaths();
  // Remember the last completed sync so StrictMode effect replays during sidebar
  // reorder skip a full tree scan, while fresh query results still reconcile.
  const lastSyncedRef = useRef<{
    model: PierreFileTree;
    paths: readonly string[];
    dataUpdatedAt: number;
  } | null>(null);

  useEffect(() => {
    initializeSortedTreePaths(model, preparedInput.paths);
    return model.onMutation('*', (event) =>
      applySortedTreePathMutation(model, event)
    );
  }, [model, preparedInput]);

  useEffect(() => {
    // Refetches may reuse the same array after an optimistic move changed the model.
    // Wait for the move and its refetch so a stale snapshot cannot undo it early.
    if (!allPaths || isFetching || isMovePending) {
      lastSyncedRef.current = null;
      return;
    }
    // Moving a sidebar panel can replay effects in StrictMode. Reuse the
    // completed sync unless the model or authoritative query snapshot changed.
    const previous = lastSyncedRef.current;
    if (
      previous?.model === model &&
      previous.paths === allPaths &&
      previous.dataUpdatedAt === dataUpdatedAt
    )
      return;
    // A watcher refetch must not discard a draft being typed or awaiting its
    // create response. The create flow owns removal on cancellation/failure.
    const pendingPaths = getPendingCreatePaths().filter(
      (path) => model.getItem(path) !== null && !allPaths.includes(path)
    );
    reconcileTreePaths(
      model,
      pendingPaths.length ? [...allPaths, ...pendingPaths] : allPaths
    );
    lastSyncedRef.current = { model, paths: allPaths, dataUpdatedAt };
  }, [
    model,
    allPaths,
    dataUpdatedAt,
    isFetching,
    isMovePending,
    getPendingCreatePaths,
  ]);
}
