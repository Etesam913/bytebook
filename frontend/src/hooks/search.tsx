import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { atom } from 'jotai';
import { navigate } from 'wouter/use-browser-location';
import {
  FullTextSearch,
  SearchFileNamesFromQuery,
  GetAllSavedSearches,
  AddSavedSearch,
  RemoveSavedSearch,
  RegenerateSearchIndex,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/searchservice';
import { useWailsEvent } from '../hooks/events';
import { isEventInCurrentWindow } from '../utils/events';
import { useEffect, useRef } from 'react';
import { LocalFilePath } from '../utils/string-formatting';
import { HighlightResult } from '../../bindings/github.com/etesam913/bytebook/internal/search/models';
import { routeUrls } from '../utils/routes';
import { toast } from 'sonner';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';
import { QueryError } from '../utils/query';

export const lastSearchQueryAtom = atom<string>('');

export type GroupedSearchResults = {
  notes: Array<{
    filePath: LocalFilePath;
    tags: string[];
    lastUpdated: string;
    created: string;
    highlights: HighlightResult[];
  }>;
  attachments: LocalFilePath[];
  folders: string[];
};

export const searchQueries = {
  fullTextSearch: (searchQuery: string) =>
    queryOptions({
      queryKey: ['full-text-search', searchQuery],
      queryFn: () => FullTextSearch(searchQuery),
      select: (data) => {
        if (!data) return { notes: [], attachments: [], folders: [] };

        const notes: Array<{
          filePath: LocalFilePath;
          tags: string[];
          lastUpdated: string;
          created: string;
          highlights: HighlightResult[];
        }> = [];
        const attachments: LocalFilePath[] = [];
        const folders: string[] = [];

        data.forEach((result) => {
          if (result.type === 'note') {
            const filePath = new LocalFilePath({
              folder: result.folder,
              note: result.note,
            });
            notes.push({
              filePath,
              tags: result.tags || [],
              lastUpdated: result.lastUpdated || '',
              created: result.created || '',
              highlights: result.highlights || [],
            });
          } else if (result.type === 'attachment') {
            const filePath = new LocalFilePath({
              folder: result.folder,
              note: result.note,
            });
            attachments.push(filePath);
          } else if (result.type === 'folder') {
            folders.push(result.folder);
          }
        });

        return { notes, attachments, folders };
      },
      placeholderData: keepPreviousData,
    }),
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
    }),
};

/**
 * Hook to handle navigation to the search page.
 * Listens for 'search:open' Wails events.
 * - 'search:open': navigates to the search page or goes back if already there.
 */
export function useSearch() {
  useWailsEvent('search:open', async (data) => {
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
 * Hook to perform a mutation for searching file names from a query string.
 * Uses react-query's useMutation.
 */
export function useSearchMutation() {
  return useMutation({
    mutationFn: async ({ searchQuery }: { searchQuery: string }) => {
      return await SearchFileNamesFromQuery(searchQuery);
    },
    onError: () => {
      return [];
    },
  });
}

/**
 * Hook to perform a full-text search query using react-query.
 */
export function useFullTextSearchQuery(searchQuery: string) {
  return useQuery(searchQueries.fullTextSearch(searchQuery));
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

  useWailsEvent('saved-search:update', () => {
    queryClient.invalidateQueries({
      queryKey: searchQueries.savedSearches().queryKey,
    });
  });
}

/**
 * Hook to regenerate the search index.
 * Shows success/error toast notifications.
 */
export function useRegenerateSearchIndexMutation() {
  return useMutation({
    mutationFn: async () => {
      const response = await RegenerateSearchIndex();
      if (!response.success) {
        throw new QueryError(response.message);
      }
      return response;
    },
    onSuccess: (response) => {
      toast.success(response.message, DEFAULT_SONNER_OPTIONS);
    },
  });
}
