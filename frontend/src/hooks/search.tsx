import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
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
import { useWailsEvent, useWailsEvents } from '@hooks/events';
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
} from '@bindings/util/event-names';
import { useDebouncedValue } from '@hooks/general';
import {
  createFilePath,
  createFolderPath,
  joinPath,
  type FilePath,
  type FolderPath,
} from '@utils/path';
import { toast } from 'sonner';
import {
  QueryError,
  getBackendResponseData,
  requireBackendResponseData,
} from '@utils/query';
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

export type FolderSearchResult = {
  type: 'folder';
  /** The path of the folder */
  folderPath: FolderPath;
};
export type SearchResult =
  | NoteSearchResult
  | AttachmentSearchResult
  | FolderSearchResult;

export type FileSearchResult = Exclude<SearchResult, FolderSearchResult>;

// Shared options for the file-only and folder-inclusive search query overloads.
type FileSearchQueryOptions = {
  query: string;
  enabled: boolean;
  keepPreviousResults?: boolean;
  limit?: number;
  includeFolders?: boolean;
};

type FileSearchQueryResult<T extends SearchResult> = Omit<
  UseQueryResult<{ results: T[]; hasMore: boolean }>,
  'data' | 'isError'
> & {
  data: { results: T[]; hasMore: boolean } | undefined;
  isError: boolean;
  isSearching: boolean;
};

type FullTextSearchPageResponse = NonNullable<
  Awaited<ReturnType<typeof FullTextSearch>>['data']
>;

function mapFullTextSearchResults(
  data: FullTextSearchPageResponse['results'] | undefined
) {
  if (!data) return [];

  const results: Array<SearchResult> = [];

  data.forEach((result) => {
    if (result.type === 'folder') {
      const folderPath = createFolderPath(joinPath(result.folder, result.name));
      if (folderPath) results.push({ type: 'folder', folderPath });
      return;
    }

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
  files: ({
    query,
    limit,
    includeFolders,
  }: {
    query: string;
    limit: number;
    includeFolders: boolean;
  }) =>
    queryOptions({
      queryKey: queryKeys.fileSearch({
        query,
        pageSize: limit,
        includeFolders,
      }),
      queryFn: async () => {
        const data = await requireBackendResponseData(
          FullTextSearch(query, [], limit, includeFolders)
        );
        const results = mapFullTextSearchResults(data.results);
        return {
          results: includeFolders
            ? results
            : results.filter((result) => result.type !== 'folder'),
          hasMore: data.hasMore,
        };
      },
      staleTime: 0,
      gcTime: 60_000,
    }),
  savedSearches: () =>
    queryOptions({
      queryKey: queryKeys.savedSearches(),
      queryFn: () => getBackendResponseData(GetAllSavedSearches()),
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
  });
}

// File search is shared by the editor link picker and application Quick Open.
export function useFileSearchQuery(
  options: Omit<FileSearchQueryOptions, 'includeFolders'> & {
    includeFolders?: false;
  }
): FileSearchQueryResult<FileSearchResult>;
export function useFileSearchQuery(
  options: FileSearchQueryOptions
): FileSearchQueryResult<SearchResult>;
export function useFileSearchQuery({
  query,
  enabled,
  keepPreviousResults = false,
  limit = 15,
  includeFolders = false,
}: FileSearchQueryOptions):
  | FileSearchQueryResult<FileSearchResult>
  | FileSearchQueryResult<SearchResult> {
  const debouncedQuery = useDebouncedValue(query, 20);
  const hasQuery = query.trim().length > 0;
  const isCurrentQuery = query === debouncedQuery;
  const result = useQuery({
    ...searchQueries.files({ query: debouncedQuery, limit, includeFolders }),
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
  useWailsEvents(
    [
      FILE_CREATE,
      FILE_DELETE,
      FILE_WRITE,
      FILE_RENAME,
      FOLDER_CREATE,
      FOLDER_DELETE,
      FOLDER_RENAME,
      TAGS_INDEX_UPDATE,
    ],
    invalidate
  );
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
      queryKey: queryKeys.savedSearches(),
    });
  });
}

/**
 * Hook to regenerate the search index.
 * Shows a loading toast, then a success toast.
 */
export function useRegenerateSearchIndexMutation() {
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
      // Errors toast via the global MutationCache handler
      toast.promise(resultPromise, {
        loading: 'Regenerating search index...',
        success: 'Successfully regenerated search index',
      });
      return await resultPromise;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags() });
    },
  });
}
