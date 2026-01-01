import { motion } from 'motion/react';
import { useAtom } from 'jotai/react';
import { getDefaultButtonVariants } from '../../animations.ts';
import { noteSortAtom } from '../../atoms.ts';
import { MotionButton } from '../../components/buttons/index.tsx';
import { SortButton } from '../../components/buttons/sort.tsx';
import { PaginatedVirtualizedList } from '../../components/virtualized-list/paginated-virtualized-list.tsx';
import { FileRefresh } from '../../icons/file-refresh.tsx';
import { Loader } from '../../icons/loader.tsx';
import { Note } from '../../icons/page.tsx';
import { NoteSidebarButton } from './sidebar-button/index.tsx';
import { LocalFilePath } from '../../utils/path.ts';
import { useNotesInPage } from '../../hooks/notes.tsx';

export function MyNotesSidebar({
  curFolder,
  curNote,
  curNoteExtension,
  anchorPageIndex,
  anchorPageLoading,
  layoutId,
}: {
  curFolder: string;
  curNote: string | undefined;
  curNoteExtension: string | undefined;
  anchorPageIndex: number;
  anchorPageLoading: boolean;
  layoutId: string;
}) {
  const {
    data: paginatedData,
    refetch,
    isError,
    isLoading,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
  } = useNotesInPage(curFolder, anchorPageIndex, anchorPageLoading);

  const notes = paginatedData?.pages.flatMap((page) => page.notes);
  const totalCount = paginatedData?.pages[0]?.totalCount ?? 0;

  // Calculate firstItemIndex from the minimum page's initialItemIndex
  // This tells react-virtuoso how many items exist before the first rendered item
  const firstItemIndex =
    paginatedData?.pages && paginatedData.pages.length > 0
      ? Math.min(...paginatedData.pages.map((page) => page.initialItemIndex))
      : 0;

  // Auto navigate to the first note when the notes are loaded
  // useEffect(() => {
  //   if (isLoading) return;
  //   if (!notes || notes.length === 0) {
  //     // If there are no notes, navigate to the folder
  //     navigate(routeBuilders.folder(curFolder), { replace: true });
  //     return;
  //   }

  //   const filePathForFirstNote = notes[0];
  //   const isCurrentNoteInNoteQueryResult = notes.some(
  //     (filePath) => filePath.noteWithoutExtension === curNote
  //   );

  //   // If you are on a folder with no note selected, navigate to the first note
  //   if (!curNote) {
  //     navigate(filePathForFirstNote.getLinkToNote(), { replace: true });
  //   }
  //   // If you are on a note that does not exist in the loaded notes, do nothing
  //   // The note might be on a different page that hasn't been loaded yet
  //   else if (!isCurrentNoteInNoteQueryResult) {
  //     // Let RenderNote handle this case - the note may exist but just not be loaded
  //   }
  // }, [notes, curNote, isLoading]);

  // The sidebar note name includes the folder name if it's in a tag sidebar
  const [noteSortData, setNoteSortData] = useAtom(noteSortAtom);
  // Convert curNote string to FilePath
  const activeNotePath =
    curNote && curNoteExtension && notes && notes.length > 0
      ? new LocalFilePath({
          folder: notes[0].folder,
          note: `${curNote}.${curNoteExtension}`,
        })
      : undefined;

  // Calculate the index to scroll to based on the current note
  const currentNoteIndex = notes?.findIndex(
    (filePath) => filePath.noteWithoutExtension === curNote
  );
  const initialTopMostItemIndex =
    currentNoteIndex !== undefined && currentNoteIndex >= 0
      ? currentNoteIndex
      : undefined;

  return (
    <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
      <div className="flex items-center justify-between gap-2 pr-1">
        <p className="flex items-center gap-1.5 py-1 rounded-md pl-1.5 pr-2.5 transition-colors">
          <Note className="min-w-5" />
          My Notes{' '}
          {totalCount > 0 && (
            <span className="tracking-wider">({totalCount})</span>
          )}
        </p>

        <SortButton
          sortDirection={noteSortData}
          setSortDirection={setNoteSortData}
        />
      </div>
      {isError && (
        <div className="text-center text-xs my-3 flex flex-col items-center gap-2 text-balance">
          <p className="text-red-500">
            Something went wrong when retrieving the notes
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
          <PaginatedVirtualizedList<LocalFilePath>
            contentType="note"
            key={layoutId}
            layoutId={layoutId}
            emptyElement={
              anchorPageLoading ? (
                <div></div>
              ) : (
                <li className="text-center px-2 list-none text-zinc-500 dark:text-zinc-300 text-xs">
                  Create a note using the &quot;Create Note&quot; button above
                </li>
              )
            }
            data={notes ?? []}
            dataItemToString={(filePath) => filePath.note}
            dataItemToKey={(filePath) => filePath.toString()}
            isItemActive={(filePath) =>
              activeNotePath ? filePath.equals(activeNotePath) : false
            }
            selectionOptions={{
              dataItemToSelectionRangeEntry: (filePath) => filePath.note,
            }}
            renderItem={({ dataItem: sidebarNotePath, i }) => (
              <NoteSidebarButton
                sidebarNotePath={sidebarNotePath}
                activeNotePath={activeNotePath}
                sidebarNoteIndex={i}
              />
            )}
            totalCount={totalCount}
            initialTopMostItemIndex={initialTopMostItemIndex}
            firstItemIndex={firstItemIndex}
            endReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            startReached={() => {
              if (hasPreviousPage && !isFetchingPreviousPage) {
                fetchPreviousPage();
              }
            }}
          />
        ))}
    </div>
  );
}
