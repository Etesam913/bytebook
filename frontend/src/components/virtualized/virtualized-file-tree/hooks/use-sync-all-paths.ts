import type {
  FileTree as PierreFileTree,
  FileTreePreparedInput,
} from '@pierre/trees';
import { useEffect, useRef } from 'react';
import {
  applySortedTreePathMutation,
  initializeSortedTreePaths,
} from '../model-utils';
import { reconcileTreePaths } from '../reconcile';
import { useAllPaths } from '@hooks/all-paths';

export function useSyncAllPaths({
  model,
  preparedInput,
  isMovePending,
}: {
  model: PierreFileTree;
  preparedInput: FileTreePreparedInput;
  isMovePending: boolean;
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
    reconcileTreePaths(model, allPaths);
    lastSyncedRef.current = { model, paths: allPaths, dataUpdatedAt };
  }, [model, allPaths, dataUpdatedAt, isFetching, isMovePending]);
}
