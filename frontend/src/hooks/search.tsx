import {
  type InfiniteData,
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { navigate } from 'wouter/use-browser-location';
import {
  FullTextSearch,
  GetAllSavedSearches,
  AddSavedSearch,
  RemoveSavedSearch,
  RegenerateSearchIndex,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/searchservice';
import {
  type FullTextSearchPage,
  HighlightResult,
} from '../../bindings/github.com/etesam913/bytebook/internal/search/models';
import { useWailsEvent } from '../hooks/events';
import {
  SAVED_SEARCH_UPDATE,
  FILE_DELETE,
  FILE_RENAME,
  FOLDER_DELETE,
  FOLDER_RENAME,
} from '../utils/events';
import { useEffect, useRef } from 'react';
import { createFilePath, type FilePath } from '../utils/path';
import { routeUrls } from '../utils/routes';
import { toast } from 'sonner';
import { QueryError } from '../utils/query';

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

export const searchQueries = {
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

const FILE_PICKER_PAGE_SIZE = 15;

/**
 * Hook for the editor `@` file picker. Requests a small page directly from
 * the backend instead of over-fetching and slicing client-side.
 */
export function useFilePickerSearchQuery(searchQuery: string) {
  return useQuery({
    queryKey: ['file-picker-full-text-search', searchQuery],
    queryFn: async () => {
      const page = await FullTextSearch(searchQuery, [], FILE_PICKER_PAGE_SIZE);
      return mapFullTextSearchResults(page.results);
    },
    enabled: searchQuery.trim().length > 0,
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to perform a full-text search query using react-query.
 */
export function useFullTextSearchQuery(searchQuery: string) {
  const query = useInfiniteQuery({
    queryKey: searchQueries.fullTextSearchKey(searchQuery),
    initialPageParam: undefined as string[] | undefined,
    queryFn: ({ pageParam }) =>
      FullTextSearch(searchQuery, pageParam ?? [], null),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextSearchAfter : undefined,
    placeholderData: keepPreviousData,
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
      if (
        event.key === '/' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement
        ) {
          return;
        }

        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
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

/**
 * Updates all cached full-text-search infinite queries by applying an updater
 * to each page's results array. Adjusts `total` on the first page to reflect
 * the number of removed results.
 */
function updateSearchCache(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (
    result: FullTextSearchPage['results'][number]
  ) => FullTextSearchPage['results'][number] | null
) {
  queryClient.setQueriesData<InfiniteData<FullTextSearchPage>>(
    { queryKey: ['full-text-search'] },
    (oldData) => {
      if (!oldData) return oldData;

      let totalRemoved = 0;
      const nextPages = oldData.pages.map((page) => {
        const nextResults: FullTextSearchPage['results'] = [];
        for (const result of page.results) {
          const updated = updater(result);
          if (updated === null) {
            totalRemoved++;
          } else {
            nextResults.push(updated);
          }
        }
        if (
          nextResults.length === page.results.length &&
          nextResults.every((r, i) => r === page.results[i])
        ) {
          return page;
        }
        return { ...page, results: nextResults };
      });

      // Adjust total on the first page
      if (totalRemoved > 0 && nextPages.length > 0) {
        const firstPage = nextPages[0];
        nextPages[0] = {
          ...firstPage,
          total: Math.max(0, firstPage.total - totalRemoved),
        };
      }

      if (nextPages.every((p, i) => p === oldData.pages[i])) {
        return oldData;
      }

      return { ...oldData, pages: nextPages };
    }
  );
}

/** Returns the full note path for a raw search result. */
function searchResultPath(result: FullTextSearchPage['results'][number]) {
  return `${result.folder}/${result.name}`;
}

/**
 * Keeps cached saved-search results in sync with file-system events.
 *
 * - **Deletes** (note + folder): removes matching entries from the cache.
 * - **Renames** (note + folder): updates folder/note fields in the cache.
 *   If the currently viewed note was renamed, navigates to its new URL.
 */
export function useSavedSearchSyncEvents({
  searchQuery,
  activeNotePath,
}: {
  searchQuery: string;
  activeNotePath: FilePath | undefined;
}) {
  const queryClient = useQueryClient();

  // --- Deletes ---

  useWailsEvent(FILE_DELETE, (body) => {
    const rawData = body.data as Array<{ notePath: string }>;
    const deletedPaths = new Set(rawData.map((item) => item.notePath));
    updateSearchCache(queryClient, (result) =>
      deletedPaths.has(searchResultPath(result)) ? null : result
    );
  });

  useWailsEvent(FOLDER_DELETE, (body) => {
    const rawData = body.data as Array<{ folderPath: string }>;
    const deletedFolders = rawData.map((item) => item.folderPath);
    updateSearchCache(queryClient, (result) => {
      const path = searchResultPath(result);
      for (const folder of deletedFolders) {
        if (path === folder || path.startsWith(`${folder}/`)) {
          return null;
        }
      }
      return result;
    });
  });

  // --- Renames ---

  useWailsEvent(FILE_RENAME, (body) => {
    const rawData = body.data as Array<{
      oldNotePath: string;
      newNotePath: string;
    }>;
    const renameMap = new Map(
      rawData.map((item) => [item.oldNotePath, item.newNotePath])
    );

    updateSearchCache(queryClient, (result) => {
      const path = searchResultPath(result);
      const newPath = renameMap.get(path);
      if (!newPath) return result;
      const newFilePath = createFilePath(newPath);
      if (!newFilePath) return result;
      return { ...result, folder: newFilePath.folder, name: newFilePath.note };
    });

    // Navigate if the active note was renamed
    if (activeNotePath) {
      const newPath = renameMap.get(activeNotePath.fullPath);
      if (newPath) {
        const newFilePath = createFilePath(newPath);
        if (newFilePath) {
          navigate(routeUrls.savedSearch(searchQuery, newFilePath.encodedPath));
        }
      }
    }
  });

  useWailsEvent(FOLDER_RENAME, (body) => {
    const rawData = body.data as Array<{
      oldFolderPath: string;
      newFolderPath: string;
    }>;

    updateSearchCache(queryClient, (result) => {
      const path = searchResultPath(result);
      for (const { oldFolderPath, newFolderPath } of rawData) {
        if (
          path.startsWith(`${oldFolderPath}/`) ||
          result.folder === oldFolderPath
        ) {
          const newFolder = result.folder.replace(oldFolderPath, newFolderPath);
          return { ...result, folder: newFolder };
        }
      }
      return result;
    });

    // Navigate if the active note's folder was renamed
    if (activeNotePath) {
      for (const { oldFolderPath, newFolderPath } of rawData) {
        if (activeNotePath.folder.startsWith(oldFolderPath)) {
          const newFolder = activeNotePath.folder.replace(
            oldFolderPath,
            newFolderPath
          );
          const newFilePath = createFilePath(
            `${newFolder}/${activeNotePath.note}`
          );
          if (newFilePath) {
            navigate(
              routeUrls.savedSearch(searchQuery, newFilePath.encodedPath)
            );
          }
          break;
        }
      }
    }
  });
}
