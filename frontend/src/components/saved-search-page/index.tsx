import { type MotionValue, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { getDefaultButtonVariants } from '../../animations.ts';
import { MotionButton } from '../buttons/index.tsx';
import { Spacer } from '../folder-sidebar/spacer';
import { RenderNoteFallback } from '../error-boundary/render-note.tsx';
import { FileRefresh } from '../../icons/file-refresh.tsx';
import { Loader } from '../../icons/loader.tsx';
import { Magnifier } from '../../icons/magnifier.tsx';
import { NoteSidebarButton } from '../../routes/notes-sidebar/sidebar-button/index.tsx';
import { RenderNote } from '../../routes/notes-sidebar/render-note/index.tsx';
import { Sidebar } from '../sidebar/index.tsx';
import { useFullTextSearchQuery } from '../../hooks/search.tsx';
import { useSearchParamsEntries } from '../../utils/routing.ts';
import { FilePath } from '../../utils/string-formatting.ts';
import { navigate } from 'wouter/use-browser-location';
import { routeBuilders } from '../../utils/routes.ts';

export function SavedSearchPage({
  searchQuery,
  width,
  leftWidth,
  folder,
  note,
}: {
  searchQuery: string;
  width?: MotionValue<number>;
  leftWidth?: MotionValue<number>;
  folder?: string;
  note?: string;
}) {
  const {
    data: searchResults,
    isSuccess,
    refetch,
    isError,
    isLoading,
  } = useFullTextSearchQuery(searchQuery);
  const resultCount = searchResults?.length ?? 0;
  const sidebarRef = useRef<HTMLElement>(null);
  const searchParams: { ext?: string } = useSearchParamsEntries();
  const fileExtension = searchParams?.ext;

  // Auto navigate to the first result
  useEffect(() => {
    if (isSuccess && searchResults?.length > 0) {
      const firstFilePath = searchResults[0].filePath;

      navigate(
        `${routeBuilders.savedSearch(searchQuery)}${firstFilePath.getLinkToNoteWithoutPrefix()}`,
        {
          replace: true,
        }
      );
    }
  }, [isSuccess, searchResults]);

  return (
    <>
      <motion.aside
        ref={sidebarRef}
        style={width ? { width } : undefined}
        className="text-md flex h-screen flex-col pb-3.5"
      >
        <div className="flex h-full flex-col overflow-y-auto relative">
          <header className="pl-1.5 pr-2.5">
            <section className="flex items-center py-3.5 gap-2">
              <Magnifier width={16} height={16} className="min-w-[16px]" />
              <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                Search: {searchQuery}
              </p>
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
                <div className="text-center text-xs my-3 flex flex-col items-center gap-2 text-balance px-4">
                  <p className="text-red-500">
                    Something went wrong when retrieving the search results
                  </p>
                  <MotionButton
                    {...getDefaultButtonVariants({
                      disabled: false,
                      whileHover: 1.025,
                      whileTap: 0.975,
                      whileFocus: 1.025,
                    })}
                    className="mx-2.5 flex text-center"
                    onClick={() => refetch()}
                  >
                    <span>Retry</span>{' '}
                    <FileRefresh
                      className="will-change-transform"
                      width={16}
                      height={16}
                    />
                  </MotionButton>
                </div>
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
                  <Sidebar<FilePath>
                    contentType="note"
                    key="saved-search-sidebar"
                    layoutId="saved-search-sidebar"
                    emptyElement={
                      <li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
                        No results found for &quot;{searchQuery}&quot;
                      </li>
                    }
                    data={searchResults?.map((result) => result.filePath) ?? []}
                    dataItemToString={(filePath) =>
                      filePath.noteWithoutExtension
                    }
                    dataItemToSelectionRangeEntry={(filePath) => {
                      return filePath.note;
                    }}
                    renderLink={({ dataItem: sidebarNotePath, i }) => {
                      return (
                        <NoteSidebarButton
                          sidebarNotePath={sidebarNotePath}
                          activeNoteNameWithoutExtension={note}
                          sidebarNoteIndex={i}
                        />
                      );
                    }}
                  />
                ))}
            </div>
          </section>
        </div>
      </motion.aside>
      {width && leftWidth && (
        <Spacer width={width} leftWidth={leftWidth} spacerConstant={8} />
      )}
      {folder && note && (
        <ErrorBoundary
          key={`${folder}-${note}-${fileExtension}`}
          FallbackComponent={(fallbackProps) => (
            <RenderNoteFallback {...fallbackProps} />
          )}
        >
          <RenderNote />
        </ErrorBoundary>
      )}
    </>
  );
}
