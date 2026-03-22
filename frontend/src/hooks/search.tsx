import {
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { atom } from 'jotai';
import { navigate } from 'wouter/use-browser-location';
import {
  FullTextSearch,
  GetAllSavedSearches,
  AddSavedSearch,
  RemoveSavedSearch,
  RegenerateSearchIndex,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/searchservice';
import { useWailsEvent } from '../hooks/events';
import {
  isEventInCurrentWindow,
  SEARCH_OPEN,
  SAVED_SEARCH_UPDATE,
} from '../utils/events';
import { useEffect, useRef } from 'react';
import { createFilePath, type FilePath } from '../utils/path';
import { HighlightResult } from '../../bindings/github.com/etesam913/bytebook/internal/search/models';
import { routeUrls } from '../utils/routes';
import { toast } from 'sonner';
import { QueryError } from '../utils/query';

export const lastSearchQueryAtom = atom<string>('');

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

function mapFullTextSearchResults(
  data: FullTextSearchPageResponse['results'] | undefined
) {
  if (!data) return [];

  const results: Array<SearchResult> = [];

  data.forEach((result) => {
    const filePath = createFilePath(`${result.folder}/${result.note}`);
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
  fullTextSearchKey: (searchQuery: string) =>
    ['full-text-search', searchQuery] as const,
  savedSearches: () =>
    queryOptions({
      queryKey: ['saved-searches'],
      queryFn: async () => {
        const response = await GetAllSavedSearches();
        if (!response.success) {
          throw new Error(response.message);
        }
        return response.data;
      },
      retry: false,
    }),
};

/**
 * Hook to handle navigation to the search page.
 * Listens for 'search:open' Wails events.
 * - 'search:open': navigates to the search page or goes back if already there.
 */
export function useSearch() {
  useWailsEvent(SEARCH_OPEN, async (data) => {
    if (!(await isEventInCurrentWindow(data))) return;
    // Check if already on /search, if so, go back
    if (window.location.pathname.startsWith('/search')) {
      window.history.back();
    } else {
      navigate(routeUrls.search());
    }
  });
}

/**
 * Hook to perform a full-text search query using react-query.
 */
export function useFullTextSearchQuery(searchQuery: string) {
  const query = useInfiniteQuery({
    queryKey: searchQueries.fullTextSearchKey(searchQuery),
    initialPageParam: undefined as string[] | undefined,
    queryFn: ({ pageParam }) => FullTextSearch(searchQuery, pageParam ?? []),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextSearchAfter : undefined,
  });

  const data = (query.data?.pages ?? []).flatMap((page) =>
    mapFullTextSearchResults(page.results)
  );

  // total count is stored in each page, so we just use the first page for it
  const totalCount = query.data?.pages[0]?.total ?? 0;

  return {
    ...query,
    data,
    totalCount,
  };
}

/**
 * Hook to provide a ref to an input element and focus it when "/" is pressed.
 * Ignores the shortcut if the event originates from an input or textarea.
 */
export function useSearchFocus() {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only focus if the "/" key is pressed and no modifier keys are held
      if (
        event.key === '/' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        // Don't focus if the event is coming from an input field
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement
        ) {
          return;
        }

        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return inputRef;
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
        throw new Error(response.message);
      }
      return response;
    },
    onSuccess: (_, variables) => {
      navigate(routeUrls.savedSearch(variables.searchQuery));
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
        throw new Error(response.message);
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
    queryClient.invalidateQueries({
      queryKey: searchQueries.savedSearches().queryKey,
    });
  });
}

/**
 * Hook to regenerate the search index.
 * Shows success/error toast notifications with a loading spinner.
 */
export function useRegenerateSearchIndexMutation() {
  return useMutation({
    mutationFn: async () =>
      toast.promise(
        async () => {
          const response = await RegenerateSearchIndex();
          if (!response.success) {
            throw new QueryError(response.message);
          }
          return response;
        },
        {
          loading: 'Regenerating search index...',
          success: (data) => data.message,
          error: (err) =>
            err instanceof QueryError
              ? err.message
              : 'Failed to regenerate search index',
        }
      ),
  });
}
