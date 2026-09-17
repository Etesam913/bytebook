import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  FullTextSearch,
  GetPathsFromSearchQuery,
  GetAllSavedSearches,
  AddSavedSearch,
  RemoveSavedSearch,
  RegenerateSearchIndex,
} from '@bindings/services/searchservice';
import { HighlightResult } from '@bindings/search/models';
import { useWailsEvent } from '@hooks/events';
import {
  SAVED_SEARCH_UPDATE,
  FILE_CREATE,
  FILE_DELETE,
  FILE_WRITE,
  FILE_RENAME,
  FOLDER_CREATE,
  FOLDER_DELETE,
  FOLDER_RENAME,
  TAGS_INDEX_UPDATE,
} from '@utils/events';
import { useDebouncedValue } from '@hooks/general';
import { createFilePath, type FilePath } from '@utils/path';
import { toast } from 'sonner';
import { QueryError, getBackendResponseData } from '@utils/query';
import { queryKeys } from '@utils/query-keys';

export type NoteSearchResult = {
  type: 'note';
  /** The path of the note file */
  filePath: FilePath;
  /** List of tags associated with the note */
  tags: string[];
  /** Last updated timestamp (ISO string) */
  lastUpdated: string;
  /** Creation timestamp (ISO string) */
  created: string;
  /** Array of highlight results for this note */
  highlights: HighlightResult[];
  /** Array of code content results for this note */
  codeContent: string[];
};

export type AttachmentSearchResult = {
  type: 'attachment';
  /** The path of the attachment file */
  filePath: FilePath;
  /** List of tags associated with the attachment */
  tags: string[];
};

export type SearchResult = NoteSearchResult | AttachmentSearchResult;

type FullTextSearchPageResponse = NonNullable<
  Awaited<ReturnType<typeof FullTextSearch>>['data']
>;

type RegenerateSearchIndexMutationOptions = {
  onSuccess?: () => void | Promise<void>;
};

function mapFullTextSearchResults(
  data: FullTextSearchPageResponse['results'] | undefined
) {
  if (!data) return [];

  const results: Array<SearchResult> = [];

  data.forEach((result) => {
    if (result.type === 'folder') return;

    const filePath = createFilePath(`${result.folder}/${result.name}`);
    if (!filePath) return;

    if (result.type === 'note') {
      results.push({
        type: 'note',
        filePath,
        tags: result.tags ?? [],
        lastUpdated: result.lastUpdated ?? '',
        created: result.created ?? '',
        highlights: result.highlights ?? [],
        codeContent: result.codeContent ?? [],
      });
    } else if (result.type === 'attachment') {
      results.push({
        type: 'attachment',
        filePath,
        tags: result.tags ?? [],
      });
    }
  });

  return results;
}

const searchQueries = {
  files: (query: string, limit: number) =>
    queryOptions({
      queryKey: queryKeys.fileSearch(query, limit),
      queryFn: async () => {
        const response = await FullTextSearch(query, [], limit);
        if (!response.success || !response.data)
          throw new QueryError(response.message);
        return {
          results: mapFullTextSearchResults(response.data.results),
          hasMore: response.data.hasMore,
        };
      },
      retry: false,
      staleTime: 0,
      gcTime: 60_000,
      refetchOnWindowFocus: false,
    }),
  savedSearches: () =>
    queryOptions({
      queryKey: queryKeys.savedSearches(),
      queryFn: () => getBackendResponseData(GetAllSavedSearches()),
      retry: false,
    }),
};

// Path-only backend search powering the file tree's filter mode.
// keepPreviousData avoids the tree flashing empty between keystrokes.
export function useTreeFilterPathsQuery({
  searchQuery,
  enabled,
}: {
  searchQuery: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.treeFilterPaths(searchQuery),
    queryFn: async () => {
      // Distinguishes a broken index from a query that matched nothing.
      return (
        (await getBackendResponseData(GetPathsFromSearchQuery(searchQuery))) ??
        []
      );
    },
    enabled,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

// File search is shared by the editor link picker and application Quick Open.
export function useFileSearchQuery({
  query,
  enabled,
  keepPreviousResults = false,
  limit = 15,
}: {
  query: string;
  enabled: boolean;
  keepPreviousResults?: boolean;
  limit?: number;
}) {
  const debouncedQuery = useDebouncedValue(query, 50);
  const hasQuery = query.trim().length > 0;
  const isCurrentQuery = query === debouncedQuery;
  const result = useQuery({
    ...searchQueries.files(debouncedQuery, limit),
    enabled: enabled && hasQuery && isCurrentQuery,
    placeholderData: keepPreviousResults ? keepPreviousData : undefined,
  });
  const queryClient = useQueryClient();
  const invalidate = () => {
    if (enabled)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.fileSearchAll(),
      });
  };
  useWailsEvent(FILE_CREATE, invalidate);
  useWailsEvent(FILE_DELETE, invalidate);
  useWailsEvent(FILE_WRITE, invalidate);
  useWailsEvent(FILE_RENAME, invalidate);
  useWailsEvent(FOLDER_CREATE, invalidate);
  useWailsEvent(FOLDER_DELETE, invalidate);
  useWailsEvent(FOLDER_RENAME, invalidate);
  useWailsEvent(TAGS_INDEX_UPDATE, invalidate);
  return {
    ...result,
    data:
      enabled && hasQuery && (isCurrentQuery || keepPreviousResults)
        ? result.data
        : undefined,
    isError: enabled && hasQuery && isCurrentQuery && result.isError,
    isSearching: enabled && hasQuery && (!isCurrentQuery || result.isFetching),
  };
}

/**
 * Hook to fetch saved searches from saved-searches.json
 */
export function useSavedSearchesQuery() {
  return useQuery(searchQueries.savedSearches());
}

/**
 * Hook to save a search query to saved-searches.json
 */
export function useSaveSearchMutation() {
  return useMutation({
    mutationFn: async ({
      searchQuery,
      name,
    }: {
      searchQuery: string;
      name: string;
    }) => {
      await getBackendResponseData(AddSavedSearch(name, searchQuery));
    },
  });
}

/**
 * Hook to delete a saved search from saved-searches.json
 */
export function useDeleteSavedSearchMutation() {
  return useMutation({
    mutationFn: ({ name }: { name: string }) =>
      getBackendResponseData(RemoveSavedSearch(name)),
  });
}

/**
 * Hook to listen for saved search updates and invalidate the saved searches query.
 * Listens for 'saved-search:update' Wails events and invalidates the query cache.
 */
export function useSavedSearchUpdates() {
  const queryClient = useQueryClient();

  useWailsEvent(SAVED_SEARCH_UPDATE, () => {
    void queryClient.invalidateQueries({
      queryKey: searchQueries.savedSearches().queryKey,
    });
  });
}

/**
 * Hook to regenerate the search index.
 * Shows success/error toast notifications with a loading spinner.
 */
export function useRegenerateSearchIndexMutation(
  options?: RegenerateSearchIndexMutationOptions
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const resultPromise = (async () => {
        const response = await RegenerateSearchIndex();
        if (!response.success) {
          throw new QueryError(response.message);
        }
        return response;
      })();
      toast.promise(resultPromise, {
        loading: 'Regenerating search index...',
        success: (data) => data.message,
        error: (err) =>
          err instanceof QueryError
            ? err.message
            : 'Failed to regenerate search index',
      });
      return await resultPromise;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tagsAll() });
      await options?.onSuccess?.();
    },
  });
}
