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
import { SAVED_SEARCH_UPDATE } from '@utils/events';
import { createFilePath, type FilePath } from '@utils/path';
import { toast } from 'sonner';
import { QueryError } from '@utils/query';
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

type FullTextSearchPageResponse = Awaited<ReturnType<typeof FullTextSearch>>;

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
  savedSearches: () =>
    queryOptions({
      queryKey: queryKeys.savedSearches(),
      queryFn: async () => {
        const response = await GetAllSavedSearches();
        if (!response.success) {
          throw new QueryError(response.message);
        }
        return response.data;
      },
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
      const res = await GetPathsFromSearchQuery(searchQuery);
      // Distinguishes a broken index from a query that matched nothing.
      if (!res.success) throw new QueryError(res.message);
      return res.data ?? [];
    },
    enabled,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

const FILE_PICKER_PAGE_SIZE = 15;

/**
 * Hook for the editor `@` file picker. Requests a small page directly from
 * the backend instead of over-fetching and slicing client-side.
 */
export function useFilePickerSearchQuery(searchQuery: string) {
  return useQuery({
    queryKey: queryKeys.filePickerFullTextSearch(searchQuery),
    queryFn: async () => {
      const page = await FullTextSearch(searchQuery, [], FILE_PICKER_PAGE_SIZE);
      return mapFullTextSearchResults(page.results);
    },
    enabled: searchQuery.trim().length > 0,
    placeholderData: keepPreviousData,
  });
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
      const response = await AddSavedSearch(name, searchQuery);
      if (!response.success) {
        throw new QueryError(response.message);
      }
      return response;
    },
  });
}

/**
 * Hook to delete a saved search from saved-searches.json
 */
export function useDeleteSavedSearchMutation() {
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const response = await RemoveSavedSearch(name);
      if (!response.success) {
        throw new QueryError(response.message);
      }
      return response;
    },
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
      await options?.onSuccess?.();
    },
  });
}
