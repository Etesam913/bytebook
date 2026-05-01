import {
  type MotionValue,
  motion,
  useMotionTemplate,
  useMotionValue,
} from 'motion/react';
import { useEffect, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Spacer } from '../../components/file-sidebar/spacer.tsx';
import { ArrowRotateAnticlockwise } from '../../icons/arrow-rotate-anticlockwise';
import { FileBan } from '../../icons/file-ban';
import { FileRefresh } from '../../icons/file-refresh.tsx';
import { Loader } from '../../icons/loader.tsx';
import { Magnifier } from '../../icons/magnifier.tsx';
import { TriangleWarning } from '../../icons/triangle-warning';
import { NoteSidebarButton } from '../notes-sidebar/sidebar-button/index.tsx';
import { NoteRenderer } from '../../components/note-renderer';
import { VirtualizedList } from '../../components/virtualized/virtualized-list/index.tsx';
import {
  searchQueries,
  useFullTextSearchQuery,
  useRegenerateSearchIndexMutation,
  useSavedSearchSyncEvents,
} from '../../hooks/search.tsx';
import { useNoteExists } from '../../hooks/notes';
import { createFilePath, type FilePath } from '../../utils/path.ts';
import { isNoteMaximizedAtom } from '../../atoms.ts';
import { useAtomValue } from 'jotai';
import { Tooltip } from '../../components/tooltip/index.tsx';
import { ErrorText } from '../../components/error-text/index.tsx';
import { RouteFallback } from '../../components/route-fallback';
import { MotionButton, MotionIconButton } from '../../components/buttons';
import { getDefaultButtonVariants } from '../../animations';
import { routeUrls } from '../../utils/routes';
import { navigate } from 'wouter/use-browser-location';
import { SearchContent2 } from '../../icons/search-content-2.tsx';
import { cn } from '../../utils/string-formatting.ts';
import { useQueryClient } from '@tanstack/react-query';

function NoteRenderErrorFallback({
  error,
  errorInfo,
  resetErrorBoundary,
  filePath,
}: {
  error: unknown;
  errorInfo?: { componentStack: string };
  resetErrorBoundary: (...args: unknown[]) => void;
  filePath: FilePath;
}) {
  const normalizedError =
    error instanceof Error ? error : new Error(String(error));

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-6 mx-auto">
      <div className="flex flex-col items-center gap-3">
        <TriangleWarning className="w-12 h-12 text-amber-500" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-balance text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
            Failed to render note: <b>{filePath.fullPath}</b>. This might be due
            to a temporary issue or corrupted content.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <MotionButton
          {...getDefaultButtonVariants()}
          onClick={resetErrorBoundary}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-md max-w-xs mx-auto justify-center"
        >
          <ArrowRotateAnticlockwise className="w-4 h-4" />
          Try Again
        </MotionButton>

        <details className="text-center max-w-md mx-auto">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 list-none">
            Error Details
          </summary>
          <div className="mt-2 h-96 w-full bg-zinc-100 dark:bg-zinc-800 rounded p-3 overflow-auto">
            <div className="text-xs text-left space-y-2 select-text">
              <div>
                <strong>Error Message:</strong>
                <pre className="whitespace-pre-wrap mt-1">
                  {normalizedError.message}
                </pre>
              </div>
              {normalizedError.stack && (
                <div>
                  <strong>Stack Trace:</strong>
                  <pre className="whitespace-pre-wrap mt-1 text-xs opacity-75">
                    {normalizedError.stack}
                  </pre>
                </div>
              )}
              {errorInfo?.componentStack && (
                <div>
                  <strong>Component Stack:</strong>
                  <pre className="whitespace-pre-wrap mt-1 text-xs opacity-75">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

function MissingSavedSearchNoteFallback({
  filePath,
  isRegeneratingSearchIndex,
  onRegenerateSearchIndex,
}: {
  filePath: FilePath;
  isRegeneratingSearchIndex: boolean;
  onRegenerateSearchIndex: () => void;
}) {
  return (
    <div className="flex h-full min-w-0 flex-1">
      <div className="h-full w-full flex flex-col items-center justify-center gap-5 text-center p-6 mx-auto">
        <div className="flex flex-col items-center gap-3">
          <FileBan width="3rem" height="3rem" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Note not found</h2>
            <p className="text-balance text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
              The note <b> {filePath.fullPath}</b> no longer exists. The saved
              search index may be out of date, so regenerating it can refresh
              these results and remove stale entries.
            </p>
          </div>
        </div>

        <MotionButton
          className={cn(
            'text-center w-44',
            isRegeneratingSearchIndex && 'flex items-center justify-center'
          )}
          {...getDefaultButtonVariants()}
          isDisabled={isRegeneratingSearchIndex}
          onClick={onRegenerateSearchIndex}
        >
          {isRegeneratingSearchIndex ? (
            <Loader width="1.4375rem" height="1.4375rem" />
          ) : (
            <>
              <SearchContent2 width="1.25rem" height="1.25rem" />
              Regenerate Index
            </>
          )}
        </MotionButton>
      </div>
    </div>
  );
}

function SavedSearchNoteContent({
  filePath,
  isRegeneratingSearchIndex,
  onRegenerateSearchIndex,
}: {
  filePath: FilePath;
  isRegeneratingSearchIndex: boolean;
  onRegenerateSearchIndex: () => void;
}) {
  const { data: noteExists, isLoading, error } = useNoteExists(filePath);

  if (isLoading) {
    return (
      <div className="flex h-full min-w-0 flex-1">
        <RouteFallback
          height="2.625rem"
          width="2.625rem"
          className="mx-auto my-auto"
        />
      </div>
    );
  }

  if (!noteExists || error) {
    return (
      <MissingSavedSearchNoteFallback
        filePath={filePath}
        isRegeneratingSearchIndex={isRegeneratingSearchIndex}
        onRegenerateSearchIndex={onRegenerateSearchIndex}
      />
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-1">
      <NoteRenderer filePath={filePath} />
    </div>
  );
}

export function SavedSearchPage({
  searchQuery,
  width,
  curPath,
}: {
  searchQuery: string;
  width?: MotionValue<number>;
  curPath?: string;
}) {
  const queryClient = useQueryClient();
  const {
    data: results = [],
    totalCount,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isError,
    isLoading,
  } = useFullTextSearchQuery(searchQuery);
  const {
    mutate: regenerateSearchIndex,
    isPending: isRegeneratingSearchIndex,
  } = useRegenerateSearchIndexMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: searchQueries.fullTextSearchKey(searchQuery),
        exact: true,
      });
    },
  });

  const searchResultPaths = results.map((result) => result.filePath);

  const sidebarRef = useRef<HTMLElement>(null);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const fallbackWidth = useMotionValue(0);
  const scaledSidebarWidth = useMotionTemplate`calc(${width ?? fallbackWidth}px * var(--ui-scale))`;

  // Convert wildcard route path to a FilePath.
  const activeNotePath = curPath
    ? (createFilePath(curPath) ?? undefined)
    : undefined;

  useSavedSearchSyncEvents({ searchQuery, activeNotePath });

  useEffect(() => {
    if (searchResultPaths.length === 0) {
      return;
    }

    const hasActiveSearchResult =
      activeNotePath &&
      searchResultPaths.some((filePath) => filePath.equals(activeNotePath));

    if (hasActiveSearchResult) {
      return;
    }

    const firstSearchResultPath = searchResultPaths[0];
    navigate(
      routeUrls.savedSearch(searchQuery, firstSearchResultPath.encodedPath)
    );
  }, [activeNotePath, searchQuery, searchResultPaths]);

  return (
    <div className="flex h-full min-w-0">
      {!isNoteMaximized && (
        <motion.aside
          ref={sidebarRef}
          style={width ? { width: scaledSidebarWidth } : undefined}
          className="text-md flex h-full flex-col pb-3.5 shrink-0"
        >
          <div className="flex h-full flex-col overflow-y-auto relative">
            <header className="pl-1.5 pr-2.5">
              <section className="flex items-center py-3.5 gap-2">
                <Magnifier width="1rem" height="1rem" className="min-w-4" />
                <Tooltip
                  content={<span className="font-mono">{searchQuery}</span>}
                >
                  <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                    Search:{' '}
                    <span className="font-mono text-sm">{searchQuery}</span>
                  </p>
                </Tooltip>
              </section>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {totalCount > 0 && <span>{totalCount} results</span>}
                  {totalCount === 0 && !isLoading && !isError && (
                    <span>No results found</span>
                  )}
                </p>
                <Tooltip content="Refresh query results">
                  <MotionIconButton
                    {...getDefaultButtonVariants()}
                    onClick={() => void refetch()}
                  >
                    <ArrowRotateAnticlockwise
                      width="0.875rem"
                      height="0.875rem"
                    />
                  </MotionIconButton>
                </Tooltip>
              </div>
            </header>

            <section className="flex flex-col gap-2 overflow-y-auto flex-1">
              <div className="flex h-full flex-col overflow-y-auto">
                {isError && (
                  <ErrorText
                    message="Something went wrong when retrieving the search results"
                    onRetry={() => void refetch()}
                    icon={
                      <FileRefresh
                        className="will-change-transform"
                        width="1rem"
                        height="1rem"
                      />
                    }
                    className="text-center px-4"
                  />
                )}

                {!isError &&
                  (isLoading ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.35 }}
                    >
                      <Loader
                        width="1.25rem"
                        height="1.25rem"
                        className="mx-auto my-3"
                      />
                    </motion.div>
                  ) : (
                    <VirtualizedList<FilePath>
                      contentType="note"
                      key="saved-search-sidebar"
                      layoutId="saved-search-sidebar"
                      emptyElement={
                        <li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
                          No results found for &quot;{searchQuery}&quot;
                        </li>
                      }
                      data={searchResultPaths}
                      dataItemToString={(filePath) =>
                        filePath.noteWithoutExtension
                      }
                      dataItemToKey={(filePath) => filePath.fullPath}
                      isItemActive={(filePath) =>
                        activeNotePath ? filePath.equals(activeNotePath) : false
                      }
                      selectionOptions={{
                        dataItemToSelectionRangeEntry: (filePath) =>
                          filePath.note,
                      }}
                      renderItem={({ dataItem: sidebarNotePath }) => (
                        <NoteSidebarButton
                          searchQuery={searchQuery}
                          sidebarNotePath={sidebarNotePath}
                          activeNotePath={activeNotePath}
                        />
                      )}
                      endReached={() => {
                        if (!hasNextPage || isFetchingNextPage) return;
                        void fetchNextPage();
                      }}
                    />
                  ))}
              </div>
            </section>
          </div>
        </motion.aside>
      )}
      {width && <Spacer width={width} />}
      {activeNotePath && (
        <ErrorBoundary
          key={activeNotePath.fullPath}
          FallbackComponent={(fallbackProps) => (
            <NoteRenderErrorFallback
              {...fallbackProps}
              filePath={activeNotePath}
            />
          )}
        >
          <SavedSearchNoteContent
            filePath={activeNotePath}
            isRegeneratingSearchIndex={isRegeneratingSearchIndex}
            onRegenerateSearchIndex={() => {
              regenerateSearchIndex();
            }}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
