import { type MotionValue, motion } from 'motion/react';
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
import { useFullTextSearchQuery } from '../../hooks/search.tsx';
import { useNoteExists } from '../../hooks/notes';
import { createFilePath, type FilePath } from '../../utils/path.ts';
import { isNoteMaximizedAtom } from '../../atoms.ts';
import { useAtomValue } from 'jotai';
import { Tooltip } from '../../components/tooltip/index.tsx';
import { ErrorText } from '../../components/error-text/index.tsx';
import { RouteFallback } from '../../components/route-fallback';
import { MotionButton } from '../../components/buttons';
import { getDefaultButtonVariants } from '../../animations';
import { routeUrls } from '../../utils/routes';
import { navigate } from 'wouter/use-browser-location';

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
    <div className="h-screen flex flex-col items-center justify-center gap-4 text-center p-6 mx-auto">
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

function SavedSearchNoteContent({ filePath }: { filePath: FilePath }) {
  const { data: noteExists, isLoading, error } = useNoteExists(filePath);

  if (isLoading) {
    return (
      <div className="flex h-full min-w-0 flex-1">
        <RouteFallback height={42} width={42} className="mx-auto my-auto" />
      </div>
    );
  }

  if (!noteExists || error) {
    return (
      <div className="flex h-full min-w-0 flex-1">
        <div className="h-full w-full flex flex-col items-center justify-center gap-4 text-center p-6 mx-auto">
          <div className="flex flex-col items-center gap-3">
            <FileBan width={48} height={48} />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Note not found</h2>
              <p className="text-balance text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
                The note <b>{filePath.fullPath}</b> does not exist or could not
                be loaded.
              </p>
            </div>
          </div>
        </div>
      </div>
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
  const {
    data: results = [],
    refetch,
    isError,
    isLoading,
  } = useFullTextSearchQuery(searchQuery);

  const resultCount = results.length;
  const searchResultPaths = results.map((result) => result.filePath);

  const sidebarRef = useRef<HTMLElement>(null);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);

  // Convert wildcard route path to a FilePath.
  const activeNotePath = curPath
    ? (createFilePath(curPath) ?? undefined)
    : undefined;

  useEffect(() => {
    if (searchResultPaths.length === 0) {
      return;
    }

    const firstSearchResultPath = searchResultPaths[0];
    navigate(
      routeUrls.savedSearch(searchQuery, firstSearchResultPath.encodedPath)
    );
  }, [searchResultPaths]);

  return (
    <div className="flex h-full min-w-0">
      {!isNoteMaximized && (
        <motion.aside
          ref={sidebarRef}
          style={width ? { width } : undefined}
          className="text-md flex h-screen flex-col pb-3.5 shrink-0"
        >
          <div className="flex h-full flex-col overflow-y-auto relative">
            <header className="pl-1.5 pr-2.5">
              <section className="flex items-center py-3.5 gap-2">
                <Magnifier width={16} height={16} className="min-w-[16px]" />
                <Tooltip
                  content={<span className="font-code">{searchQuery}</span>}
                >
                  <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                    Search:{' '}
                    <span className="font-code text-sm">{searchQuery}</span>
                  </p>
                </Tooltip>
              </section>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {resultCount > 0 && <span>{resultCount} results</span>}
                  {resultCount === 0 && !isLoading && !isError && (
                    <span>No results found</span>
                  )}
                </p>
              </div>
            </header>

            <section className="flex flex-col gap-2 overflow-y-auto flex-1">
              <div className="flex h-full flex-col overflow-y-auto">
                {isError && (
                  <ErrorText
                    message="Something went wrong when retrieving the search results"
                    onRetry={() => refetch()}
                    icon={
                      <FileRefresh
                        className="will-change-transform"
                        width={16}
                        height={16}
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
                      <Loader width={20} height={20} className="mx-auto my-3" />
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
          <SavedSearchNoteContent filePath={activeNotePath} />
        </ErrorBoundary>
      )}
    </div>
  );
}
