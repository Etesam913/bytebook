import type {
  FileTree as PierreFileTree,
  FileTreePreparedInput,
} from '@pierre/trees';
import { useEffect } from 'react';
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

  useEffect(() => {
    initializeSortedTreePaths(model, preparedInput.paths);
    return model.onMutation('*', (event) =>
      applySortedTreePathMutation(model, event)
    );
  }, [model, preparedInput]);

  useEffect(() => {
    // Refetches may reuse the same array after an optimistic move changed the model.
    // Wait for the move and its refetch so a stale snapshot cannot undo it early.
    if (!allPaths || isFetching || isMovePending) return;
    reconcileTreePaths(model, allPaths);
  }, [model, allPaths, dataUpdatedAt, isFetching, isMovePending]);
}
