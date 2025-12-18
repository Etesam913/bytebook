import { type MotionValue, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Spacer } from '../../components/folder-sidebar/spacer.tsx';
import { RenderNoteFallback } from '../../components/error-boundary/render-note.tsx';
import { FileRefresh } from '../../icons/file-refresh.tsx';
import { Loader } from '../../icons/loader.tsx';
import { Magnifier } from '../../icons/magnifier.tsx';
import { NoteSidebarButton } from '../notes-sidebar/sidebar-button/index.tsx';
import { RenderNote } from '../notes-sidebar/render-note/index.tsx';
import { VirtualizedList } from '../../components/sidebar/index.tsx';
import { useFullTextSearchQuery } from '../../hooks/search.tsx';
import { LocalFilePath } from '../../utils/path.ts';
import { navigate } from 'wouter/use-browser-location';
import { routeBuilders } from '../../utils/routes.ts';
import { isNoteMaximizedAtom } from '../../atoms.ts';
import { useAtomValue } from 'jotai';
import { useSearchParamsEntries } from '../../utils/routing.ts';
import { Tooltip } from '../../components/tooltip/index.tsx';
import { ErrorText } from '../../components/error-text/index.tsx';

export function SavedSearchPage({
  searchQuery,
  width,
  leftWidth,
  curFolder,
  curNote,
}: {
  searchQuery: string;
  width?: MotionValue<number>;
  leftWidth?: MotionValue<number>;
  curFolder?: string;
  curNote?: string;
}) {
  const {
    data: groupedResults = { notes: [], attachments: [], folders: [] },
    isSuccess,
    refetch,
    isError,
    isLoading,
  } = useFullTextSearchQuery(searchQuery);

  const resultCount =
    groupedResults.notes.length +
    groupedResults.attachments.length +
    groupedResults.folders.length;

  const searchParams: { ext?: string } = useSearchParamsEntries();
  const curNoteExtension = searchParams?.ext;

  const sidebarRef = useRef<HTMLElement>(null);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);

  // Convert folder and note strings to FilePath
  const activeNotePath =
    curFolder && curNote && curNoteExtension
      ? new LocalFilePath({
          folder: curFolder,
          note: `${curNote}.${curNoteExtension}`,
        })
      : undefined;

  // Auto navigate to the first result
  useEffect(() => {
    if (isSuccess && resultCount > 0) {
      let firstFilePath: LocalFilePath | undefined;
      if (groupedResults.notes.length > 0) {
        firstFilePath = groupedResults.notes[0].filePath;
      } else if (groupedResults.attachments.length > 0) {
        firstFilePath = groupedResults.attachments[0];
      }

      if (firstFilePath) {
        navigate(
          `${routeBuilders.savedSearch(searchQuery)}${firstFilePath.getLinkToNoteWithoutNotesPrefix()}`,
          {
            replace: true,
          }
        );
      }
    }
  }, [isSuccess, resultCount, groupedResults, searchQuery]);

  return (
    <>
      {!isNoteMaximized && (
        <motion.aside
          ref={sidebarRef}
          style={width ? { width } : undefined}
          className="text-md flex h-screen flex-col pb-3.5"
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
                    <VirtualizedList<LocalFilePath>
                      contentType="note"
                      key="saved-search-sidebar"
                      layoutId="saved-search-sidebar"
                      emptyElement={
                        <li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
                          No results found for &quot;{searchQuery}&quot;
                        </li>
                      }
                      data={[
                        ...groupedResults.notes.map((note) => note.filePath),
                        ...groupedResults.attachments,
                      ]}
                      dataItemToString={(filePath) =>
                        filePath.noteWithoutExtension
                      }
                      dataItemToKey={(filePath) => filePath.toString()}
                      selectionOptions={{
                        dataItemToSelectionRangeEntry: (filePath) =>
                          filePath.note,
                      }}
                      renderItem={({ dataItem: sidebarNotePath, i }) => (
                        <NoteSidebarButton
                          sidebarNotePath={sidebarNotePath}
                          activeNotePath={activeNotePath}
                          sidebarNoteIndex={i}
                        />
                      )}
                    />
                  ))}
              </div>
            </section>
          </div>
        </motion.aside>
      )}
      {width && leftWidth && (
        <Spacer width={width} leftWidth={leftWidth} spacerConstant={8} />
      )}
      {curFolder && curNote && curNoteExtension && (
        <ErrorBoundary
          key={`${curFolder}-${curNote}-${curNoteExtension}`}
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
