import type { FileTree as FileTreeModel } from '@pierre/trees';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useWailsEvent } from '@hooks/events';
import { useTreeFilterPathsQuery } from '@hooks/search';
import {
  FILE_CREATE,
  FILE_DELETE,
  FILE_RENAME,
  FOLDER_CREATE,
  FOLDER_DELETE,
  FOLDER_RENAME,
} from '@utils/events';
import { queryKeys } from '@utils/query-keys';
import { queryHasFilterSyntax } from '@utils/search';

const FILTER_DEBOUNCE_MS = 250;

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Routes the tree search bar's query: plain text stays on Pierre's local
 * substring matcher, while queries containing search filter syntax (#tag, f:,
 * type:, …) are resolved by the backend into a path list for an ephemeral
 * filtered tree.
 */
export function useTreeFilter(model: FileTreeModel) {
  const [searchValue, setSearchValue] = useState('');
  // The model emits synchronously, before React re-renders, so the restore
  // guard below must read the query from a ref (state would be stale).
  const searchValueRef = useRef('');
  const isFilterMode = queryHasFilterSyntax(searchValue);

  useEffect(() => {
    return model.subscribe(() => {
      // The tree closes search on row click / Enter / Escape; restore a live
      // plain-text query. Filter-mode queries never live in the model.
      const value = searchValueRef.current;
      if (value && !queryHasFilterSyntax(value) && !model.getSearchValue()) {
        model.setSearch(value);
      }
    });
  }, [model]);

  function onSearchChange(value: string) {
    searchValueRef.current = value;
    setSearchValue(value);
    // Plain text → Pierre's local substring matcher; filter syntax → backend
    // (clear any lingering substring highlight on the hidden main tree).
    model.setSearch(queryHasFilterSyntax(value) ? null : value || null);
  }

  const debouncedValue = useDebouncedValue(searchValue, FILTER_DEBOUNCE_MS);
  const pathsQuery = useTreeFilterPathsQuery({
    searchQuery: debouncedValue,
    enabled: isFilterMode && queryHasFilterSyntax(debouncedValue),
  });

  // The bleve index updates asynchronously after disk events, so a refetch can
  // race a stale index — eventual consistency is fine (later events converge).
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.treeFilterPathsAll(),
    });
  };
  useWailsEvent(FOLDER_CREATE, invalidate);
  useWailsEvent(FILE_CREATE, invalidate);
  useWailsEvent(FOLDER_DELETE, invalidate);
  useWailsEvent(FILE_DELETE, invalidate);
  useWailsEvent(FOLDER_RENAME, invalidate);
  useWailsEvent(FILE_RENAME, invalidate);

  return {
    searchValue,
    onSearchChange,
    isFilterMode,
    filteredPaths: pathsQuery.data,
    isFilterLoading: pathsQuery.isPending,
  };
}
