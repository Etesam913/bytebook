import { motion } from 'motion/react';
import { getDefaultButtonVariants } from '../../animations.ts';
import { MotionButton } from '../buttons/index.tsx';
import { FileRefresh } from '../../icons/file-refresh.tsx';
import { Loader } from '../../icons/loader.tsx';
import { Magnifier } from '../../icons/magnifier.tsx';
import { NoteSidebarButton } from '../../routes/notes-sidebar/sidebar-button/index.tsx';
import { Sidebar } from '../sidebar/index.tsx';
import { useFullTextSearchQuery } from '../../hooks/search.tsx';
import { FilePath } from '../../utils/string-formatting.ts';

export function SavedSearchPage({ searchQuery }: { searchQuery: string }) {
  const {
    data: searchResults,
    refetch,
    isError,
    isLoading,
  } = useFullTextSearchQuery(searchQuery);
  const resultCount = searchResults?.length ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
      <div className="flex items-center justify-between gap-2 pr-1">
        <p className="flex items-center gap-1.5 py-1 rounded-md pl-[6px] pr-[10px] transition-colors">
          <Magnifier width={20} height={20} className="min-w-[1.25rem]" />
          Search Results{' '}
          {resultCount > 0 && (
            <span className="tracking-wider">({resultCount})</span>
          )}
        </p>
      </div>

      {isError && (
        <div className="text-center text-xs my-3 flex flex-col items-center gap-2 text-balance">
          <p className="text-red-500">
            Something went wrong when retrieving the search results
          </p>
          <MotionButton
            {...getDefaultButtonVariants(false, 1.025, 0.975, 1.025)}
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
            dataItemToString={(filePath) => filePath.noteWithoutExtension}
            dataItemToSelectionRangeEntry={(filePath) => {
              return filePath.note;
            }}
            renderLink={({ dataItem: sidebarNotePath, i }) => {
              return (
                <NoteSidebarButton
                  sidebarNotePath={sidebarNotePath}
                  activeNoteNameWithoutExtension={undefined}
                  sidebarNoteIndex={i}
                />
              );
            }}
          />
        ))}
    </div>
  );
}
