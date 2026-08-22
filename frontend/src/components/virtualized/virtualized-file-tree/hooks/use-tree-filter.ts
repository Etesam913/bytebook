import { useQueryClient } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { treeFilterQueryAtom } from '@/atoms';
import { useWailsEvent } from '@hooks/events';
import { useDebouncedValue } from '@hooks/general';
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

const FILTER_DEBOUNCE_MS = 150;

/**
 * Resolves the tree search bar's query through the backend search index, so
 * every query gets the full filter syntax (#tag, f:, type:, …) plus fuzzy
 * filename and content matching — the same semantics as the search sidebar.
 */
export function useTreeFilter() {
  const [searchValue, setSearchValue] = useAtom(treeFilterQueryAtom);
  const isFilterMode = searchValue.trim().length > 0;

  const debouncedValue = useDebouncedValue(searchValue, FILTER_DEBOUNCE_MS);
  const pathsQuery = useTreeFilterPathsQuery({
    searchQuery: debouncedValue,
    enabled: debouncedValue.trim().length > 0,
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
    onSearchChange: setSearchValue,
    isFilterMode,
    filteredPaths: pathsQuery.data,
    isFilterLoading: pathsQuery.isPending,
  };
}
